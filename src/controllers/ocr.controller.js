const { catchAsync, ApiResponse } = require('../utils/apiResponse');
const ocrService = require('../services/ocr.service');

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

module.exports = {
  extractPolicyPdf,
  reExtractWithSubtype,
  confirmPolicyFromOcr,
  getResult
};
