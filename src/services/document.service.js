const Document = require('../models/Document');
const Customer = require('../models/Customer');
const { getStorageProvider } = require('../providers/storage/azureBlobProvider');
const activityService = require('./activity.service');
const auditLogService = require('./auditLog.service');
const { NotFoundError, ValidationError } = require('../utils/apiError');
const { ACTIVITY_TYPES, DOCUMENT_CATEGORIES } = require('../utils/constants');

const upload = async (agencyId, data, file, user) => {
  const { customerId, policyId, category } = data;
  
  let customer = null;
  if (customerId) {
    customer = await Customer.findOne({ _id: customerId, agencyId, isDeleted: false });
  }

  const storageProvider = getStorageProvider();
  const fileExt = (file.originalname.split('.').pop() || 'pdf').toLowerCase();
  const fileName = file.originalname;
  
  const uploadResult = await storageProvider.upload(file.buffer, fileName, file.mimetype, {
    agencyId,
    customerId: customerId || 'general'
  });

  const document = await Document.create({
    agencyId,
    customerId: customerId || undefined,
    policyId: policyId || undefined,
    category: category || DOCUMENT_CATEGORIES.POLICY_DOCUMENT,
    fileName,
    originalName: fileName,
    fileType: fileExt,
    fileSize: file.size,
    blobUrl: uploadResult.blobUrl,
    blobKey: uploadResult.blobKey,
    verificationState: 'unverified',
    createdBy: user.userId
  });

  if (activityService && activityService.logActivity) {
    await activityService.logActivity(agencyId, ACTIVITY_TYPES.DOCUMENT_UPLOADED, {
      customerId: customerId || undefined,
      documentId: document._id,
      performedBy: user.userId,
      description: `Uploaded document ${fileName}`
    });
  }

  return document;
};

const list = async (agencyId, filters = {}, pagination = { page: 1, limit: 50 }, user) => {
  const query = { agencyId, isDeleted: false };
  
  if (filters.customerId) query.customerId = filters.customerId;
  if (filters.policyId) query.policyId = filters.policyId;
  if (filters.category) query.category = filters.category;

  // Agent filter: if user is not admin, only show docs for their assigned customers
  if (user && user.role === 'agent') {
    const assignedCustomers = await Customer.find({ agencyId, assignedAgentId: user.userId, isDeleted: false }).select('_id');
    const customerIds = assignedCustomers.map(c => c._id);
    if (query.customerId && !customerIds.some(id => id.toString() === query.customerId.toString())) {
      return { documents: [], total: 0 };
    }
    if (!query.customerId) {
      query.customerId = { $in: customerIds };
    }
  }

  const total = await Document.countDocuments(query);
  const documents = await Document.find(query)
    .sort({ createdAt: -1 })
    .skip(((pagination.page || 1) - 1) * (pagination.limit || 50))
    .limit(pagination.limit || 50)
    .populate('customerId', 'name mobile email')
    .populate('policyId', 'policyNumber insuranceCompany policyType');

  return { documents, total };
};

const getById = async (docId, agencyId) => {
  const document = await Document.findOne({ _id: docId, agencyId, isDeleted: false })
    .populate('customerId', 'name mobile email')
    .populate('policyId', 'policyNumber insuranceCompany');
    
  if (!document) {
    throw new NotFoundError('Document not found');
  }
  return document;
};

const getDownloadUrl = async (docId, agencyId) => {
  const document = await getById(docId, agencyId);
  const storageProvider = getStorageProvider();
  const url = await storageProvider.getSecureUrl(document.blobKey, 30);
  
  return {
    url,
    fileName: document.fileName,
    fileType: document.fileType,
    blobUrl: document.blobUrl
  };
};

const deleteDoc = async (docId, agencyId, user) => {
  const document = await getById(docId, agencyId);
  
  try {
    const storageProvider = getStorageProvider();
    await storageProvider.delete(document.blobKey);
  } catch (e) {
    console.warn('[document.service] S3 delete warning:', e.message);
  }
  
  document.isDeleted = true;
  document.deletedAt = new Date();
  document.deletedBy = user.userId;
  await document.save();

  if (auditLogService && auditLogService.createLog) {
    await auditLogService.createLog(agencyId, 'Document', document._id, 'DELETE', document.toObject(), null, user.userId);
  }

  if (activityService && activityService.logActivity) {
    await activityService.logActivity(agencyId, ACTIVITY_TYPES.DOCUMENT_DELETED, {
      customerId: document.customerId,
      performedBy: user.userId,
      description: `Deleted document ${document.fileName}`
    });
  }

  return true;
};

module.exports = {
  upload,
  list,
  getById,
  getDownloadUrl,
  delete: deleteDoc
};
