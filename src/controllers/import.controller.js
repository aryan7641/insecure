const path = require('path');
const { catchAsync, ApiResponse } = require('../utils/apiResponse');
const { ValidationError } = require('../utils/apiError');
const importService = require('../services/import.service');

const upload = catchAsync(async (req, res) => {
  if (!req.file) throw new ValidationError('File is required');
  if (!req.body.type) throw new ValidationError('Import type is required');

  const { importId, preview } = await importService.parseFile(
    req.agencyId,
    req.file.buffer,
    req.file.originalname,
    req.body.type,
    req.user
  );
  
  return new ApiResponse(201, 'File parsed successfully', { importId, preview }).send(res);
});

const preview = catchAsync(async (req, res) => {
  const result = await importService.getPreview(req.params.importId, req.agencyId);
  return new ApiResponse(200, 'Preview generated successfully', result).send(res);
});

const resolve = catchAsync(async (req, res) => {
  const updatedImport = await importService.setResolutions(req.params.importId, req.agencyId, req.body.resolutions);
  return new ApiResponse(200, 'Resolutions applied successfully', { import: updatedImport }).send(res);
});

const execute = catchAsync(async (req, res) => {
  const summary = await importService.executeImport(req.params.importId, req.agencyId, req.user);
  return new ApiResponse(200, 'Import executed successfully', summary).send(res);
});

const getStatus = catchAsync(async (req, res) => {
  const status = await importService.getStatus(req.params.importId, req.agencyId);
  return new ApiResponse(200, 'Import status retrieved successfully', status).send(res);
});

const getErrors = catchAsync(async (req, res) => {
  const errors = await importService.getErrorReport(req.params.importId, req.agencyId);
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename=errors-${req.params.importId}.json`);
  return res.send(JSON.stringify(errors, null, 2));
});

const downloadTemplate = catchAsync(async (req, res) => {
  const templatePath = importService.getTemplate(req.params.type);
  res.download(templatePath);
});

const listHistory = catchAsync(async (req, res) => {
  const imports = await importService.listImports(req.agencyId, req.query);
  return new ApiResponse(200, 'Import history retrieved successfully', imports).send(res);
});

module.exports = {
  upload,
  preview,
  resolve,
  execute,
  getStatus,
  getErrors,
  downloadTemplate,
  listHistory
};
