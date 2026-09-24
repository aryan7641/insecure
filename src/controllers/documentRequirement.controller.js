const { catchAsync, ApiResponse } = require('../utils/apiResponse');
const documentRequirementService = require('../services/documentRequirement.service');

const create = catchAsync(async (req, res) => {
  const reqt = await documentRequirementService.create(req.agencyId, req.body, req.user);
  return new ApiResponse(201, reqt, 'Document requirement created successfully').send(res);
});

const list = catchAsync(async (req, res) => {
  const filters = { module: req.query.module };
  const reqts = await documentRequirementService.list(req.agencyId, filters);
  return new ApiResponse(200, reqts, 'Document requirements retrieved successfully').send(res);
});

const update = catchAsync(async (req, res) => {
  const reqt = await documentRequirementService.update(req.params.id, req.agencyId, req.body);
  return new ApiResponse(200, reqt, 'Document requirement updated successfully').send(res);
});

const remove = catchAsync(async (req, res) => {
  await documentRequirementService.delete(req.params.id, req.agencyId);
  return new ApiResponse(200, null, 'Document requirement deleted successfully').send(res);
});

module.exports = {
  create,
  list,
  update,
  remove
};
