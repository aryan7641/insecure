const { catchAsync, ApiResponse } = require('../utils/apiResponse');
const insurancePolicyService = require('../services/insurancePolicy.service');

exports.create = catchAsync(async (req, res) => {
  const policy = await insurancePolicyService.create(req.agencyId, req.body, req.user);
  return new ApiResponse(201, 'Insurance policy created successfully', policy).send(res);
});

exports.list = catchAsync(async (req, res) => {
  const result = await insurancePolicyService.list(req.agencyId, req.query, req.user);
  return new ApiResponse(200, 'Policies retrieved successfully', result).send(res);
});

exports.getById = catchAsync(async (req, res) => {
  const policy = await insurancePolicyService.getById(req.params.policyId, req.agencyId);
  return new ApiResponse(200, 'Policy retrieved successfully', policy).send(res);
});

exports.update = catchAsync(async (req, res) => {
  const policy = await insurancePolicyService.update(req.params.policyId, req.agencyId, req.body, req.user);
  return new ApiResponse(200, 'Policy updated successfully', policy).send(res);
});

exports.renew = catchAsync(async (req, res) => {
  const result = await insurancePolicyService.renewPolicy(req.params.policyId, req.agencyId, req.body, req.user);
  return new ApiResponse(200, 'Policy renewed successfully', result).send(res);
});

exports.delete = catchAsync(async (req, res) => {
  await insurancePolicyService.softDelete(req.params.policyId, req.agencyId, req.user);
  return new ApiResponse(200, 'Policy deleted successfully').send(res);
});
