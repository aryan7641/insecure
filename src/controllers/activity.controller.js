const { catchAsync, ApiResponse } = require('../utils/apiResponse');
const activityService = require('../services/activity.service');
const { parsePaginationParams, buildPaginationResponse } = require('../utils/pagination');

const getAgencyFeed = catchAsync(async (req, res) => {
  const { page, limit, skip } = parsePaginationParams(req.query);
  const filters = {
    actionType: req.query.actionType,
    customerId: req.query.customerId,
    actorId: req.query.actorId,
    startDate: req.query.startDate,
    endDate: req.query.endDate
  };

  const { data, total } = await activityService.getAgencyFeed(req.agencyId, filters, req.user, { skip, limit });
  const pagination = buildPaginationResponse(total, page, limit);

  return new ApiResponse(200, { data, pagination }, 'Agency feed retrieved successfully').send(res);
});

module.exports = {
  getAgencyFeed
};
