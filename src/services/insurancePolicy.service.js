const InsurancePolicy = require('../models/InsurancePolicy');
const Customer = require('../models/Customer');
const FollowUp = require('../models/FollowUp');
const { getSubtypeSchema } = require('../schemas/insuranceSubtypeSchemas');
const { normalizePolicyPayload } = require('./insuranceSchema.service');
const { NotFoundError, ConflictError, AuthorizationError, ValidationError } = require('../utils/apiError');
const { ROLES, POLICY_STATUSES, ACTIVITY_TYPES, FOLLOW_UP_TYPES, FOLLOW_UP_STATUSES } = require('../utils/constants');
const activityService = require('./activity.service');
const auditLogService = require('./auditLog.service');
const { parsePaginationParams, buildPaginationResponse } = require('../utils/pagination');

exports.create = async (agencyId, data, user) => {
  const customer = await Customer.findOne({ _id: data.customerId, agencyId, isDeleted: false });
  if (!customer) {
    throw new NotFoundError('Customer not found');
  }

  const subtype = data.insuranceSubtype || data.subtype || 'individual_health';
  const schema = getSubtypeSchema(subtype);
  const type = schema ? schema.type : (data.insuranceType || data.policyType || 'health');

  if (data.policyNumber) {
    const existing = await InsurancePolicy.findOne({ agencyId, policyNumber: data.policyNumber.trim(), isDeleted: false });
    if (existing) throw new ConflictError(`Policy with number ${data.policyNumber} already exists`);
  }

  const policyData = {
    ...data,
    agencyId,
    customerId: customer._id,
    assignedAgentId: customer.assignedAgentId || user.userId,
    insuranceType: type,
    insuranceSubtype: subtype,
    policyType: type,
    lob: type.toUpperCase(),
    subLob: schema ? schema.name : 'General',
    premium: Number(data.premium || data.finalPremium || 0),
    insuredMembers: Array.isArray(data.insuredMembers) ? data.insuredMembers : [],
    vehicleDetails: data.vehicleDetails || undefined,
    healthDetails: data.healthDetails || undefined,
    lifeDetails: data.lifeDetails || undefined,
    travelDetails: data.travelDetails || undefined,
    propertyDetails: data.propertyDetails || undefined,
    createdBy: user.userId
  };

  const policy = await InsurancePolicy.create(policyData);

  // If this policy is renewing an older policy, link them
  if (data.renewedFromPolicyId) {
    await InsurancePolicy.findOneAndUpdate(
      { _id: data.renewedFromPolicyId, agencyId },
      { $set: { status: POLICY_STATUSES.RENEWED, renewedToPolicyId: policy._id } }
    );
  }

  // Schedule renewal reminders
  if (policy.renewalDate) {
    await scheduleRenewalFollowups(agencyId, customer, policy, user);
  }

  if (activityService && activityService.logActivity) {
    await activityService.logActivity(agencyId, ACTIVITY_TYPES.POLICY_CREATED, {
      policyId: policy._id,
      customerId: policy.customerId,
      performedBy: user.userId,
    });
  }

  return policy;
};

exports.list = async (agencyId, filters = {}, user) => {
  const query = { agencyId, isDeleted: false };

  if (user.role === ROLES.AGENT) {
    query.assignedAgentId = user.userId;
  } else if (filters.assignedAgentId && filters.assignedAgentId !== 'ALL') {
    query.assignedAgentId = filters.assignedAgentId;
  }

  if (filters.customerId) query.customerId = filters.customerId;
  if (filters.status && filters.status !== 'ALL') query.status = filters.status;
  
  if (filters.insuranceType && filters.insuranceType !== 'ALL') {
    query.insuranceType = filters.insuranceType.toLowerCase();
  } else if (filters.policyType && filters.policyType !== 'ALL') {
    query.$or = [
      { policyType: filters.policyType.toLowerCase() },
      { insuranceType: filters.policyType.toLowerCase() }
    ];
  }

  if (filters.insuranceSubtype && filters.insuranceSubtype !== 'ALL') {
    query.insuranceSubtype = filters.insuranceSubtype.toLowerCase();
  }

  if (filters.insuranceCompany && filters.insuranceCompany !== 'ALL') query.insuranceCompany = filters.insuranceCompany;

  if (filters.search && filters.search.trim()) {
    const searchRegex = new RegExp(filters.search.trim(), 'i');
    query.$or = [
      { policyNumber: searchRegex },
      { insuranceCompany: searchRegex },
      { productName: searchRegex },
      { 'vehicleDetails.registrationNumber': searchRegex }
    ];
  }

  // Expiring within X days filter
  if (filters.expiringWithinDays) {
    const days = parseInt(filters.expiringWithinDays, 10);
    const now = new Date();
    const targetDate = new Date();
    targetDate.setDate(now.getDate() + days);
    query.renewalDate = { $gte: now, $lte: targetDate };
    query.status = { $ne: POLICY_STATUSES.EXPIRED };
  }

  const { skip, limit, page } = parsePaginationParams(filters);
  const total = await InsurancePolicy.countDocuments(query);
  const policies = await InsurancePolicy.find(query)
    .populate('customerId', 'name mobile email pan city')
    .populate('assignedAgentId', 'name email')
    .populate('documentId', 'fileName blobUrl fileType verificationState')
    .sort({ renewalDate: 1, createdAt: -1 })
    .skip(skip)
    .limit(limit);

  return buildPaginationResponse(policies, total, page, limit);
};

exports.getById = async (policyId, agencyId) => {
  const policy = await InsurancePolicy.findOne({ _id: policyId, agencyId, isDeleted: false })
    .populate('customerId', 'name mobile email pan dob gender address city state pincode')
    .populate('assignedAgentId', 'name email')
    .populate('documentId', 'fileName blobUrl fileType verificationState')
    .populate('renewedFromPolicyId', 'policyNumber insuranceCompany renewalDate')
    .populate('renewedToPolicyId', 'policyNumber insuranceCompany renewalDate');

  if (!policy) throw new NotFoundError('Policy not found');
  return policy;
};

exports.update = async (policyId, agencyId, data, user) => {
  const policy = await InsurancePolicy.findOne({ _id: policyId, agencyId, isDeleted: false });
  if (!policy) throw new NotFoundError('Policy not found');

  const oldData = policy.toObject();
  
  Object.assign(policy, data);
  if (data.premium || data.finalPremium) {
    policy.premium = Number(data.premium || data.finalPremium);
  }
  policy.updatedBy = user.userId;
  await policy.save();

  // If renewal date changed, re-check follow-ups
  if (data.renewalDate && data.renewalDate !== oldData.renewalDate) {
    const customer = await Customer.findById(policy.customerId);
    if (customer) {
      await scheduleRenewalFollowups(agencyId, customer, policy, user);
    }
  }

  if (auditLogService && auditLogService.createLog) {
    await auditLogService.createLog(agencyId, 'InsurancePolicy', policyId, 'UPDATE', oldData, policy.toObject(), user.userId);
  }

  if (activityService && activityService.logActivity) {
    await activityService.logActivity(agencyId, ACTIVITY_TYPES.POLICY_UPDATED, {
      policyId: policy._id,
      performedBy: user.userId,
    });
  }

  return policy;
};

exports.delete = async (policyId, agencyId, user) => {
  const policy = await InsurancePolicy.findOne({ _id: policyId, agencyId, isDeleted: false });
  if (!policy) throw new NotFoundError('Policy not found');

  policy.isDeleted = true;
  policy.deletedAt = new Date();
  policy.deletedBy = user.userId;
  await policy.save();

  // Cancel pending renewal follow-ups
  await FollowUp.updateMany(
    { relatedPolicyId: policyId, agencyId, status: FOLLOW_UP_STATUSES.PENDING },
    { $set: { status: 'cancelled' } }
  );

  if (auditLogService && auditLogService.createLog) {
    await auditLogService.createLog(agencyId, 'InsurancePolicy', policyId, 'DELETE', policy.toObject(), null, user.userId);
  }

  if (activityService && activityService.logActivity) {
    await activityService.logActivity(agencyId, ACTIVITY_TYPES.POLICY_DELETED, {
      policyId: policy._id,
      performedBy: user.userId,
    });
  }

  return { message: 'Policy deleted successfully' };
};

async function scheduleRenewalFollowups(agencyId, customer, policy, user) {
  if (!policy.renewalDate) return;
  const renewalTime = new Date(policy.renewalDate).getTime();
  const intervals = [30, 15, 7, 1];

  for (const days of intervals) {
    const reminderDate = new Date(renewalTime - days * 24 * 60 * 60 * 1000);
    const eventKey = `renewal_${policy._id}_${days}d`;

    const existing = await FollowUp.findOne({ agencyId, renewalEventKey: eventKey });
    if (!existing) {
      await FollowUp.create({
        agencyId,
        customerId: customer._id,
        agentId: customer.assignedAgentId || user.userId,
        relatedPolicyId: policy._id,
        type: FOLLOW_UP_TYPES.RENEWAL,
        dueDate: reminderDate,
        status: FOLLOW_UP_STATUSES.PENDING,
        notes: `Automated ${days}-day policy renewal reminder for ${policy.insuranceCompany} (${policy.policyNumber})`,
        isAutomatic: true,
        renewalEventKey: eventKey,
        createdBy: user.userId
      });
    }
  }
}
