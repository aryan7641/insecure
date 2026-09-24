const AuditLog = require('../models/AuditLog');

const create = async (data) => {
  const log = new AuditLog(data);
  await log.save();
  return log;
};

const query = async (agencyId, filters, pagination) => {
  const query = { agencyId };

  if (filters.actorId) query.actorId = filters.actorId;
  if (filters.resourceType) query.resourceType = filters.resourceType;
  if (filters.resourceId) query.resourceId = filters.resourceId;
  if (filters.action) query.action = filters.action;

  if (filters.startDate || filters.endDate) {
    query.createdAt = {};
    if (filters.startDate) query.createdAt.$gte = new Date(filters.startDate);
    if (filters.endDate) query.createdAt.$lte = new Date(filters.endDate);
  }

  const [data, total] = await Promise.all([
    AuditLog.find(query)
      .sort({ createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .populate('actorId', 'name email'),
    AuditLog.countDocuments(query)
  ]);

  return { data, total };
};

module.exports = {
  create,
  query
};
