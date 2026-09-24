const FollowUp = require('../models/FollowUp');
const Customer = require('../models/Customer');
const { NotFoundError, AuthorizationError } = require('../utils/apiError');
const { ROLES, FOLLOW_UP_STATUSES, ACTIVITY_TYPES } = require('../utils/constants');
const activityService = require('./activity.service');
const auditLogService = require('./auditLog.service');
const { parsePaginationParams, buildPaginationResponse } = require('../utils/pagination');

exports.create = async (agencyId, data, user) => {
  const customer = await Customer.findOne({ _id: data.customerId, agencyId, isDeleted: false });
  if (!customer) throw new NotFoundError('Customer not found');

  const followUpData = {
    ...data,
    agencyId,
    agentId: customer.assignedAgentId,
    createdBy: user.userId
  };

  const followUp = await FollowUp.create(followUpData);

  if (activityService && activityService.logActivity) {
    await activityService.logActivity(agencyId, ACTIVITY_TYPES.FOLLOW_UP_CREATED, {
      followUpId: followUp._id,
      customerId: followUp.customerId,
      performedBy: user.userId,
    });
  }

  return followUp;
};

exports.list = async (agencyId, filters, user) => {
  const query = { agencyId, isDeleted: false };

  if (user.role === ROLES.AGENT) {
    query.agentId = user.userId;
  } else if (filters.agentId) {
    query.agentId = filters.agentId;
  }

  if (filters.status) query.status = filters.status;
  if (filters.type) query.type = filters.type;
  if (filters.startDate || filters.endDate) {
    query.dueDate = {};
    if (filters.startDate) query.dueDate.$gte = new Date(filters.startDate);
    if (filters.endDate) query.dueDate.$lte = new Date(filters.endDate);
  }

  const { skip, limit, page } = parsePaginationParams(filters);
  const total = await FollowUp.countDocuments(query);
  const followUps = await FollowUp.find(query)
    .populate('customerId', 'name mobile')
    .sort({ dueDate: 1 })
    .skip(skip)
    .limit(limit);

  return buildPaginationResponse(followUps, total, page, limit);
};

exports.getById = async (followUpId, agencyId, user) => {
  const query = { _id: followUpId, agencyId, isDeleted: false };
  if (user.role === ROLES.AGENT) {
    query.agentId = user.userId;
  }
  
  const followUp = await FollowUp.findOne(query).populate('customerId', 'name mobile email');
  if (!followUp) throw new NotFoundError('Follow-up not found');
  return followUp;
};

exports.update = async (followUpId, agencyId, data, user) => {
  const query = { _id: followUpId, agencyId, isDeleted: false };
  if (user.role === ROLES.AGENT) {
    query.agentId = user.userId;
  }

  const followUp = await FollowUp.findOne(query);
  if (!followUp) throw new NotFoundError('Follow-up not found');

  const oldData = followUp.toObject();

  if (data.status) followUp.status = data.status;
  if (data.notes) followUp.notes = data.notes;
  if (data.dueDate) followUp.dueDate = data.dueDate;

  followUp.updatedBy = user.userId;
  await followUp.save();

  if (auditLogService && auditLogService.createLog) {
    await auditLogService.createLog(agencyId, 'FollowUp', followUpId, 'UPDATE', oldData, followUp.toObject(), user.userId);
  }

  if (data.status === 'COMPLETED' && oldData.status !== 'COMPLETED' && activityService && activityService.logActivity) {
    await activityService.logActivity(agencyId, ACTIVITY_TYPES.FOLLOW_UP_COMPLETED, {
      followUpId: followUp._id,
      customerId: followUp.customerId,
      performedBy: user.userId,
    });
  }

  return followUp;
};

exports.delete = async (followUpId, agencyId, user) => {
  const followUp = await FollowUp.findOne({ _id: followUpId, agencyId, isDeleted: false });
  if (!followUp) throw new NotFoundError('Follow-up not found');

  followUp.isDeleted = true;
  followUp.deletedAt = new Date();
  followUp.deletedBy = user.userId;
  await followUp.save();

  if (auditLogService && auditLogService.createLog) {
    await auditLogService.createLog(agencyId, 'FollowUp', followUpId, 'DELETE', followUp.toObject(), null, user.userId);
  }

  return true;
};
