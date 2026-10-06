const PolicyCommission = require('../models/PolicyCommission');
const InsurancePolicy = require('../models/InsurancePolicy');
const Customer = require('../models/Customer');
const { NotFoundError, ForbiddenError, ValidationError } = require('../utils/apiError');
const { ROLES } = require('../utils/constants');

/**
 * Calculate commission amount rounded to 2 decimals
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
 * Extract basis premium amount strictly from policy object without cross-basis fallbacks
 */
const getPolicyPremiumBasisAmount = (policy, basis = 'net_premium') => {
  if (!policy) return 0;
  const pb = policy.premiumBreakdown || {};
  const vd = policy.vehicleDetails || {};

  const normalizedBasis = String(basis || '').toLowerCase().trim();

  let amount = 0;
  switch (normalizedBasis) {
    case 'final_premium':
    case 'gross_premium':
    case 'final':
    case 'gross':
      amount = pb.finalPremium ?? policy.finalPremium ?? policy.premium ?? 0;
      break;
    case 'basic_premium':
    case 'basic':
      amount = pb.basicPremium ?? policy.basicPremium ?? 0;
      break;
    case 'od_premium':
    case 'own_damage':
    case 'own_damage_premium':
    case 'od':
      amount = vd.ownDamagePremium ?? pb.ownDamagePremium ?? policy.odPremium ?? 0;
      break;
    case 'other_premium':
    case 'other':
      amount = pb.otherPremium ?? policy.otherPremium ?? 0;
      break;
    case 'net_premium':
    case 'net':
      amount = pb.netPremium ?? policy.netPremium ?? 0;
      break;
    default:
      amount = 0;
  }
  return Number(amount) || 0;
};

/**
 * Get commission for a given policy
 */
const getByPolicyId = async (agencyId, policyId, user) => {
  const policy = await InsurancePolicy.findOne({ _id: policyId, agencyId, isDeleted: false })
    .populate({ path: 'customerId', select: 'name mobile email pan city', options: { includeSoftDeleted: true } })
    .populate('assignedAgentId', 'name email');
  if (!policy) throw new NotFoundError('Policy not found');

  const isAdmin = [ROLES.ADMIN, ROLES.SUPER_ADMIN].includes(user?.role);
  if (!isAdmin && user?.userId && String(policy.assignedAgentId?._id || policy.assignedAgentId) !== String(user.userId)) {
    throw new ForbiddenError('You do not have access to view commission for this policy');
  }

  let commission = await PolicyCommission.findOne({ agencyId, policyId, isDeleted: false })
    .populate({ path: 'customerId', select: 'name mobile email', options: { includeSoftDeleted: true } })
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

  // If percentage-based, the selected premium basis MUST exist and be greater than 0
  if (commissionType === 'percentage') {
    if (!basisAmount || basisAmount <= 0) {
      throw new ValidationError('Selected premium basis is not available for this policy.');
    }
  }

  const calculatedAmount = calculateCommissionAmount(basisAmount, commissionType, commissionPercentage, flatAmount);

  const customerId = policy.customerId?._id || policy.customerId;
  const agentId = (isAdmin && data.agentId) ? data.agentId : (policy.assignedAgentId || user.userId);
  const commissionStatus = data.commissionStatus || 'pending';
  const remarks = data.remarks || '';

  let commission = await PolicyCommission.findOne({ agencyId, policyId, isDeleted: false });

  if (commission) {
    commission.customerId = customerId;
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
      customerId,
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
    commissionId: commission._id,
    type: commissionType,
    basis: commissionBasis,
    percentage: commissionPercentage,
    amount: calculatedAmount,
    totalCommission: calculatedAmount,
    status: commissionStatus
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
 * List individual commissions with filtering
 */
const listCommissions = async (agencyId, query = {}, user) => {
  const isAdmin = [ROLES.ADMIN, ROLES.SUPER_ADMIN].includes(user?.role);
  const filter = { agencyId, isDeleted: false };

  if (!isAdmin) {
    filter.agentId = user.userId;
  } else if (query.agentId) {
    filter.agentId = query.agentId;
  }

  if (query.customerId) {
    filter.customerId = query.customerId;
  }

  if (query.policyId) {
    filter.policyId = query.policyId;
  }

  if (query.status && query.status !== 'all') {
    filter.commissionStatus = query.status.toLowerCase();
  }

  const page = parseInt(query.page, 10) || 1;
  const limit = parseInt(query.limit, 10) || 50;
  const skip = (page - 1) * limit;

  // Search filter across policyNumber, insurer, or customer name
  if (query.search || query.policyNumber || query.lob) {
    const policyQuery = { agencyId, isDeleted: false };
    if (query.policyNumber) {
      policyQuery.policyNumber = { $regex: query.policyNumber.trim(), $options: 'i' };
    }
    if (query.lob && query.lob !== 'all') {
      policyQuery.$or = [
        { insuranceType: query.lob.toLowerCase() },
        { lob: query.lob.toLowerCase() }
      ];
    }

    let customerIds = [];
    if (query.search) {
      const searchRegex = { $regex: query.search.trim(), $options: 'i' };
      const matchingCusts = await Customer.find({
        agencyId,
        $or: [{ name: searchRegex }, { mobile: searchRegex }]
      }, '_id', { includeSoftDeleted: true });
      customerIds = matchingCusts.map(c => c._id);

      policyQuery.$or = [
        { policyNumber: searchRegex },
        { insuranceCompany: searchRegex },
        { productName: searchRegex }
      ];
    }

    const matchingPolicies = await InsurancePolicy.find(policyQuery).select('_id customerId');
    const matchingPolicyIds = matchingPolicies.map(p => p._id);

    if (query.search) {
      filter.$or = [
        { policyId: { $in: matchingPolicyIds } },
        { customerId: { $in: customerIds } }
      ];
    } else if (query.policyNumber || (query.lob && query.lob !== 'all')) {
      filter.policyId = { $in: matchingPolicyIds };
    }
  }

  const [commissions, total] = await Promise.all([
    PolicyCommission.find(filter)
      .populate({
        path: 'policyId',
        select: 'policyNumber insuranceCompany insuranceType insuranceSubtype lob finalPremium netPremium basicPremium odPremium premium premiumBreakdown vehicleDetails startDate endDate customerId',
        populate: { path: 'customerId', select: 'name mobile email', options: { includeSoftDeleted: true } }
      })
      .populate({
        path: 'customerId',
        select: 'name mobile email',
        options: { includeSoftDeleted: true }
      })
      .populate('agentId', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    PolicyCommission.countDocuments(filter)
  ]);

  // Enrich any records where customerId wasn't directly populated but exists on policy
  const enrichedCommissions = commissions.map(doc => {
    const obj = doc.toObject();
    if (!obj.customerId && obj.policyId?.customerId) {
      obj.customerId = obj.policyId.customerId;
    }
    return obj;
  });

  return {
    commissions: enrichedCommissions,
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
