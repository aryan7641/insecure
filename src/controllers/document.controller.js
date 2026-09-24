const { catchAsync, ApiResponse } = require('../utils/apiResponse');
const { ValidationError } = require('../utils/apiError');
const documentService = require('../services/document.service');
const { parsePaginationParams, buildPaginationResponse } = require('../utils/pagination');

const upload = catchAsync(async (req, res) => {
  if (!req.file) {
    throw new ValidationError('File is required');
  }
  const document = await documentService.upload(req.agencyId, req.body, req.file, req.user);
  return new ApiResponse(201, 'Document uploaded successfully', { document }).send(res);
});

const list = catchAsync(async (req, res) => {
  const pagination = parsePaginationParams(req.query);
  const filters = {
    customerId: req.query.customerId,
    category: req.query.category,
  };
  const { documents, total } = await documentService.list(req.agencyId, filters, pagination, req.user);
  return buildPaginationResponse(res, documents, total, pagination.page, pagination.limit, 'Documents retrieved successfully');
});

const getById = catchAsync(async (req, res) => {
  const document = await documentService.getById(req.params.docId, req.agencyId);
  return new ApiResponse(200, 'Document retrieved successfully', { document }).send(res);
});

const download = catchAsync(async (req, res) => {
  const urlData = await documentService.getDownloadUrl(req.params.docId, req.agencyId);
  return new ApiResponse(200, 'Download URL generated successfully', urlData).send(res);
});

const deleteDoc = catchAsync(async (req, res) => {
  await documentService.delete(req.params.docId, req.agencyId, req.user);
  return new ApiResponse(200, 'Document deleted successfully').send(res);
});

module.exports = {
  upload,
  list,
  getById,
  download,
  delete: deleteDoc
};
