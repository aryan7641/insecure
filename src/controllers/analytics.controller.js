const { catchAsync, ApiResponse } = require('../utils/apiResponse');
const analyticsService = require('../services/analytics.service');

const getDashboard = catchAsync(async (req, res) => {
  const data = await analyticsService.getDashboard(req.agencyId);
  return new ApiResponse(200, data, 'Dashboard data retrieved successfully').send(res);
});

const getInsuranceAnalytics = catchAsync(async (req, res) => {
  const data = await analyticsService.getInsuranceAnalytics(req.agencyId);
  return new ApiResponse(200, data, 'Insurance analytics retrieved successfully').send(res);
});

const getMutualFundAnalytics = catchAsync(async (req, res) => {
  const data = await analyticsService.getMutualFundAnalytics(req.agencyId);
  return new ApiResponse(200, data, 'Mutual fund analytics retrieved successfully').send(res);
});

const getCrmAnalytics = catchAsync(async (req, res) => {
  const data = await analyticsService.getCrmAnalytics(req.agencyId);
  return new ApiResponse(200, data, 'CRM analytics retrieved successfully').send(res);
});

module.exports = {
  getDashboard,
  getInsuranceAnalytics,
  getMutualFundAnalytics,
  getCrmAnalytics
};
