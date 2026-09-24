const Activity = require('../models/Activity');
const Customer = require('../models/Customer');

const log = async (data) => {
  const activity = new Activity(data);
  await activity.save();
  return activity;
};

const getAgencyFeed = async (agencyId, filters, user, pagination) => {
  const query = { agencyId };

  if (filters.actionType) query.actionType = filters.actionType;
  if (filters.customerId) query.customerId = filters.customerId;
  if (filters.actorId) query.actorId = filters.actorId;
  
  if (filters.startDate || filters.endDate) {
    query.createdAt = {};
    if (filters.startDate) query.createdAt.$gte = new Date(filters.startDate);
    if (filters.endDate) query.createdAt.$lte = new Date(filters.endDate);
  }

  // Agent role sees only their customers' activities
  if (user.role === 'agent') {
    const agentCustomers = await Customer.find({ agencyId, assignedAgentId: user.userId }).select('_id');
    const customerIds = agentCustomers.map(c => c._id);
    // Include activities not linked to a customer but linked to the agent themselves
    query.$or = [
      { customerId: { $in: customerIds } },
      { actorId: user.userId }
    ];
  }

  const [data, total] = await Promise.all([
    Activity.find(query)
      .sort({ createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .populate('actorId', 'name email'),
    Activity.countDocuments(query)
  ]);

  return { data, total };
};

const getCustomerFeed = async (customerId, agencyId, filters, pagination) => {
  const query = { agencyId, customerId };

  if (filters.actionType) query.actionType = filters.actionType;
  
  if (filters.startDate || filters.endDate) {
    query.createdAt = {};
    if (filters.startDate) query.createdAt.$gte = new Date(filters.startDate);
    if (filters.endDate) query.createdAt.$lte = new Date(filters.endDate);
  }

  const [data, total] = await Promise.all([
    Activity.find(query)
      .sort({ createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .populate('actorId', 'name email'),
    Activity.countDocuments(query)
  ]);

  return { data, total };
};

module.exports = {
  log,
  getAgencyFeed,
  getCustomerFeed
};
