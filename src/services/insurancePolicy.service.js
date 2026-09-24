const InsurancePolicy = require('../models/InsurancePolicy');
const Customer = require('../models/Customer');
const { NotFoundError, ConflictError, AuthorizationError, ValidationError } = require('../utils/apiError');
const { ROLES, POLICY_STATUSES, ACTIVITY_TYPES } = require('../utils/constants');
const activityService = require('./activity.service');
const auditLogService = require('./auditLog.service');
const { parsePaginationParams, buildPaginationResponse } = require('../utils/pagination');

exports.create = async (agencyId, data, user) => {
  const customer = await Customer.findOne({ _id: data.customerId, agencyId, isDeleted: false });
  if (!customer) {
    throw new NotFoundError('Customer not found');
  }

  if (data.policyNumber) {
    const existing = await InsurancePolicy.findOne({ agencyId, policyNumber: data.policyNumber, isDeleted: false });
    if (existing) throw new ConflictError('Policy with this number already exists');
  }

  const policyData = {
    ...data,
    agencyId,
    assignedAgentId: customer.assignedAgentId,
    createdBy: user.userId
  };

  const policy = await InsurancePolicy.create(policyData);

  if (activityService && activityService.logActivity) {
    await activityService.logActivity(agencyId, ACTIVITY_TYPES.POLICY_CREATED, {
      policyId: policy._id,
      customerId: policy.customerId,
      performedBy: user.userId,
    });
  }

  return policy;
};

exports.list = async (agencyId, filters, user) => {
  const query = { agencyId, isDeleted: false };

  if (user.role === ROLES.AGENT) {
    query.assignedAgentId = user.userId;
  }

  if (filters.customerId) query.customerId = filters.customerId;
  if (filters.status) query.status = filters.status;
  if (filters.policyType) query.policyType = filters.policyType;
  if (filters.insuranceCompany) query.insuranceCompany = filters.insuranceCompany;

  const { skip, limit, page } = parsePaginationParams(filters);
  const total = await InsurancePolicy.countDocuments(query);
  const policies = await InsurancePolicy.find(query)
    .populate('customerId', 'name mobile')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  return buildPaginationResponse(policies, total, page, limit);
};

exports.getById = async (policyId, agencyId) => {
  const policy = await InsurancePolicy.findOne({ _id: policyId, agencyId, isDeleted: false })
    .populate('customerId', 'name mobile email');
  if (!policy) throw new NotFoundError('Policy not found');
  return policy;
};

exports.update = async (policyId, agencyId, data, user) => {
  const policy = await InsurancePolicy.findOne({ _id: policyId, agencyId, isDeleted: false });
  if (!policy) throw new NotFoundError('Policy not found');

  const oldData = policy.toObject();
  
  Object.assign(policy, data);
  policy.updatedBy = user.userId;
  await policy.save();

  if (auditLogService && auditLogService.createLog) {
    await auditLogService.createLog(agencyId, 'InsurancePolicy', policyId, 'UPDATE', oldData, policy.toObject(), user.userId);
  }

  if (activityService && activityService.logActivity) {
    await activityService.logActivity(agencyId, ACTIVITY_TYPES.POLICY_UPDATED, {
      policyId: policy._id,
      customerId: policy.customerId,
      performedBy: user.userId,
    });
  }

  return policy;
};

exports.softDelete = async (policyId, agencyId, user) => {
  const policy = await InsurancePolicy.findOne({ _id: policyId, agencyId, isDeleted: false });
  if (!policy) throw new NotFoundError('Policy not found');

  policy.isDeleted = true;
  policy.deletedAt = new Date();
  policy.deletedBy = user.userId;
  await policy.save();

  if (auditLogService && auditLogService.createLog) {
    await auditLogService.createLog(agencyId, 'InsurancePolicy', policyId, 'DELETE', policy.toObject(), null, user.userId);
  }

  if (activityService && activityService.logActivity) {
    await activityService.logActivity(agencyId, ACTIVITY_TYPES.POLICY_DELETED, {
      policyId: policy._id,
      customerId: policy.customerId,
      performedBy: user.userId,
    });
  }

  return true;
};
