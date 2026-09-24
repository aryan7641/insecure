const { catchAsync, ApiResponse } = require('../utils/apiResponse');
const sipService = require('../services/sip.service');
const { parsePaginationParams, buildPaginationResponse } = require('../utils/pagination');

const create = catchAsync(async (req, res) => {
  const sip = await sipService.create(req.agencyId, req.body, req.user);
  return res.status(201).json(new ApiResponse(201, sip, 'SIP created successfully'));
});

const list = catchAsync(async (req, res) => {
  const pagination = parsePaginationParams(req.query);
  const result = await sipService.list(req.agencyId, req.query, req.user, pagination);
  return res.status(200).json(buildPaginationResponse(200, result, 'SIPs retrieved successfully'));
});

const getById = catchAsync(async (req, res) => {
  const result = await sipService.getById(req.params.sipId, req.agencyId);
  return res.status(200).json(new ApiResponse(200, result, 'SIP details retrieved successfully'));
});

const update = catchAsync(async (req, res) => {
  const sip = await sipService.update(req.params.sipId, req.agencyId, req.body, req.user);
  return res.status(200).json(new ApiResponse(200, sip, 'SIP updated successfully'));
});

const deleteSip = catchAsync(async (req, res) => {
  await sipService.softDelete(req.params.sipId, req.agencyId, req.user);
  return res.status(200).json(new ApiResponse(200, null, 'SIP deleted successfully'));
});

module.exports = {
  create,
  list,
  getById,
  update,
  delete: deleteSip
};
