const PolicyCommission = require('../models/PolicyCommission');
const InsurancePolicy = require('../models/InsurancePolicy');
const { NotFoundError, ForbiddenError, ValidationError } = require('../utils/apiError');
const { ROLES } = require('../utils/constants');

/**
 * Live live calculation for commission amount rounded to 2 decimals
 */
const calculateCommissionAmount = (basisAmount, type, percentage, flatAmount) => {
  if (type === 'flat') {
    const flat = Number(flatAmount) || 0;
    if (flat < 0) throw new ValidationError('Commission flat amount cannot be negative');
    return Math.round(flat * 100) / 100;
  }
  
  // Default: percentage
  const pct = Number(percentage) || 0;
  if (pct < 0 || pct > 100) {
    throw new ValidationError('Commission percentage must be between 0 and 100');
  }
  const base = Number(basisAmount) || 0;
  return Math.round(base * (pct / 100) * 100) / 100;
};

/**
 * Extract basis premium amount from policy object
 */
const getPolicyPremiumBasisAmount = (policy, basis = 'net_premium') => {
  if (!policy) return 0;
  const pb = policy.premiumBreakdown || {};
  const vd = policy.vehicleDetails || {};

  switch (basis) {
    case 'final_premium':
      return pb.finalPremium ?? policy.finalPremium ?? policy.premium ?? 0;
    case 'basic_premium':
      return pb.basicPremium ?? policy.basicPremium ?? 0;
    case 'od_premium':
      return vd.ownDamagePremium ?? pb.ownDamagePremium ?? policy.odPremium ?? 0;
    case 'other_premium':
      return pb.otherPremium ?? policy.otherPremium ?? 0;
    case 'net_premium':
    default:
      return pb.netPremium ?? policy.netPremium ?? pb.finalPremium ?? policy.finalPremium ?? 0;
  }
};

/**
 * Get commission for a given policy
 */
const getByPolicyId = async (agencyId, policyId, user) => {
  const policy = await InsurancePolicy.findOne({ _id: policyId, agencyId, isDeleted: false })
    .populate('customerId', 'name mobile email')
    .populate('assignedAgentId', 'name email');
  if (!policy) throw new NotFoundError('Policy not found');

  const isAdmin = [ROLES.ADMIN, ROLES.SUPER_ADMIN].includes(user?.role);
  if (!isAdmin && user?.userId && String(policy.assignedAgentId?._id || policy.assignedAgentId) !== String(user.userId)) {
    throw new ForbiddenError('You do not have access to view commission for this policy');
  }

  let commission = await PolicyCommission.findOne({ agencyId, policyId, isDeleted: false })
    .populate('agentId', 'name email')
    .populate('createdBy', 'name email')
    .populate('updatedBy', 'name email');

  return {
    policy,
    commission
  };
};

/**
 * Create or update commission record for a policy
 */
const upsertCommission = async (agencyId, policyId, data, user) => {
  const policy = await InsurancePolicy.findOne({ _id: policyId, agencyId, isDeleted: false });
  if (!policy) throw new NotFoundError('Policy not found');

  const isAdmin = [ROLES.ADMIN, ROLES.SUPER_ADMIN].includes(user?.role);
  if (!isAdmin && user?.userId && String(policy.assignedAgentId) !== String(user.userId)) {
    throw new ForbiddenError('You do not have permission to manage commission for this policy');
  }

  const commissionType = data.commissionType || 'percentage';
  const commissionBasis = data.commissionBasis || 'net_premium';
  const commissionPercentage = Number(data.commissionPercentage ?? data.rate ?? data.commissionRate ?? 0);
  const flatAmount = Number(data.commissionAmount ?? data.flatAmount ?? data.amount ?? 0);

  const basisAmount = getPolicyPremiumBasisAmount(policy, commissionBasis);
  const calculatedAmount = calculateCommissionAmount(basisAmount, commissionType, commissionPercentage, flatAmount);

  const agentId = (isAdmin && data.agentId) ? data.agentId : (policy.assignedAgentId || user.userId);
  const commissionStatus = data.commissionStatus || 'pending';
  const remarks = data.remarks || '';

  let commission = await PolicyCommission.findOne({ agencyId, policyId, isDeleted: false });

  if (commission) {
    commission.agentId = agentId;
    commission.commissionType = commissionType;
    commission.commissionBasis = commissionBasis;
    commission.commissionPercentage = commissionPercentage;
    commission.commissionAmount = calculatedAmount;
    commission.commissionStatus = commissionStatus;
    commission.remarks = remarks;
    commission.updatedBy = user.userId;
    await commission.save();
  } else {
    commission = await PolicyCommission.create({
      agencyId,
      policyId,
      agentId,
      commissionType,
      commissionBasis,
      commissionPercentage,
      commissionAmount: calculatedAmount,
      commissionStatus,
      remarks,
      createdBy: user.userId,
      updatedBy: user.userId
    });
  }

  // Synchronize embedded commission details on policy for backwards compatibility
  policy.commission = {
    type: commissionType,
    percentage: commissionPercentage,
    amount: calculatedAmount,
    totalCommission: calculatedAmount,
    status: commissionStatus === 'paid' ? 'received' : 'pending'
  };
  await policy.save();

  return commission;
};

/**
 * Soft-delete commission record
 */
const deleteCommission = async (agencyId, policyId, user) => {
  const policy = await InsurancePolicy.findOne({ _id: policyId, agencyId, isDeleted: false });
  if (!policy) throw new NotFoundError('Policy not found');

  const isAdmin = [ROLES.ADMIN, ROLES.SUPER_ADMIN].includes(user?.role);
  if (!isAdmin && user?.userId && String(policy.assignedAgentId) !== String(user.userId)) {
    throw new ForbiddenError('You do not have permission to delete commission for this policy');
  }

  const commission = await PolicyCommission.findOne({ agencyId, policyId, isDeleted: false });
  if (!commission) throw new NotFoundError('Commission record not found');

  commission.isDeleted = true;
  commission.deletedAt = new Date();
  commission.deletedBy = user.userId;
  await commission.save();

  policy.commission = undefined;
  await policy.save();

  return { success: true, message: 'Commission record deleted successfully' };
};

/**
 * List commissions with filtering
 */
const listCommissions = async (agencyId, query = {}, user) => {
  const isAdmin = [ROLES.ADMIN, ROLES.SUPER_ADMIN].includes(user?.role);
  const filter = { agencyId, isDeleted: false };

  if (!isAdmin) {
    filter.agentId = user.userId;
  } else if (query.agentId) {
    filter.agentId = query.agentId;
  }

  if (query.status) {
    filter.commissionStatus = query.status;
  }

  const page = parseInt(query.page, 10) || 1;
  const limit = parseInt(query.limit, 10) || 50;
  const skip = (page - 1) * limit;

  const [commissions, total] = await Promise.all([
    PolicyCommission.find(filter)
      .populate('policyId', 'policyNumber insuranceCompany insuranceType insuranceSubtype finalPremium startDate endDate')
      .populate('agentId', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    PolicyCommission.countDocuments(filter)
  ]);

  return {
    commissions,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit)
    }
  };
};

module.exports = {
  calculateCommissionAmount,
  getPolicyPremiumBasisAmount,
  getByPolicyId,
  upsertCommission,
  deleteCommission,
  listCommissions
};
