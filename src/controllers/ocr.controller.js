const { catchAsync, ApiResponse } = require('../utils/apiResponse');
const ocrService = require('../services/ocr.service');
const Document = require('../models/Document');
const { getStorageProvider } = require('../providers/storage/azureBlobProvider');
const { NotFoundError } = require('../utils/apiError');

const extractPolicyPdf = catchAsync(async (req, res) => {
  const requestedSubtype = req.body?.subtype || req.query?.subtype || null;
  const result = await ocrService.extractPolicyPdf(req.agencyId, req.file, req.user, requestedSubtype);
  return new ApiResponse(200, 'Policy PDF extracted successfully', result).send(res);
});

const reExtractWithSubtype = catchAsync(async (req, res) => {
  const { subtype } = req.body;
  const result = await ocrService.reExtractWithSubtype(req.agencyId, req.params.docId, subtype, req.user);
  return new ApiResponse(200, `Document re-extracted with subtype ${subtype}`, result).send(res);
});

const confirmPolicyFromOcr = catchAsync(async (req, res) => {
  const result = await ocrService.confirmPolicyFromOcr(req.agencyId, req.params.docId, req.body, req.user);
  return new ApiResponse(201, 'Policy confirmed and saved successfully', result).send(res);
});

const getResult = catchAsync(async (req, res) => {
  const result = await ocrService.getResult(req.params.docId, req.agencyId);
  return new ApiResponse(200, 'OCR result retrieved successfully', result).send(res);
});

/**
 * Generate a short-lived presigned S3 URL for secure in-browser PDF viewing.
 * Never exposes the raw S3 blobUrl or any AWS credentials to the client.
 */
const getViewUrl = catchAsync(async (req, res) => {
  const { docId } = req.params;
  const agencyId = req.agencyId;

  const document = await Document.findOne({ _id: docId, agencyId, isDeleted: false });
  if (!document) throw new NotFoundError('Document not found');
  if (!document.blobKey) throw new NotFoundError('Document has no storage key — cannot generate view URL');

  const storageProvider = getStorageProvider();
  // 25-minute expiry — enough for the review session without being a permanent URL
  const presignedUrl = await storageProvider.getSecureUrl(document.blobKey, 25);

  const expiresAt = new Date(Date.now() + 25 * 60 * 1000).toISOString();

  return new ApiResponse(200, 'View URL generated', {
    url: presignedUrl,
    expiresAt,
    fileName: document.fileName
  }).send(res);
});

module.exports = {
  extractPolicyPdf,
  reExtractWithSubtype,
  confirmPolicyFromOcr,
  getResult,
  getViewUrl
};
