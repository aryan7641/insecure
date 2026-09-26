const Document = require('../models/Document');
const Customer = require('../models/Customer');
const InsurancePolicy = require('../models/InsurancePolicy');
const FollowUp = require('../models/FollowUp');
const ExtractionJob = require('../models/ExtractionJob');
const { getStorageProvider } = require('../providers/storage/azureBlobProvider');
const { getPdfTextExtractor } = require('../providers/ocr/pdfTextExtractor');
const { getInsuranceLlmExtractor } = require('../providers/llm/insuranceLlmExtractor');
const { getSubtypeSchema } = require('../schemas/insuranceSubtypeSchemas');
const { normalizePolicyPayload } = require('./insuranceSchema.service');
const duplicateDetectionService = require('./duplicateDetection.service');
const activityService = require('./activity.service');
const auditLogService = require('./auditLog.service');
const { NotFoundError, ConflictError, ValidationError } = require('../utils/apiError');
const { OCR_STATUSES, ACTIVITY_TYPES, DOCUMENT_CATEGORIES, FOLLOW_UP_TYPES, FOLLOW_UP_STATUSES, RENEWAL_INTERVALS } = require('../utils/constants');

/**
 * Step 1: Upload Policy PDF -> Store in AWS S3 -> Classify & Extract via Subtype Schema -> Duplicate Check -> Return Draft
 */
const extractPolicyPdf = async (agencyId, file, user, requestedSubtype = null) => {
  if (!file || !file.buffer) {
    throw new ValidationError('PDF file buffer is required for extraction');
  }

  const storageProvider = getStorageProvider();
  const fileExt = (file.originalname.split('.').pop() || 'pdf').toLowerCase();
  
  // 1. Store original document securely in AWS S3
  const uploadRes = await storageProvider.upload(
    file.buffer,
    file.originalname,
    file.mimetype || 'application/pdf',
    { agencyId, category: DOCUMENT_CATEGORIES.POLICY_DOCUMENT }
  );

  // 2. Create processing document record
  const document = await Document.create({
    agencyId,
    fileName: file.originalname,
    originalName: file.originalname,
    blobUrl: uploadRes.blobUrl,
    blobKey: uploadRes.blobKey,
    fileType: fileExt,
    fileSize: file.size || file.buffer.length,
    category: DOCUMENT_CATEGORIES.POLICY_DOCUMENT,
    verificationState: 'needs_review',
    ocrStatus: OCR_STATUSES.PROCESSING,
    createdBy: user.userId
  });

  // 3. Create Extraction Job tracker
  const extractionJob = await ExtractionJob.create({
    agencyId,
    documentId: document._id,
    insuranceSubtype: requestedSubtype || undefined,
    status: 'classifying',
    createdBy: user.userId
  });

  try {
    // 4. Extract text via OCR / PDF extraction provider
    const textExtractor = getPdfTextExtractor();
    const { rawText } = await textExtractor.extractText(file.buffer, fileExt);
    extractionJob.rawText = rawText ? rawText.slice(0, 10000) : '';

    // 5. Pass text to LLM extraction layer with Subtype-Specific Schemas
    extractionJob.status = 'extracting';
    await extractionJob.save();

    const llmExtractor = getInsuranceLlmExtractor();
    const extractionResult = await llmExtractor.extractInsuranceData(rawText, file.originalname, requestedSubtype);

    const classification = extractionResult.classification;
    const finalSubtype = requestedSubtype || classification.effectiveSubtype || 'individual_health';
    const finalType = classification.effectiveType || 'health';

    // 6. Perform duplicate detection on potential matches
    const customerCriteria = {
      mobile: extractionResult.customer?.mobile?.value,
      email: extractionResult.customer?.email?.value,
      pan: extractionResult.customer?.pan?.value,
      name: extractionResult.customer?.name?.value,
      dob: extractionResult.customer?.dob?.value
    };
    const customerMatches = await duplicateDetectionService.findDuplicates(agencyId, customerCriteria);

    let policyMatches = [];
    if (extractionResult.policy?.policyNumber?.value) {
      policyMatches = await InsurancePolicy.find({
        agencyId,
        policyNumber: extractionResult.policy.policyNumber.value,
        isDeleted: false
      }).populate('customerId', 'name mobile email');
    }

    // 7. Update document and job records
    document.extractedData = extractionResult;
    document.ocrConfidence = {
      customer: extractionResult.customer?.name?.confidence || 0.8,
      policyNumber: extractionResult.policy?.policyNumber?.confidence || 0.85,
      premium: extractionResult.premium?.finalPremium?.confidence || 0.85
    };
    document.ocrStatus = OCR_STATUSES.COMPLETED;
    await document.save();

    extractionJob.insuranceType = finalType;
    extractionJob.insuranceSubtype = finalSubtype;
    extractionJob.classificationResult = classification;
    extractionJob.extractedData = extractionResult;
    extractionJob.confidence = document.ocrConfidence;
    extractionJob.duplicateCandidates = {
      customers: customerMatches,
      policies: policyMatches
    };
    extractionJob.status = 'review_required';
    await extractionJob.save();

    if (activityService && activityService.logActivity) {
      await activityService.logActivity(agencyId, ACTIVITY_TYPES.OCR_COMPLETED, {
        documentId: document._id,
        performedBy: user.userId,
        description: `Extracted ${classification.subtypeName || finalSubtype} policy data from ${document.fileName}`
      });
    }

    return {
      documentId: document._id,
      jobId: extractionJob._id,
      blobUrl: document.blobUrl,
      fileName: document.fileName,
      classification,
      extractedData: extractionResult,
      duplicateCandidates: {
        customers: customerMatches,
        policies: policyMatches
      }
    };
  } catch (err) {
    document.ocrStatus = OCR_STATUSES.FAILED;
    await document.save();

    extractionJob.status = 'failed';
    extractionJob.error = err.message;
    await extractionJob.save();

    throw err;
  }
};

/**
 * Re-extract an existing document with a newly selected subtype
 */
const reExtractWithSubtype = async (agencyId, docId, requestedSubtype, user) => {
  const document = await Document.findOne({ _id: docId, agencyId, isDeleted: false });
  if (!document) throw new NotFoundError('Document record not found');

  const existingJob = await ExtractionJob.findOne({ documentId: docId, agencyId });
  const rawText = existingJob?.rawText || '';

  const llmExtractor = getInsuranceLlmExtractor();
  const extractionResult = await llmExtractor.extractInsuranceData(rawText, document.fileName, requestedSubtype);

  const customerCriteria = {
    mobile: extractionResult.customer?.mobile?.value,
    email: extractionResult.customer?.email?.value,
    pan: extractionResult.customer?.pan?.value,
    name: extractionResult.customer?.name?.value,
    dob: extractionResult.customer?.dob?.value
  };
  const customerMatches = await duplicateDetectionService.findDuplicates(agencyId, customerCriteria);

  let policyMatches = [];
  if (extractionResult.policy?.policyNumber?.value) {
    policyMatches = await InsurancePolicy.find({
      agencyId,
      policyNumber: extractionResult.policy.policyNumber.value,
      isDeleted: false
    }).populate('customerId', 'name mobile email');
  }

  document.extractedData = extractionResult;
  await document.save();

  if (existingJob) {
    existingJob.insuranceSubtype = requestedSubtype;
    existingJob.extractedData = extractionResult;
    existingJob.status = 'review_required';
    await existingJob.save();
  }

  return {
    documentId: document._id,
    jobId: existingJob?._id,
    blobUrl: document.blobUrl,
    fileName: document.fileName,
    classification: extractionResult.classification,
    extractedData: extractionResult,
    duplicateCandidates: {
      customers: customerMatches,
      policies: policyMatches
    }
  };
};

/**
 * Step 2: Agent Human Verification & Confirmation -> Save Customer & Subtype Policy -> Attach S3 PDF
 */
const confirmPolicyFromOcr = async (agencyId, docId, confirmationPayload, user) => {
  if (!confirmationPayload) {
    throw new ValidationError('Confirmation payload is required');
  }

  const document = await Document.findOne({ _id: docId, agencyId, isDeleted: false });
  if (!document) throw new NotFoundError('Document record not found');

  const {
    customerAction = 'create_new', // 'create_new' | 'attach_existing' | 'update_existing'
    existingCustomerId,
    customerData = {},
    policyData = {},
    subtype = 'individual_health'
  } = confirmationPayload;

  let customer;

  // 1. Resolve or Create Customer Record
  if (customerAction === 'attach_existing' && existingCustomerId) {
    customer = await Customer.findOne({ _id: existingCustomerId, agencyId, isDeleted: false });
    if (!customer) throw new NotFoundError('Existing customer not found');
  } else if (customerAction === 'update_existing' && existingCustomerId) {
    customer = await Customer.findOne({ _id: existingCustomerId, agencyId, isDeleted: false });
    if (!customer) throw new NotFoundError('Existing customer not found');
    
    // Update provided non-empty fields
    if (customerData.name) customer.name = customerData.name.trim();
    if (customerData.mobile) customer.mobile = customerData.mobile.trim();
    if (customerData.email) customer.email = customerData.email.trim();
    if (customerData.dob) customer.dob = customerData.dob;
    if (customerData.gender) customer.gender = customerData.gender;
    if (customerData.pan) customer.pan = customerData.pan.trim().toUpperCase();
    if (customerData.aadhaar) customer.aadhaar = customerData.aadhaar.trim();
    if (customerData.address) customer.address = typeof customerData.address === 'object' ? customerData.address : { street: customerData.address, country: 'India' };
    if (customerData.city) customer.city = customerData.city;
    if (customerData.state) customer.state = customerData.state;
    if (customerData.pincode) customer.pincode = customerData.pincode;
    customer.updatedBy = user.userId;
    await customer.save();
  } else {
    // create_new
    if (!customerData.name || !customerData.mobile) {
      throw new ValidationError('Customer name and 10-digit mobile number are required');
    }

    const cleanedMobile = (customerData.mobile || '').replace(/\D/g, '').slice(-10);
    const existing = await Customer.findOne({ agencyId, mobile: cleanedMobile, isDeleted: false });
    
    if (existing) {
      customer = existing;
    } else {
      customer = await Customer.create({
        agencyId,
        assignedAgentId: user.userId,
        name: customerData.name.trim(),
        mobile: cleanedMobile,
        email: customerData.email?.trim() || undefined,
        dob: customerData.dob || undefined,
        gender: customerData.gender || undefined,
        pan: customerData.pan?.trim()?.toUpperCase() || undefined,
        aadhaar: customerData.aadhaar?.trim() || undefined,
        address: typeof customerData.address === 'object' ? customerData.address : { street: customerData.address || '', country: 'India' },
        city: customerData.city || undefined,
        state: customerData.state || undefined,
        pincode: customerData.pincode || undefined,
        customerType: customerData.customerType || 'individual',
        notes: customerData.notes || undefined,
        tags: customerData.tags || [],
        nominee: customerData.nominee || undefined,
        createdBy: user.userId
      });

      if (activityService && activityService.logActivity) {
        await activityService.logActivity(agencyId, ACTIVITY_TYPES.CUSTOMER_CREATED, {
          customerId: customer._id,
          performedBy: user.userId
        });
      }
    }
  }

  // 2. Normalize and Validate Policy with Subtype Schema
  const finalSubtype = confirmationPayload.insuranceSubtype || policyData.insuranceSubtype || subtype || 'individual_health';
  const normalized = normalizePolicyPayload(confirmationPayload, finalSubtype);

  const policyNum = (normalized.policy.policyNumber || policyData.policyNumber || '').trim();
  if (!policyNum) {
    throw new ValidationError('Policy Number is required');
  }

  const existingPolicy = await InsurancePolicy.findOne({ agencyId, policyNumber: policyNum, isDeleted: false });
  if (existingPolicy) {
    throw new ConflictError(`Policy with number "${policyNum}" already exists in this agency`);
  }

  const newPolicy = await InsurancePolicy.create({
    agencyId,
    customerId: customer._id,
    assignedAgentId: customer.assignedAgentId || user.userId,
    insuranceCompany: normalized.policy.insuranceCompany || policyData.insurer || policyData.insuranceCompany || 'General Insurer',
    productName: normalized.policy.productName || undefined,
    planName: normalized.policy.planName || undefined,
    policyNumber: policyNum,
    insuranceType: normalized.insuranceType,
    insuranceSubtype: normalized.insuranceSubtype,
    policyType: normalized.policyType,
    lob: normalized.lob,
    subLob: normalized.subLob,
    businessType: normalized.policy.businessType || 'new',
    issueDate: normalized.policy.issueDate || undefined,
    startDate: normalized.policy.startDate || undefined,
    endDate: normalized.policy.endDate || undefined,
    renewalDate: normalized.policy.renewalDate || normalized.policy.endDate || undefined,
    tenureYears: normalized.policy.tenureYears || 1,
    sumAssured: normalized.policy.sumAssured || undefined,
    coverageDetails: normalized.coverageDetails || {},
    healthDetails: confirmationPayload.healthDetails || normalized.coverageDetails?.healthDetails || undefined,
    lifeDetails: confirmationPayload.lifeDetails || normalized.coverageDetails?.lifeDetails || undefined,
    travelDetails: confirmationPayload.travelDetails || normalized.coverageDetails?.travelDetails || undefined,
    propertyDetails: confirmationPayload.propertyDetails || normalized.coverageDetails?.propertyDetails || undefined,
    basicPremium: normalized.premium.basicPremium || undefined,
    addonPremium: normalized.premium.addonPremium || undefined,
    gst: normalized.premium.gst || undefined,
    netPremium: normalized.premium.netPremium || undefined,
    premium: normalized.premium.premium,
    installmentAmount: normalized.premium.installmentAmount || undefined,
    premiumFrequency: normalized.premium.premiumFrequency || 'yearly',
    vehicleDetails: normalized.vehicleDetails || undefined,
    brokerDetails: normalized.brokerDetails || undefined,
    paymentDetails: normalized.paymentDetails || undefined,
    premiumBreakdown: normalized.premiumBreakdown || undefined,
    insuredMembers: normalized.insuredMembers || [],
    nominee: normalized.nominee || undefined,
    notes: confirmationPayload.notes || policyData.notes || undefined,
    documentId: document._id,
    originalDocumentUrl: document.blobUrl,
    status: policyData.status || 'active',
    createdBy: user.userId
  });

  // 3. Link Document to Customer & Policy, Mark Verified
  document.customerId = customer._id;
  document.policyId = newPolicy._id;
  document.verificationState = 'verified';
  document.ocrConfirmed = true;
  document.ocrConfirmedBy = user.userId;
  document.ocrConfirmedAt = new Date();
  await document.save();

  // Update extraction job as confirmed
  await ExtractionJob.updateOne(
    { documentId: document._id, agencyId },
    {
      status: 'confirmed',
      confirmedPolicyId: newPolicy._id,
      confirmedCustomerId: customer._id
    }
  );

  // 4. Automatically generate Renewal Reminder follow-ups if renewalDate is available
  if (newPolicy.renewalDate) {
    await createRenewalFollowups(agencyId, customer, newPolicy, user);
  }

  // 5. Audit & Activity Logging
  if (auditLogService && auditLogService.createLog) {
    await auditLogService.createLog(agencyId, 'InsurancePolicy', newPolicy._id, 'CREATE_FROM_OCR', null, newPolicy.toObject(), user.userId);
  }

  if (activityService && activityService.logActivity) {
    await activityService.logActivity(agencyId, ACTIVITY_TYPES.POLICY_CREATED, {
      policyId: newPolicy._id,
      customerId: customer._id,
      performedBy: user.userId,
      description: `Policy ${newPolicy.policyNumber} (${newPolicy.subLob || newPolicy.insuranceSubtype}) created from verified PDF extraction`
    });
  }

  return {
    customer,
    policy: newPolicy,
    document
  };
};

/**
 * Generate automated renewal reminder follow-ups (30d, 15d, 7d, 1d)
 */
async function createRenewalFollowups(agencyId, customer, policy, user) {
  if (!policy.renewalDate) return;
  const renewalTime = new Date(policy.renewalDate).getTime();
  const intervals = [30, 15, 7, 1];

  for (const days of intervals) {
    const reminderDate = new Date(renewalTime - days * 24 * 60 * 60 * 1000);
    const eventKey = `renewal_${policy._id}_${days}d`;

    // Check if task already exists
    const existing = await FollowUp.findOne({ agencyId, renewalEventKey: eventKey });
    if (!existing) {
      await FollowUp.create({
        agencyId,
        customerId: customer._id,
        agentId: customer.assignedAgentId || user.userId,
        relatedPolicyId: policy._id,
        type: FOLLOW_UP_TYPES.RENEWAL,
        dueDate: reminderDate,
        status: FOLLOW_UP_STATUSES.PENDING,
        notes: `Automated ${days}-day policy renewal reminder for ${policy.insuranceCompany} (${policy.policyNumber})`,
        isAutomatic: true,
        renewalEventKey: eventKey,
        createdBy: user.userId
      });
    }
  }
}

const getResult = async (docId, agencyId) => {
  const document = await Document.findOne({ _id: docId, agencyId, isDeleted: false });
  if (!document) throw new NotFoundError('Document not found');

  const job = await ExtractionJob.findOne({ documentId: docId, agencyId });

  return {
    documentId: document._id,
    fileName: document.fileName,
    blobUrl: document.blobUrl,
    extractedData: document.extractedData,
    classification: job?.classificationResult,
    ocrStatus: document.ocrStatus,
    verificationState: document.verificationState,
    ocrConfirmed: document.ocrConfirmed
  };
};

module.exports = {
  extractPolicyPdf,
  reExtractWithSubtype,
  confirmPolicyFromOcr,
  getResult
};
