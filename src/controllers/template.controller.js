const { catchAsync, ApiResponse } = require('../utils/apiResponse');
const templateService = require('../services/template.service');

const create = catchAsync(async (req, res) => {
  const template = await templateService.create(req.agencyId, req.body, req.user);
  return new ApiResponse(201, template, 'Template created successfully').send(res);
});

const list = catchAsync(async (req, res) => {
  const templates = await templateService.list(req.agencyId, req.user);
  return new ApiResponse(200, templates, 'Templates retrieved successfully').send(res);
});

const getById = catchAsync(async (req, res) => {
  const template = await templateService.getById(req.params.templateId, req.agencyId);
  return new ApiResponse(200, template, 'Template retrieved successfully').send(res);
});

const update = catchAsync(async (req, res) => {
  const template = await templateService.update(req.params.templateId, req.agencyId, req.body, req.user);
  return new ApiResponse(200, template, 'Template updated successfully').send(res);
});

const remove = catchAsync(async (req, res) => {
  await templateService.delete(req.params.templateId, req.agencyId, req.user);
  return new ApiResponse(200, null, 'Template deleted successfully').send(res);
});

const generateLink = catchAsync(async (req, res) => {
  const { customerId, additionalVars } = req.body;
  const result = await templateService.generateWhatsAppLink(req.params.templateId, req.agencyId, customerId, additionalVars, req.user);
  return new ApiResponse(200, result, 'WhatsApp link generated').send(res);
});

module.exports = {
  create,
  list,
  getById,
  update,
  remove,
  generateLink
};
