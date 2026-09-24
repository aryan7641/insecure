const { catchAsync, ApiResponse } = require('../utils/apiResponse');
const notificationService = require('../services/notification.service');
const { parsePaginationParams, buildPaginationResponse } = require('../utils/pagination');

const list = catchAsync(async (req, res) => {
  const { page, limit, skip } = parsePaginationParams(req.query);
  const filters = {
    isRead: req.query.isRead
  };

  const { data, total } = await notificationService.getUserNotifications(req.user.userId, req.agencyId, filters, { skip, limit });
  const pagination = buildPaginationResponse(total, page, limit);

  return new ApiResponse(200, { data, pagination }, 'Notifications retrieved successfully').send(res);
});

const markAsRead = catchAsync(async (req, res) => {
  const notification = await notificationService.markAsRead(req.params.id, req.user.userId);
  return new ApiResponse(200, notification, 'Notification marked as read').send(res);
});

const markAllAsRead = catchAsync(async (req, res) => {
  await notificationService.markAllAsRead(req.user.userId, req.agencyId);
  return new ApiResponse(200, null, 'All notifications marked as read').send(res);
});

const getUnreadCount = catchAsync(async (req, res) => {
  const count = await notificationService.getUnreadCount(req.user.userId, req.agencyId);
  return new ApiResponse(200, { count }, 'Unread count retrieved').send(res);
});

module.exports = {
  list,
  markAsRead,
  markAllAsRead,
  getUnreadCount
};
