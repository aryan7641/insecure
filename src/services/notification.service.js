const Notification = require('../models/Notification');
const { NotFoundError, AuthorizationError } = require('../utils/apiError');

const create = async (data) => {
  const notification = new Notification(data);
  await notification.save();
  return notification;
};

const getUserNotifications = async (userId, agencyId, filters, pagination) => {
  const query = { userId, agencyId };

  if (filters.isRead !== undefined) {
    query.isRead = filters.isRead === 'true';
  }

  const [data, total] = await Promise.all([
    Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit),
    Notification.countDocuments(query)
  ]);

  return { data, total };
};

const markAsRead = async (notificationId, userId) => {
  const notification = await Notification.findById(notificationId);
  if (!notification) throw new NotFoundError('Notification not found');
  
  if (notification.userId.toString() !== userId.toString()) {
    throw new AuthorizationError('You are not authorized to update this notification');
  }

  notification.isRead = true;
  await notification.save();
  return notification;
};

const markAllAsRead = async (userId, agencyId) => {
  await Notification.updateMany({ userId, agencyId, isRead: false }, { isRead: true });
};

const getUnreadCount = async (userId, agencyId) => {
  return await Notification.countDocuments({ userId, agencyId, isRead: false });
};

module.exports = {
  create,
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount
};
