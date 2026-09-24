const { catchAsync, ApiResponse } = require('../utils/apiResponse');
const followUpService = require('../services/followUp.service');

exports.create = catchAsync(async (req, res) => {
  const followUp = await followUpService.create(req.agencyId, req.body, req.user);
  return new ApiResponse(201, 'Follow-up created successfully', followUp).send(res);
});

exports.list = catchAsync(async (req, res) => {
  const result = await followUpService.list(req.agencyId, req.query, req.user);
  return new ApiResponse(200, 'Follow-ups retrieved successfully', result).send(res);
});

exports.getById = catchAsync(async (req, res) => {
  const followUp = await followUpService.getById(req.params.followUpId, req.agencyId, req.user);
  return new ApiResponse(200, 'Follow-up retrieved successfully', followUp).send(res);
});

exports.update = catchAsync(async (req, res) => {
  const followUp = await followUpService.update(req.params.followUpId, req.agencyId, req.body, req.user);
  return new ApiResponse(200, 'Follow-up updated successfully', followUp).send(res);
});

exports.delete = catchAsync(async (req, res) => {
  await followUpService.delete(req.params.followUpId, req.agencyId, req.user);
  return new ApiResponse(200, 'Follow-up deleted successfully').send(res);
});
