const Customer = require('../models/Customer');
const InsurancePolicy = require('../models/InsurancePolicy');
const FollowUp = require('../models/FollowUp');
const MutualFund = require('../models/MutualFund');
const Sip = require('../models/Sip');
const Transaction = require('../models/Transaction');
const Document = require('../models/Document');
const { NotFoundError, ConflictError, AuthorizationError, ValidationError } = require('../utils/apiError');
const { ROLES, POLICY_STATUSES, FOLLOW_UP_STATUSES, FOLLOW_UP_TYPES, ACTIVITY_TYPES } = require('../utils/constants');
const activityService = require('./activity.service');
const auditLogService = require('./auditLog.service');
const { parsePaginationParams, buildPaginationResponse } = require('../utils/pagination');

exports.create = async (agencyId, data, user) => {
  if (data.mobile) {
    const existing = await Customer.findOne({ agencyId, mobile: data.mobile.trim(), isDeleted: false });
    if (existing) {
      throw new ConflictError('Customer with this mobile number already exists', { duplicateId: existing._id });
    }
  }

  let addressObj = {};
  if (typeof data.address === 'string') {
    addressObj = { street: data.address, city: '', state: '', pincode: '', country: 'India' };
  } else if (data.address && typeof data.address === 'object') {
    addressObj = data.address;
  }

  let nomineeObj = data.nominee;
  if (!nomineeObj && Array.isArray(data.nominees) && data.nominees.length > 0) {
    nomineeObj = {
      name: data.nominees[0].name,
      relation: data.nominees[0].relation,
      contact: data.nominees[0].contact
    };
  }

  const customerData = {
    ...data,
    agencyId,
    createdBy: user.userId,
    assignedAgentId: data.assignedAgentId || user.userId,
    address: addressObj,
    nominee: nomineeObj,
    income: Number(data.annualIncome || data.income || 0) || 0
  };

  const customer = await Customer.create(customerData);

  if (activityService && activityService.logActivity) {
    await activityService.logActivity(agencyId, ACTIVITY_TYPES.CUSTOMER_CREATED, {
      customerId: customer._id,
      performedBy: user.userId,
    });
  }

  return customer;
};

exports.list = async (agencyId, filters = {}, user) => {
  const query = { agencyId, isDeleted: false };

  if (user && user.role === ROLES.AGENT) {
    query.assignedAgentId = user.userId;
  } else if (filters.assignedAgentId && filters.assignedAgentId !== 'ALL') {
    query.assignedAgentId = filters.assignedAgentId;
  }

  if (filters.search) {
    const searchRegex = new RegExp(filters.search, 'i');
    query.$or = [
      { name: searchRegex },
      { mobile: searchRegex },
      { email: searchRegex },
      { pan: searchRegex }
    ];
  }

  const { skip, limit, page } = parsePaginationParams(filters);
  const total = await Customer.countDocuments(query);
  const rawCustomers = await Customer.find(query)
    .populate('assignedAgentId', 'name email')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const customers = rawCustomers.map(c => {
    const obj = c.toJSON ? c.toJSON() : c.toObject();
    return {
      ...obj,
      assignedAgentName: c.assignedAgentId ? c.assignedAgentId.name : 'Unassigned',
      insuranceSummary: obj.insuranceSummary || { activePolicies: 0, totalPremium: 0 },
      mfSummary: obj.mfSummary || { currentPortfolioValue: 0, totalInvested: 0 }
    };
  });

  return buildPaginationResponse(customers, total, page, limit);
};

exports.getById = async (customerId, agencyId) => {
  const customer = await Customer.findOne({ _id: customerId, agencyId, isDeleted: false })
    .populate('assignedAgentId', 'name email');
  if (!customer) throw new NotFoundError('Customer not found');
  return customer;
};

exports.update = async (customerId, agencyId, data, user) => {
  const customer = await Customer.findOne({ _id: customerId, agencyId, isDeleted: false });
  if (!customer) throw new NotFoundError('Customer not found');

  if (data.mobile && data.mobile !== customer.mobile) {
    const existing = await Customer.findOne({ agencyId, mobile: data.mobile, isDeleted: false });
    if (existing) throw new ConflictError('Customer with this mobile number already exists');
  }

  const oldData = customer.toObject();
  Object.assign(customer, data);
  customer.updatedBy = user.userId;
  await customer.save();

  if (auditLogService && auditLogService.createLog) {
    await auditLogService.createLog(agencyId, 'Customer', customerId, 'UPDATE', oldData, customer.toObject(), user.userId);
  }

  if (activityService && activityService.logActivity) {
    await activityService.logActivity(agencyId, ACTIVITY_TYPES.CUSTOMER_UPDATED, {
      customerId: customer._id,
      performedBy: user.userId,
    });
  }

  return customer;
};

exports.softDelete = async (customerId, agencyId, user) => {
  const customer = await Customer.findOne({ _id: customerId, agencyId, isDeleted: false });
  if (!customer) throw new NotFoundError('Customer not found');

  customer.isDeleted = true;
  customer.deletedAt = new Date();
  customer.deletedBy = user.userId;
  await customer.save();

  if (InsurancePolicy) await InsurancePolicy.updateMany({ customerId }, { $set: { isDeleted: true, deletedAt: new Date(), deletedBy: user.userId } });
  if (MutualFund) await MutualFund.updateMany({ customerId }, { $set: { isDeleted: true, deletedAt: new Date(), deletedBy: user.userId } });
  if (Sip) await Sip.updateMany({ customerId }, { $set: { isDeleted: true, deletedAt: new Date(), deletedBy: user.userId } });
  if (FollowUp) await FollowUp.updateMany({ customerId }, { $set: { isDeleted: true, deletedAt: new Date(), deletedBy: user.userId } });
  if (Document) await Document.updateMany({ customerId }, { $set: { isDeleted: true, deletedAt: new Date(), deletedBy: user.userId } });

  if (auditLogService && auditLogService.createLog) {
    await auditLogService.createLog(agencyId, 'Customer', customerId, 'DELETE', customer.toObject(), null, user.userId);
  }

  if (activityService && activityService.logActivity) {
    await activityService.logActivity(agencyId, ACTIVITY_TYPES.CUSTOMER_DELETED, {
      customerId: customer._id,
      performedBy: user.userId,
    });
  }

  return true;
};

exports.assignAgent = async (customerId, agencyId, agentId, user) => {
  const customer = await Customer.findOne({ _id: customerId, agencyId, isDeleted: false });
  if (!customer) throw new NotFoundError('Customer not found');

  const previousAgentId = customer.assignedAgentId;
  customer.assignedAgentId = agentId;
  customer.updatedBy = user.userId;
  await customer.save();

  if (InsurancePolicy) await InsurancePolicy.updateMany({ customerId }, { $set: { assignedAgentId: agentId } });
  if (MutualFund) await MutualFund.updateMany({ customerId }, { $set: { assignedAgentId: agentId } });
  if (Sip) await Sip.updateMany({ customerId }, { $set: { assignedAgentId: agentId } });

  if (auditLogService && auditLogService.createLog) {
    await auditLogService.createLog(agencyId, 'Customer', customerId, 'UPDATE', { assignedAgentId: previousAgentId }, { assignedAgentId: agentId }, user.userId);
  }

  if (activityService && activityService.logActivity) {
    await activityService.logActivity(agencyId, ACTIVITY_TYPES.CUSTOMER_REASSIGNED, {
      customerId: customer._id,
      performedBy: user.userId,
      metadata: { previousAgent: previousAgentId, newAgent: agentId }
    });
  }

  return customer;
};

exports.mergeCustomers = async (agencyId, sourceId, targetId, user) => {
  const source = await Customer.findOne({ _id: sourceId, agencyId, isDeleted: false });
  const target = await Customer.findOne({ _id: targetId, agencyId, isDeleted: false });

  if (!source || !target) throw new NotFoundError('Source or target customer not found');

  const sourceData = source.toObject();
  const targetData = target.toObject();

  const mergedData = { ...targetData };
  for (const key in sourceData) {
    if (!mergedData[key] && sourceData[key]) {
      mergedData[key] = sourceData[key];
    }
  }

  Object.assign(target, mergedData);
  target.updatedBy = user.userId;
  await target.save();

  if (InsurancePolicy) await InsurancePolicy.updateMany({ customerId: sourceId }, { $set: { customerId: targetId } });
  if (MutualFund) await MutualFund.updateMany({ customerId: sourceId }, { $set: { customerId: targetId } });
  if (Sip) await Sip.updateMany({ customerId: sourceId }, { $set: { customerId: targetId } });
  if (Transaction) await Transaction.updateMany({ customerId: sourceId }, { $set: { customerId: targetId } });
  if (Document) await Document.updateMany({ customerId: sourceId }, { $set: { customerId: targetId } });
  if (FollowUp) await FollowUp.updateMany({ customerId: sourceId }, { $set: { customerId: targetId } });

  source.isDeleted = true;
  source.deletedAt = new Date();
  source.deletedBy = user.userId;
  await source.save();

  if (auditLogService && auditLogService.createLog) {
    await auditLogService.createLog(agencyId, 'Customer', targetId, 'MERGE', { sourceId }, target.toObject(), user.userId);
  }

  if (activityService && activityService.logActivity) {
    await activityService.logActivity(agencyId, ACTIVITY_TYPES.CUSTOMER_MERGED, {
      customerId: targetId,
      performedBy: user.userId,
      metadata: { sourceId }
    });
  }

  return target;
};

exports.getCustomerAnalytics = async (customerId, agencyId) => {
  const analytics = {
    insurance: { totalCount: 0, premiumTotal: 0 },
    mutualFunds: { investedAmount: 0, currentValue: 0, gainLoss: 0 },
    sips: { totalSipAmount: 0 }
  };

  if (InsurancePolicy) {
    const policies = await InsurancePolicy.find({ customerId, agencyId, isDeleted: false });
    analytics.insurance.totalCount = policies.length;
    analytics.insurance.premiumTotal = policies.reduce((sum, p) => sum + (p.premiumAmount || 0), 0);
  }

  if (MutualFund) {
    const mfs = await MutualFund.find({ customerId, agencyId, isDeleted: false });
    analytics.mutualFunds.investedAmount = mfs.reduce((sum, mf) => sum + (mf.investedAmount || 0), 0);
    analytics.mutualFunds.currentValue = mfs.reduce((sum, mf) => sum + (mf.currentValue || 0), 0);
    analytics.mutualFunds.gainLoss = analytics.mutualFunds.currentValue - analytics.mutualFunds.investedAmount;
  }
  
  if (Sip) {
    const sips = await Sip.find({ customerId, agencyId, isDeleted: false, status: 'ACTIVE' });
    analytics.sips.totalSipAmount = sips.reduce((sum, sip) => sum + (sip.amount || 0), 0);
  }

  return analytics;
};

exports.getDocumentStatus = async (customerId, agencyId) => {
  const required = ['ID_PROOF', 'ADDRESS_PROOF', 'PAN_CARD'];
  let uploaded = [];
  if (Document) {
    const docs = await Document.find({ customerId, agencyId, isDeleted: false });
    uploaded = docs.map(d => d.type);
  }

  const pending = required.filter(r => !uploaded.includes(r));

  return {
    required,
    uploaded,
    pending
  };
};
