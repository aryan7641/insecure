const { catchAsync, ApiResponse } = require('../utils/apiResponse');
const customerService = require('../services/customer.service');
const duplicateDetectionService = require('../services/duplicateDetection.service');

exports.create = catchAsync(async (req, res) => {
  const customer = await customerService.create(req.agencyId, req.body, req.user);
  return new ApiResponse(201, 'Customer created successfully', customer).send(res);
});

exports.list = catchAsync(async (req, res) => {
  const result = await customerService.list(req.agencyId, req.query, req.user);
  return new ApiResponse(200, 'Customers retrieved successfully', result).send(res);
});

exports.getById = catchAsync(async (req, res) => {
  const customer = await customerService.getById(req.params.customerId, req.agencyId);
  return new ApiResponse(200, 'Customer retrieved successfully', customer).send(res);
});

exports.update = catchAsync(async (req, res) => {
  const customer = await customerService.update(req.params.customerId, req.agencyId, req.body, req.user);
  return new ApiResponse(200, 'Customer updated successfully', customer).send(res);
});

exports.delete = catchAsync(async (req, res) => {
  await customerService.softDelete(req.params.customerId, req.agencyId, req.user);
  return new ApiResponse(200, 'Customer deleted successfully').send(res);
});

exports.assign = catchAsync(async (req, res) => {
  const customer = await customerService.assignAgent(req.params.customerId, req.agencyId, req.body.agentId, req.user);
  return new ApiResponse(200, 'Agent assigned successfully', customer).send(res);
});

exports.checkDuplicate = catchAsync(async (req, res) => {
  const matches = await duplicateDetectionService.findDuplicates(req.agencyId, req.query);
  return new ApiResponse(200, 'Duplicate check completed', matches).send(res);
});

exports.merge = catchAsync(async (req, res) => {
  const customer = await customerService.mergeCustomers(req.agencyId, req.body.sourceId, req.body.targetId, req.user);
  return new ApiResponse(200, 'Customers merged successfully', customer).send(res);
});

exports.getAnalytics = catchAsync(async (req, res) => {
  const analytics = await customerService.getCustomerAnalytics(req.params.customerId, req.agencyId);
  return new ApiResponse(200, 'Customer analytics retrieved successfully', analytics).send(res);
});

exports.getDocumentStatus = catchAsync(async (req, res) => {
  const status = await customerService.getDocumentStatus(req.params.customerId, req.agencyId);
  return new ApiResponse(200, 'Document status retrieved successfully', status).send(res);
});
