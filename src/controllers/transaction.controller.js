const { catchAsync, ApiResponse } = require('../utils/apiResponse');
const transactionService = require('../services/transaction.service');
const { parsePaginationParams, buildPaginationResponse } = require('../utils/pagination');

const create = catchAsync(async (req, res) => {
  const transaction = await transactionService.create(req.agencyId, req.body, req.user);
  return res.status(201).json(new ApiResponse(201, transaction, 'Transaction created successfully'));
});

const list = catchAsync(async (req, res) => {
  const pagination = parsePaginationParams(req.query);
  const result = await transactionService.list(req.agencyId, req.query, req.user, pagination);
  return res.status(200).json(buildPaginationResponse(200, result, 'Transactions retrieved successfully'));
});

const getById = catchAsync(async (req, res) => {
  const result = await transactionService.getById(req.params.txnId, req.agencyId);
  return res.status(200).json(new ApiResponse(200, result, 'Transaction retrieved successfully'));
});

const update = catchAsync(async (req, res) => {
  const transaction = await transactionService.update(req.params.txnId, req.agencyId, req.body, req.user);
  return res.status(200).json(new ApiResponse(200, transaction, 'Transaction updated successfully'));
});

const deleteTxn = catchAsync(async (req, res) => {
  await transactionService.softDelete(req.params.txnId, req.agencyId, req.user);
  return res.status(200).json(new ApiResponse(200, null, 'Transaction deleted successfully'));
});

module.exports = {
  create,
  list,
  getById,
  update,
  delete: deleteTxn
};
