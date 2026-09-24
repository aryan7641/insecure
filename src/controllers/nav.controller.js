const { catchAsync, ApiResponse } = require('../utils/apiResponse');
const navService = require('../services/nav.service');
const { parsePaginationParams, buildPaginationResponse } = require('../utils/pagination');
const { ValidationError } = require('../utils/apiError');

const importNav = catchAsync(async (req, res) => {
  if (!req.file) {
    throw new ValidationError('File is required for NAV import');
  }
  const summary = await navService.importNav(req.file.buffer, req.file.originalname, req.user);
  return res.status(200).json(new ApiResponse(200, summary, 'NAV data imported successfully'));
});

const queryNav = catchAsync(async (req, res) => {
  const pagination = parsePaginationParams(req.query);
  const result = await navService.queryNav(req.query, pagination);
  return res.status(200).json(buildPaginationResponse(200, result, 'NAV data retrieved successfully'));
});

const importHistory = catchAsync(async (req, res) => {
  const history = await navService.importHistory();
  return res.status(200).json(new ApiResponse(200, history, 'NAV import history retrieved successfully'));
});

module.exports = {
  importNav,
  queryNav,
  importHistory
};
