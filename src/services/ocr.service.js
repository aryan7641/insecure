const Document = require('../models/Document');
const Customer = require('../models/Customer');
const { getStorageProvider } = require('../providers/storage/azureBlobProvider');
const { getOcrProvider } = require('../providers/ocr/mockOcrProvider');
const activityService = require('./activity.service');
const auditLogService = require('./auditLog.service');
const { NotFoundError, ConflictError, ValidationError } = require('../utils/apiError');
const { OCR_STATUSES, ACTIVITY_TYPES, DOCUMENT_CATEGORIES } = require('../utils/constants');

const processDocument = async (docId, agencyId, user) => {
  const document = await Document.findOne({ _id: docId, agencyId, isDeleted: false });
  if (!document) throw new NotFoundError('Document not found');

  if (document.ocrStatus === OCR_STATUSES.PROCESSING) {
    throw new ConflictError('Document is already being processed');
  }

  document.ocrStatus = OCR_STATUSES.PROCESSING;
  await document.save();

  try {
    const storageProvider = getStorageProvider();
    const { buffer } = await storageProvider.download(document.blobKey);

    const ocrProvider = getOcrProvider();
    const extractionResult = await ocrProvider.extractFields(buffer, document.fileType, document.category);

    document.extractedData = extractionResult.fields;
    document.ocrConfidence = extractionResult.confidence;
    document.ocrStatus = OCR_STATUSES.COMPLETED;
    await document.save();

    await activityService.logActivity({
      agencyId,
      type: ACTIVITY_TYPES.OCR_COMPLETED,
      customerId: document.customerId,
      documentId: document._id,
      userId: user.userId,
      description: `OCR processing completed for ${document.fileName}`
    });

    return extractionResult;
  } catch (error) {
    document.ocrStatus = OCR_STATUSES.FAILED;
    await document.save();
    throw error;
  }
};

const getResult = async (docId, agencyId) => {
  const document = await Document.findOne({ _id: docId, agencyId, isDeleted: false });
  if (!document) throw new NotFoundError('Document not found');

  return {
    extractedData: document.extractedData,
    ocrStatus: document.ocrStatus,
    confidence: document.ocrConfidence
  };
};

const confirmResult = async (docId, agencyId, confirmedData, user) => {
  if (!confirmedData || typeof confirmedData !== 'object') {
    throw new ValidationError('confirmedData must be a valid object');
  }

  const document = await Document.findOne({ _id: docId, agencyId, isDeleted: false });
  if (!document) throw new NotFoundError('Document not found');

  if (document.ocrStatus !== OCR_STATUSES.COMPLETED) {
    throw new ConflictError('OCR processing is not completed');
  }

  const customer = await Customer.findById(document.customerId);
  const oldCustomerData = customer.toObject();

  // Write confirmedData to customer based on document category
  if (document.category === DOCUMENT_CATEGORIES.PAN_CARD && confirmedData.pan) {
    customer.pan = confirmedData.pan;
  } else if (document.category === DOCUMENT_CATEGORIES.AADHAAR && confirmedData.aadhaar) {
    customer.aadhaar = confirmedData.aadhaar;
  }
  
  if (confirmedData.name) {
    customer.name = confirmedData.name;
  }

  await customer.save();

  document.ocrConfirmed = true;
  document.ocrConfirmedBy = user.userId;
  document.ocrConfirmedAt = new Date();
  await document.save();

  await auditLogService.logAction(user.userId, agencyId, 'OCR_CONFIRMED', 'Customer', customer._id, oldCustomerData, customer.toObject());

  await activityService.logActivity({
    agencyId,
    type: ACTIVITY_TYPES.OCR_CONFIRMED,
    customerId: document.customerId,
    documentId: document._id,
    userId: user.userId,
    description: `Confirmed OCR data for ${document.fileName}`
  });
};

module.exports = {
  processDocument,
  getResult,
  confirmResult
};
