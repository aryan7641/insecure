const { catchAsync, ApiResponse } = require('../utils/apiResponse');
const mutualFundService = require('../services/mutualFund.service');
const { parsePaginationParams, buildPaginationResponse } = require('../utils/pagination');

const create = catchAsync(async (req, res) => {
  const fund = await mutualFundService.create(req.agencyId, req.body, req.user);
  return res.status(201).json(new ApiResponse(201, fund, 'Mutual fund investment created successfully'));
});

const list = catchAsync(async (req, res) => {
  const pagination = parsePaginationParams(req.query);
  const result = await mutualFundService.list(req.agencyId, req.query, req.user, pagination);
  return res.status(200).json(buildPaginationResponse(200, result, 'Mutual funds retrieved successfully'));
});

const getById = catchAsync(async (req, res) => {
  const result = await mutualFundService.getById(req.params.fundId, req.agencyId);
  return res.status(200).json(new ApiResponse(200, result, 'Mutual fund details retrieved successfully'));
});

const update = catchAsync(async (req, res) => {
  const fund = await mutualFundService.update(req.params.fundId, req.agencyId, req.body, req.user);
  return res.status(200).json(new ApiResponse(200, fund, 'Mutual fund updated successfully'));
});

const deleteFund = catchAsync(async (req, res) => {
  await mutualFundService.softDelete(req.params.fundId, req.agencyId, req.user);
  return res.status(200).json(new ApiResponse(200, null, 'Mutual fund deleted successfully'));
});

module.exports = {
  create,
  list,
  getById,
  update,
  delete: deleteFund
};
