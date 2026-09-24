const { catchAsync, ApiResponse } = require('../utils/apiResponse');
const ocrService = require('../services/ocr.service');

const process = catchAsync(async (req, res) => {
  const result = await ocrService.processDocument(req.params.docId, req.agencyId, req.user);
  return new ApiResponse(200, 'OCR processing completed', result).send(res);
});

const getResult = catchAsync(async (req, res) => {
  const result = await ocrService.getResult(req.params.docId, req.agencyId);
  return new ApiResponse(200, 'OCR result retrieved successfully', result).send(res);
});

const confirm = catchAsync(async (req, res) => {
  await ocrService.confirmResult(req.params.docId, req.agencyId, req.body.confirmedData, req.user);
  return new ApiResponse(200, 'OCR data confirmed successfully').send(res);
});

module.exports = {
  process,
  getResult,
  confirm
};
