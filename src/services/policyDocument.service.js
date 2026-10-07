const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const { PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');

const PolicyDocument = require('../models/PolicyDocument');
const InsurancePolicy = require('../models/InsurancePolicy');
const AuditLog = require('../models/AuditLog');
const { getStorageProvider } = require('../providers/storage/azureBlobProvider');
const { POLICY_DOCUMENT_TYPES, POLICY_DOCUMENT_STATUSES, ROLES } = require('../utils/constants');
const { 
  NotFoundError, 
  ValidationError, 
  AuthorizationError, 
  ConflictError 
} = require('../utils/apiError');

/**
 * Validate file magic bytes against supported document signatures
 * Allowed formats: PDF, JPEG, PNG
 */
function detectAndValidateMagicBytes(buffer) {
  if (!buffer || buffer.length < 4) {
    throw new ValidationError('File buffer is empty or corrupted');
  }

  // PDF signature: %PDF (0x25 0x50 0x44 0x46)
  if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
    return 'application/pdf';
  }

  // JPEG signature: 0xFF 0xD8 0xFF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }

  // PNG signature: 0x89 0x50 0x4E 0x47 0x0D 0x0A 0x1A 0x0A
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47 &&
    buffer[4] === 0x0d && buffer[5] === 0x0a && buffer[6] === 0x1a && buffer[7] === 0x0a
  ) {
    return 'image/png';
  }

  throw new ValidationError('Invalid or unsupported file format. Only authentic PDF, JPEG, and PNG files are accepted.');
}

/**
 * Sanitize original filename to prevent directory traversal or reserved character issues
 */
function sanitizeFilename(originalName) {
  const base = path.basename(originalName || 'document');
  return base.replace(/[\/\?<>\\:\*\|":\x00-\x1f\x80-\x9f]/g, '_').trim() || 'document';
}

/**
 * Verify policy belongs to the tenant agency and check agent access
 */
async function verifyPolicyAccess(agencyId, policyId, user) {
  if (!mongoose.Types.ObjectId.isValid(policyId)) {
    throw new NotFoundError('Policy not found');
  }

  const policy = await InsurancePolicy.findOne({
    _id: policyId,
    agencyId,
    isDeleted: { $ne: true }
  });

  if (!policy) {
    throw new NotFoundError('Policy not found in this organization');
  }

  if (user && user.role === ROLES.AGENT) {
    const assignedAgentId = policy.assignedAgentId?._id || policy.assignedAgentId;
    const currentUserId = user.userId || user._id;
    if (assignedAgentId && currentUserId && assignedAgentId.toString() !== currentUserId.toString()) {
      throw new AuthorizationError('You do not have permission to manage documents for this policy');
    }
  }

  return policy;
}

/**
 * 1. Upload or Replace a Policy Document
 */
exports.uploadPolicyDocument = async ({ agencyId, policyId, documentType, file, user }) => {
  if (!agencyId) throw new ValidationError('Agency context is required');
  if (!policyId) throw new ValidationError('Policy ID is required');
  if (!documentType) throw new ValidationError('Document type is required');
  if (!file || !file.buffer) throw new ValidationError('No file provided for upload');

  // Normalize document type
  const normalizedType = String(documentType).trim().toUpperCase();
  const validTypes = Object.values(POLICY_DOCUMENT_TYPES);
  if (!validTypes.includes(normalizedType)) {
    throw new ValidationError(`Invalid document type. Allowed types: ${validTypes.join(', ')}`);
  }

  // 1. Authorize policy & tenant ownership
  const policy = await verifyPolicyAccess(agencyId, policyId, user);

  // 2. Validate file size (configurable, default 15MB)
  const maxMb = parseInt(process.env.MAX_POLICY_DOCUMENT_SIZE_MB, 10) || 15;
  const maxBytes = maxMb * 1024 * 1024;
  if (file.buffer.length > maxBytes) {
    throw new ValidationError(`File size exceeds maximum allowed size of ${maxMb}MB`);
  }

  // 3. Validate magic bytes / file signature
  const detectedMimeType = detectAndValidateMagicBytes(file.buffer);

  // 4. Calculate SHA-256 checksum
  const checksum = crypto.createHash('sha256').update(file.buffer).digest('hex');

  // 5. Deduplication check (Requirement 20)
  const existingCurrent = await PolicyDocument.findOne({
    agencyId,
    policyId: policy._id,
    documentType: normalizedType,
    isCurrent: true,
    isDeleted: false
  });

  if (existingCurrent && existingCurrent.checksum === checksum) {
    throw new ConflictError('This document has already been uploaded for this policy (identical file content).');
  }

  // 6. Determine next version
  const latestDoc = await PolicyDocument.findOne({
    agencyId,
    policyId: policy._id,
    documentType: normalizedType
  }).sort({ version: -1 });

  const nextVersion = latestDoc ? latestDoc.version + 1 : 1;

  // 7. Sanitize filename & generate secure S3 storage key
  const safeOriginalName = sanitizeFilename(file.originalname);
  const ext = (path.extname(safeOriginalName) || (detectedMimeType === 'application/pdf' ? '.pdf' : detectedMimeType === 'image/png' ? '.png' : '.jpg')).toLowerCase();
  const documentId = new mongoose.Types.ObjectId();
  const secureFilename = `${uuidv4()}${ext}`;
  const storageKey = `tenant/${agencyId}/policy/${policyId}/documents/${normalizedType.toLowerCase()}/${documentId}/v${nextVersion}/${secureFilename}`;

  // 8. Upload binary to private S3 storage
  const storageProvider = getStorageProvider();
  try {
    await storageProvider.client.send(new PutObjectCommand({
      Bucket: storageProvider.bucketName,
      Key: storageKey,
      Body: file.buffer,
      ContentType: detectedMimeType,
      Metadata: {
        agencyId: String(agencyId),
        policyId: String(policyId),
        documentType: normalizedType,
        version: String(nextVersion),
        checksum
      }
    }));
  } catch (err) {
    throw new Error(`Failed to upload file to storage: ${err.message}`);
  }

  // 9. Database transaction / record creation with compensatory cleanup on error
  let createdDocument;
  try {
    // Demote any existing current version
    await PolicyDocument.updateMany(
      { agencyId, policyId: policy._id, documentType: normalizedType, isCurrent: true },
      { $set: { isCurrent: false } }
    );

    createdDocument = await PolicyDocument.create({
      _id: documentId,
      agencyId,
      customerId: policy.customerId,
      policyId: policy._id,
      documentType: normalizedType,
      version: nextVersion,
      storageKey,
      storageBucket: storageProvider.bucketName,
      storageProvider: 's3',
      originalFilename: safeOriginalName,
      mimeType: detectedMimeType,
      fileSize: file.buffer.length,
      checksum,
      uploadedBy: user.userId || user._id,
      uploadedByName: user.name || 'Agent',
      uploadedAt: new Date(),
      isCurrent: true,
      status: POLICY_DOCUMENT_STATUSES.UPLOADED
    });
  } catch (dbErr) {
    // Compensatory cleanup: delete uploaded S3 binary if DB record creation failed
    try {
      await storageProvider.client.send(new DeleteObjectCommand({
        Bucket: storageProvider.bucketName,
        Key: storageKey
      }));
    } catch (cleanupErr) {
      console.error('[PolicyDocumentService] S3 cleanup failed after DB error:', cleanupErr.message);
    }
    throw dbErr;
  }

  // 10. Audit Logging
  try {
    await AuditLog.create({
      agencyId,
      actorId: user.userId || user._id,
      actorEmail: user.email,
      action: nextVersion > 1 ? 'POLICY_DOCUMENT_REPLACED' : 'POLICY_DOCUMENT_UPLOADED',
      resourceType: 'policy_document',
      resourceId: createdDocument._id,
      after: {
        policyId: policy._id.toString(),
        documentType: normalizedType,
        version: nextVersion,
        filename: safeOriginalName,
        fileSize: file.buffer.length,
        checksum
      }
    });
  } catch (auditErr) {
    console.warn('[PolicyDocumentService] Audit log warning:', auditErr.message);
  }

  return createdDocument;
};

/**
 * 2. List Policy Documents (returns metadata only)
 * Supports both:
 * - getPolicyDocuments({ agencyId, policyId, user, includeHistory }) for API/controller
 * - getPolicyDocuments(policyId) for future background extraction pipelines
 */
exports.getPolicyDocuments = async (paramsOrPolicyId, maybePolicyId, maybeUser, maybeIncludeHistory) => {
  if (typeof paramsOrPolicyId === 'object' && paramsOrPolicyId !== null && (paramsOrPolicyId.agencyId || paramsOrPolicyId.policyId)) {
    const { agencyId, policyId, user, includeHistory = false } = paramsOrPolicyId;
    const policy = await verifyPolicyAccess(agencyId, policyId, user);

    const query = {
      agencyId,
      policyId: policy._id,
      isDeleted: false
    };

    if (!includeHistory) {
      query.isCurrent = true;
    }

    return PolicyDocument.find(query)
      .populate('uploadedBy', 'name email role')
      .sort({ documentType: 1, version: -1 });
  }

  // Future extraction helper: direct query by policyId
  const policyId = typeof paramsOrPolicyId === 'string' || mongoose.Types.ObjectId.isValid(paramsOrPolicyId)
    ? paramsOrPolicyId
    : maybePolicyId;
  return PolicyDocument.find({ policyId, isDeleted: false, isCurrent: true });
};

/**
 * 3. Get Single Document Metadata by ID
 */
exports.getPolicyDocumentById = async ({ agencyId, policyId, documentId, user }) => {
  const policy = await verifyPolicyAccess(agencyId, policyId, user);

  if (!mongoose.Types.ObjectId.isValid(documentId)) {
    throw new NotFoundError('Document not found');
  }

  const document = await PolicyDocument.findOne({
    _id: documentId,
    policyId: policy._id,
    agencyId,
    isDeleted: false
  }).populate('uploadedBy', 'name email role');

  if (!document) {
    throw new NotFoundError('Document not found in this policy');
  }

  return document;
};

/**
 * 4. Generate Authorized Time-Limited Pre-signed URL for Download / Preview
 */
exports.getPolicyDocumentDownload = async ({ agencyId, policyId, documentId, user, inline = false }) => {
  const policy = await verifyPolicyAccess(agencyId, policyId, user);

  if (!mongoose.Types.ObjectId.isValid(documentId)) {
    throw new NotFoundError('Document not found');
  }

  const document = await PolicyDocument.findOne({
    _id: documentId,
    policyId: policy._id,
    agencyId,
    isDeleted: false
  });

  if (!document) {
    throw new NotFoundError('Document not found in this policy');
  }

  const storageProvider = getStorageProvider();
  const expiryMinutes = 15;
  const presignedUrl = await storageProvider.getSecureUrl(document.storageKey, expiryMinutes);

  // Audit Logging
  try {
    await AuditLog.create({
      agencyId,
      actorId: user.userId || user._id,
      actorEmail: user.email,
      action: inline ? 'POLICY_DOCUMENT_VIEWED' : 'POLICY_DOCUMENT_DOWNLOADED',
      resourceType: 'policy_document',
      resourceId: document._id,
      after: {
        policyId: policy._id.toString(),
        documentType: document.documentType,
        version: document.version,
        filename: document.originalFilename
      }
    });
  } catch (auditErr) {
    console.warn('[PolicyDocumentService] Audit log warning:', auditErr.message);
  }

  return { presignedUrl, document };
};

/**
 * 5. Stream Document Binary Directly through Backend
 */
exports.streamPolicyDocument = async ({ agencyId, policyId, documentId, user }) => {
  const policy = await verifyPolicyAccess(agencyId, policyId, user);

  if (!mongoose.Types.ObjectId.isValid(documentId)) {
    throw new NotFoundError('Document not found');
  }

  const document = await PolicyDocument.findOne({
    _id: documentId,
    policyId: policy._id,
    agencyId,
    isDeleted: false
  });

  if (!document) {
    throw new NotFoundError('Document not found in this policy');
  }

  const storageProvider = getStorageProvider();
  const { buffer, contentType } = await storageProvider.download(document.storageKey);

  // Audit Logging
  try {
    await AuditLog.create({
      agencyId,
      actorId: user.userId || user._id,
      actorEmail: user.email,
      action: 'POLICY_DOCUMENT_DOWNLOADED',
      resourceType: 'policy_document',
      resourceId: document._id,
      after: {
        policyId: policy._id.toString(),
        documentType: document.documentType,
        version: document.version,
        filename: document.originalFilename
      }
    });
  } catch (auditErr) {
    console.warn('[PolicyDocumentService] Audit log warning:', auditErr.message);
  }

  return { buffer, contentType, filename: document.originalFilename };
};

/**
 * 6. Soft Delete / Archive Policy Document (Admin Only)
 */
exports.deletePolicyDocument = async ({ agencyId, policyId, documentId, user }) => {
  // Only Admin can archive/delete documents
  if (user.role !== ROLES.ADMIN && user.role !== 'super_admin') {
    throw new AuthorizationError('Only administrators can archive or delete policy documents');
  }

  const policy = await verifyPolicyAccess(agencyId, policyId, user);

  if (!mongoose.Types.ObjectId.isValid(documentId)) {
    throw new NotFoundError('Document not found');
  }

  const document = await PolicyDocument.findOne({
    _id: documentId,
    policyId: policy._id,
    agencyId,
    isDeleted: false
  });

  if (!document) {
    throw new NotFoundError('Document not found in this policy');
  }

  // Soft delete / archive metadata (preserves S3 binary for legal & compliance retention)
  document.isDeleted = true;
  document.status = POLICY_DOCUMENT_STATUSES.ARCHIVED;
  document.isCurrent = false;
  document.deletedAt = new Date();
  document.deletedBy = user.userId || user._id;
  await document.save();

  // If there was a previous version of this document type, promote latest non-deleted to isCurrent
  const previousVersion = await PolicyDocument.findOne({
    agencyId,
    policyId: policy._id,
    documentType: document.documentType,
    isDeleted: false
  }).sort({ version: -1 });

  if (previousVersion) {
    previousVersion.isCurrent = true;
    await previousVersion.save();
  }

  // Audit Logging
  try {
    await AuditLog.create({
      agencyId,
      actorId: user.userId || user._id,
      actorEmail: user.email,
      action: 'POLICY_DOCUMENT_ARCHIVED',
      resourceType: 'policy_document',
      resourceId: document._id,
      after: {
        policyId: policy._id.toString(),
        documentType: document.documentType,
        version: document.version
      }
    });
  } catch (auditErr) {
    console.warn('[PolicyDocumentService] Audit log warning:', auditErr.message);
  }

  return { message: 'Document archived successfully', documentId: document._id };
};

/**
 * 7. Clean internal abstractions for Future Extraction Runs (Requirement 58)
 */
exports.getPolicyDocument = async (documentId) => {
  return PolicyDocument.findById(documentId);
};

exports.getPolicyDocumentBinary = async (documentId) => {
  const doc = await PolicyDocument.findById(documentId);
  if (!doc) throw new NotFoundError('Document not found');
  const storageProvider = getStorageProvider();
  return storageProvider.download(doc.storageKey);
};
