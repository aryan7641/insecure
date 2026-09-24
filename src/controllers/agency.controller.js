const { catchAsync, ApiResponse } = require('../utils/apiResponse');
const agencyService = require('../services/agency.service');

exports.createAgency = catchAsync(async (req, res) => {
  const agency = await agencyService.createAgency(req.body, req.user.userId);
  return ApiResponse.created(res, { agency }, 'Agency created successfully');
});

exports.getUserAgencies = catchAsync(async (req, res) => {
  const agencies = await agencyService.getUserAgencies(req.user.userId);
  return ApiResponse.success(res, { agencies }, 'Agencies retrieved successfully');
});

exports.getAgencyById = catchAsync(async (req, res) => {
  const { agencyId } = req.params;
  const agency = await agencyService.getAgencyById(agencyId, req.user.userId);
  return ApiResponse.success(res, { agency }, 'Agency retrieved successfully');
});

exports.updateAgency = catchAsync(async (req, res) => {
  const { agencyId } = req.params;
  const agency = await agencyService.updateAgency(agencyId, req.body);
  return ApiResponse.success(res, { agency }, 'Agency updated successfully');
});

exports.addAgent = catchAsync(async (req, res) => {
  const { agencyId } = req.params;
  const agent = await agencyService.addAgent(agencyId, req.body);
  return ApiResponse.success(res, { agent }, 'Agent added successfully');
});

exports.removeAgent = catchAsync(async (req, res) => {
  const { agencyId, userId } = req.params;
  await agencyService.removeAgent(agencyId, userId);
  return ApiResponse.success(res, null, 'Agent removed successfully');
});

exports.addAdmin = catchAsync(async (req, res) => {
  const { agencyId } = req.params;
  const admin = await agencyService.addAdmin(agencyId, req.body);
  return ApiResponse.success(res, { admin }, 'Admin added successfully');
});

exports.getAgencyMembers = catchAsync(async (req, res) => {
  const { agencyId } = req.params;
  const members = await agencyService.getAgencyMembers(agencyId);
  return ApiResponse.success(res, { members }, 'Agency members retrieved successfully');
});
