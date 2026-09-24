const Transaction = require('../models/Transaction');
const Customer = require('../models/Customer');
const MutualFund = require('../models/MutualFund');
const { NotFoundError } = require('../utils/apiError');
const mutualFundService = require('./mutualFund.service');
const activityService = require('./activity.service');
const auditLogService = require('./auditLog.service');

const create = async (agencyId, data, user) => {
  const customer = await Customer.findOne({ _id: data.customerId, agencyId, isDeleted: false });
  if (!customer) throw new NotFoundError('Customer not found');

  const fund = await MutualFund.findOne({ _id: data.mutualFundId, agencyId, isDeleted: false });
  if (!fund) throw new NotFoundError('Mutual fund not found');

  const transaction = await Transaction.create({
    ...data,
    agencyId,
    assignedAgentId: customer.assignedAgentId
  });

  await mutualFundService.recalculateHoldings(data.mutualFundId);
  await activityService.logActivity(agencyId, customer._id, 'TRANSACTION_CREATED', 'Transaction created', user.userId);
  
  return transaction;
};

const list = async (agencyId, filters, user, pagination = { limit: 10, skip: 0 }) => {
  const query = { agencyId, isDeleted: false };
  if (user.role === 'agent') query.assignedAgentId = user.userId;
  if (filters.customerId) query.customerId = filters.customerId;
  if (filters.mutualFundId) query.mutualFundId = filters.mutualFundId;
  if (filters.type) query.type = filters.type;
  
  if (filters.startDate || filters.endDate) {
    query.transactionDate = {};
    if (filters.startDate) query.transactionDate.$gte = new Date(filters.startDate);
    if (filters.endDate) query.transactionDate.$lte = new Date(filters.endDate);
  }

  const [data, total] = await Promise.all([
    Transaction.find(query)
      .sort({ transactionDate: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit),
    Transaction.countDocuments(query)
  ]);

  return { data, total, page: pagination.page, limit: pagination.limit };
};

const getById = async (txnId, agencyId) => {
  const transaction = await Transaction.findOne({ _id: txnId, agencyId, isDeleted: false })
    .populate('customerId', 'name')
    .populate('mutualFundId', 'amc schemeCode folioNumber');
    
  if (!transaction) throw new NotFoundError('Transaction not found');
  return transaction;
};

const update = async (txnId, agencyId, data, user) => {
  const transaction = await Transaction.findOne({ _id: txnId, agencyId, isDeleted: false });
  if (!transaction) throw new NotFoundError('Transaction not found');

  const oldData = transaction.toObject();
  Object.assign(transaction, data);
  await transaction.save();

  await mutualFundService.recalculateHoldings(transaction.mutualFundId);
  await auditLogService.logAction(user.userId, agencyId, 'UPDATE', 'Transaction', txnId, oldData, transaction.toObject());

  return transaction;
};

const softDelete = async (txnId, agencyId, user) => {
  const transaction = await Transaction.findOne({ _id: txnId, agencyId, isDeleted: false });
  if (!transaction) throw new NotFoundError('Transaction not found');

  transaction.isDeleted = true;
  await transaction.save();

  await mutualFundService.recalculateHoldings(transaction.mutualFundId);
  await auditLogService.logAction(user.userId, agencyId, 'DELETE', 'Transaction', txnId, { isDeleted: false }, { isDeleted: true });
};

module.exports = {
  create,
  list,
  getById,
  update,
  softDelete
};
