const Sip = require('../models/Sip');
const Customer = require('../models/Customer');
const MutualFund = require('../models/MutualFund');
const { NotFoundError } = require('../utils/apiError');
const activityService = require('./activity.service');
const auditLogService = require('./auditLog.service');

const create = async (agencyId, data, user) => {
  const customer = await Customer.findOne({ _id: data.customerId, agencyId, isDeleted: false });
  if (!customer) {
    throw new NotFoundError('Customer not found');
  }

  if (data.mutualFundId) {
    const fund = await MutualFund.findOne({ _id: data.mutualFundId, agencyId, isDeleted: false });
    if (!fund) {
      throw new NotFoundError('Mutual fund not found');
    }
  }

  const sip = await Sip.create({
    ...data,
    agencyId,
    assignedAgentId: customer.assignedAgentId
  });

  await activityService.logActivity(agencyId, customer._id, 'SIP_CREATED', 'SIP created', user.userId);
  return sip;
};

const list = async (agencyId, filters, user, pagination = { limit: 10, skip: 0 }) => {
  const query = { agencyId, isDeleted: false };
  if (user.role === 'agent') {
    query.assignedAgentId = user.userId;
  }
  if (filters.customerId) query.customerId = filters.customerId;
  if (filters.status) query.status = filters.status;
  if (filters.mutualFundId) query.mutualFundId = filters.mutualFundId;

  const [data, total] = await Promise.all([
    Sip.find(query)
      .populate('customerId', 'name')
      .skip(pagination.skip)
      .limit(pagination.limit)
      .sort({ createdAt: -1 }),
    Sip.countDocuments(query)
  ]);

  return { data, total, page: pagination.page, limit: pagination.limit };
};

const getById = async (sipId, agencyId) => {
  const sip = await Sip.findOne({ _id: sipId, agencyId, isDeleted: false })
    .populate('customerId', 'name')
    .populate('mutualFundId', 'schemeCode amc');
    
  if (!sip) throw new NotFoundError('SIP not found');
  return sip;
};

const update = async (sipId, agencyId, data, user) => {
  const sip = await Sip.findOne({ _id: sipId, agencyId, isDeleted: false });
  if (!sip) throw new NotFoundError('SIP not found');

  const oldData = sip.toObject();
  Object.assign(sip, data);
  await sip.save();

  await auditLogService.logAction(user.userId, agencyId, 'UPDATE', 'Sip', sipId, oldData, sip.toObject());
  await activityService.logActivity(agencyId, sip.customerId, 'ACTIVITY', 'SIP updated', user.userId);

  return sip;
};

const softDelete = async (sipId, agencyId, user) => {
  const sip = await Sip.findOne({ _id: sipId, agencyId, isDeleted: false });
  if (!sip) throw new NotFoundError('SIP not found');

  sip.isDeleted = true;
  await sip.save();

  await auditLogService.logAction(user.userId, agencyId, 'DELETE', 'Sip', sipId, { isDeleted: false }, { isDeleted: true });
};

module.exports = {
  create,
  list,
  getById,
  update,
  softDelete
};
