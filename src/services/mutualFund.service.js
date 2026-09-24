const MutualFund = require('../models/MutualFund');
const Sip = require('../models/Sip');
const Transaction = require('../models/Transaction');
const Customer = require('../models/Customer');
const { NotFoundError, ConflictError } = require('../utils/apiError');
const activityService = require('./activity.service');
const auditLogService = require('./auditLog.service');
const navService = require('./nav.service');

const create = async (agencyId, data, user) => {
  const customer = await Customer.findOne({ _id: data.customerId, agencyId, isDeleted: false });
  if (!customer) {
    throw new NotFoundError('Customer not found');
  }
  
  const existingFund = await MutualFund.findOne({
    agencyId,
    folioNumber: data.folioNumber,
    schemeCode: data.schemeCode,
    isDeleted: false
  });
  if (existingFund) {
    throw new ConflictError('Mutual fund with this folio and scheme already exists');
  }

  const fund = await MutualFund.create({
    ...data,
    agencyId,
    assignedAgentId: customer.assignedAgentId
  });

  await activityService.logActivity(agencyId, customer._id, 'INVESTMENT_CREATED', 'Mutual fund investment created', user.userId);
  return fund;
};

const list = async (agencyId, filters, user, pagination = { limit: 10, skip: 0 }) => {
  const query = { agencyId, isDeleted: false };
  if (user.role === 'agent') {
    query.assignedAgentId = user.userId;
  }
  if (filters.customerId) query.customerId = filters.customerId;
  if (filters.amc) query.amc = new RegExp(filters.amc, 'i');
  if (filters.status) query.status = filters.status;
  if (filters.schemeCode) query.schemeCode = filters.schemeCode;

  const [data, total] = await Promise.all([
    MutualFund.find(query)
      .populate('customerId', 'name')
      .skip(pagination.skip)
      .limit(pagination.limit)
      .sort({ createdAt: -1 }),
    MutualFund.countDocuments(query)
  ]);

  return { data, total, page: pagination.page, limit: pagination.limit };
};

const getById = async (fundId, agencyId) => {
  const mutualFund = await MutualFund.findOne({ _id: fundId, agencyId, isDeleted: false }).populate('customerId', 'name');
  if (!mutualFund) throw new NotFoundError('Mutual fund not found');

  const transactions = await Transaction.find({ mutualFundId: fundId, isDeleted: false }).sort({ transactionDate: -1 });
  const sips = await Sip.find({ mutualFundId: fundId, isDeleted: false });

  return { mutualFund, transactions, sips };
};

const update = async (fundId, agencyId, data, user) => {
  const fund = await MutualFund.findOne({ _id: fundId, agencyId, isDeleted: false });
  if (!fund) throw new NotFoundError('Mutual fund not found');

  const oldData = fund.toObject();
  Object.assign(fund, data);
  await fund.save();

  await auditLogService.logAction(user.userId, agencyId, 'UPDATE', 'MutualFund', fundId, oldData, fund.toObject());
  await activityService.logActivity(agencyId, fund.customerId, 'INVESTMENT_UPDATED', 'Mutual fund investment updated', user.userId);

  return fund;
};

const softDelete = async (fundId, agencyId, user) => {
  const fund = await MutualFund.findOne({ _id: fundId, agencyId, isDeleted: false });
  if (!fund) throw new NotFoundError('Mutual fund not found');

  fund.isDeleted = true;
  await fund.save();

  await Sip.updateMany({ mutualFundId: fundId }, { isDeleted: true });
  await Transaction.updateMany({ mutualFundId: fundId }, { isDeleted: true });

  await auditLogService.logAction(user.userId, agencyId, 'DELETE', 'MutualFund', fundId, { isDeleted: false }, { isDeleted: true });
};

const recalculateHoldings = async (fundId) => {
  const fund = await MutualFund.findOne({ _id: fundId, isDeleted: false });
  if (!fund) return;

  const transactions = await Transaction.find({ mutualFundId: fundId, isDeleted: false, status: 'completed' });
  let units = 0;
  let investedAmount = 0;

  for (const txn of transactions) {
    if (['purchase', 'sip_purchase'].includes(txn.type)) {
      units += txn.units || 0;
      investedAmount += txn.amount || 0;
    } else if (['redemption', 'swp', 'switch_out'].includes(txn.type)) {
      units -= txn.units || 0;
      investedAmount -= txn.amount || 0;
    }
  }

  fund.investedAmount = investedAmount;
  fund.units = units;

  const latestNavData = await navService.getLatestNav(fund.schemeCode);
  if (latestNavData) {
    fund.currentValue = units * latestNavData.nav;
  }

  await fund.save();
};

module.exports = {
  create,
  list,
  getById,
  update,
  softDelete,
  recalculateHoldings
};
