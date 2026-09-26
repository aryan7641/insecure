const Document = require('../models/Document');
const Customer = require('../models/Customer');
const InsurancePolicy = require('../models/InsurancePolicy');
const FollowUp = require('../models/FollowUp');
const { getStorageProvider } = require('../providers/storage/azureBlobProvider');
const { getPdfTextExtractor } = require('../providers/ocr/pdfTextExtractor');
const { getInsuranceLlmExtractor } = require('../providers/llm/insuranceLlmExtractor');
const duplicateDetectionService = require('./duplicateDetection.service');
const activityService = require('./activity.service');
const auditLogService = require('./auditLog.service');
const { NotFoundError, ConflictError, ValidationError } = require('../utils/apiError');
const { OCR_STATUSES, ACTIVITY_TYPES, DOCUMENT_CATEGORIES, FOLLOW_UP_TYPES, FOLLOW_UP_STATUSES, RENEWAL_INTERVALS } = require('../utils/constants');

/**
 * Step 1: Upload Policy PDF -> Store in AWS S3 -> Extract via OCR + LLM -> Duplicate Check -> Return Draft
 */
const extractPolicyPdf = async (agencyId, file, user) => {
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

  try {
    // 3. Extract text via OCR / PDF extraction provider
    const textExtractor = getPdfTextExtractor();
    const { rawText } = await textExtractor.extractText(file.buffer, fileExt);

    // 4. Pass text to LLM extraction layer
    const llmExtractor = getInsuranceLlmExtractor();
    const extractedData = await llmExtractor.extractInsuranceData(rawText, file.originalname);

    // 5. Perform duplicate detection on potential matches
    const customerCriteria = {
      mobile: extractedData.customer?.mobile?.value,
      email: extractedData.customer?.email?.value,
      pan: extractedData.customer?.pan?.value,
      name: extractedData.customer?.name?.value,
      dob: extractedData.customer?.dob?.value
    };
    const customerMatches = await duplicateDetectionService.findDuplicates(agencyId, customerCriteria);

    let policyMatches = [];
    if (extractedData.policy?.policyNumber?.value) {
      policyMatches = await InsurancePolicy.find({
        agencyId,
        policyNumber: extractedData.policy.policyNumber.value,
        isDeleted: false
      }).populate('customerId', 'name mobile email');
    }

    // 6. Update document with structured draft results
    document.extractedData = extractedData;
    document.ocrConfidence = {
      customer: extractedData.customer?.name?.confidence || 0.8,
      policyNumber: extractedData.policy?.policyNumber?.confidence || 0.85,
      premium: extractedData.premium?.finalPremium?.confidence || 0.85
    };
    document.ocrStatus = OCR_STATUSES.COMPLETED;
    await document.save();

    if (activityService && activityService.logActivity) {
      await activityService.logActivity(agencyId, ACTIVITY_TYPES.OCR_COMPLETED, {
        documentId: document._id,
        performedBy: user.userId,
        description: `Extracted policy data from ${document.fileName}`
      });
    }

    return {
      documentId: document._id,
      blobUrl: document.blobUrl,
      fileName: document.fileName,
      extractedData,
      duplicateCandidates: {
        customers: customerMatches,
        policies: policyMatches
      }
    };
  } catch (err) {
    document.ocrStatus = OCR_STATUSES.FAILED;
    await document.save();
    throw err;
  }
};

/**
 * Step 2: Agent Human Verification & Confirmation -> Save Customer & Policy -> Attach S3 PDF
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
    policyData = {}
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

  // 2. Validate & Create Policy
  const policyNum = (policyData.policyNumber || '').trim();
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
    insuranceCompany: policyData.insurer || policyData.insuranceCompany || 'General Insurer',
    productName: policyData.productName || undefined,
    planName: policyData.planName || undefined,
    policyNumber: policyNum,
    policyType: (policyData.policyType || 'health').toLowerCase(),
    lob: policyData.lob || undefined,
    subLob: policyData.subLob || undefined,
    businessType: policyData.businessType || 'new',
    issueDate: policyData.issueDate || undefined,
    startDate: policyData.startDate || undefined,
    endDate: policyData.endDate || undefined,
    renewalDate: policyData.renewalDate || policyData.endDate || undefined,
    tenureYears: policyData.tenureYears ? Number(policyData.tenureYears) : 1,
    sumAssured: Number(policyData.sumAssured || 0) || undefined,
    basicPremium: Number(policyData.basicPremium || 0) || undefined,
    addonPremium: Number(policyData.addonPremium || 0) || undefined,
    gst: Number(policyData.gst || 0) || undefined,
    netPremium: Number(policyData.netPremium || 0) || undefined,
    premium: Number(policyData.finalPremium || policyData.premium || 0),
    installmentAmount: Number(policyData.installmentAmount || 0) || undefined,
    premiumFrequency: policyData.premiumFrequency || 'yearly',
    vehicleDetails: policyData.vehicleDetails || undefined,
    insuredMembers: Array.isArray(policyData.insuredMembers) ? policyData.insuredMembers : [],
    nominee: policyData.nominee || undefined,
    commission: policyData.commission || undefined,
    notes: policyData.notes || undefined,
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
      description: `Policy ${newPolicy.policyNumber} created from verified PDF extraction`
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

  return {
    documentId: document._id,
    fileName: document.fileName,
    blobUrl: document.blobUrl,
    extractedData: document.extractedData,
    ocrStatus: document.ocrStatus,
    verificationState: document.verificationState,
    ocrConfirmed: document.ocrConfirmed
  };
};

module.exports = {
  extractPolicyPdf,
  confirmPolicyFromOcr,
  getResult
};
