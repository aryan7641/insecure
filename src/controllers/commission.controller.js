const { catchAsync, ApiResponse } = require('../utils/apiResponse');
const commissionService = require('../services/commission.service');

const getByPolicyId = catchAsync(async (req, res) => {
  const result = await commissionService.getByPolicyId(req.agencyId, req.params.policyId, req.user);
  return new ApiResponse(200, 'Commission details retrieved successfully', result).send(res);
});

const upsertCommission = catchAsync(async (req, res) => {
  const commission = await commissionService.upsertCommission(req.agencyId, req.params.policyId, req.body, req.user);
  return new ApiResponse(200, 'Commission details saved successfully', commission).send(res);
});

const deleteCommission = catchAsync(async (req, res) => {
  const result = await commissionService.deleteCommission(req.agencyId, req.params.policyId, req.user);
  return new ApiResponse(200, 'Commission deleted successfully', result).send(res);
});

const list = catchAsync(async (req, res) => {
  const result = await commissionService.listCommissions(req.agencyId, req.query, req.user);
  return new ApiResponse(200, 'Commissions retrieved successfully', result).send(res);
});

module.exports = {
  getByPolicyId,
  upsertCommission,
  deleteCommission,
  list
};
