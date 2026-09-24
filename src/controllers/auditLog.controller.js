const { catchAsync, ApiResponse } = require('../utils/apiResponse');
const auditLogService = require('../services/auditLog.service');
const { parsePaginationParams, buildPaginationResponse } = require('../utils/pagination');

const queryAuditLogs = catchAsync(async (req, res) => {
  const { page, limit, skip } = parsePaginationParams(req.query);
  const filters = {
    actorId: req.query.actorId,
    resourceType: req.query.resourceType,
    resourceId: req.query.resourceId,
    action: req.query.action,
    startDate: req.query.startDate,
    endDate: req.query.endDate
  };

  const { data, total } = await auditLogService.query(req.agencyId, filters, { skip, limit });
  const pagination = buildPaginationResponse(total, page, limit);

  return new ApiResponse(200, { data, pagination }, 'Audit logs retrieved successfully').send(res);
});

module.exports = {
  queryAuditLogs
};
