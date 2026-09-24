const Customer = require('../models/Customer');
const InsurancePolicy = require('../models/InsurancePolicy');
const MutualFund = require('../models/MutualFund');
const FollowUp = require('../models/FollowUp');
const Document = require('../models/Document');
const Transaction = require('../models/Transaction');

const getDashboard = async (agencyId) => {
  const [totalCustomers, activePolicies, totalInvestments, pendingFollowUps, pendingDocuments] = await Promise.all([
    Customer.countDocuments({ agencyId }),
    InsurancePolicy.countDocuments({ agencyId, status: 'active' }),
    MutualFund.countDocuments({ agencyId }),
    FollowUp.countDocuments({ agencyId, status: 'pending' }),
    Document.countDocuments({ agencyId, status: 'pending' })
  ]);

  return {
    totalCustomers,
    activePolicies,
    totalInvestments,
    pendingFollowUps,
    pendingDocuments
  };
};

const getInsuranceAnalytics = async (agencyId) => {
  const policies = await InsurancePolicy.aggregate([
    { $match: { agencyId } },
    {
      $group: {
        _id: null,
        totalPolicies: { $sum: 1 },
        totalAnnualPremium: { $sum: '$premium' },
        totalSumAssured: { $sum: '$sumAssured' },
        active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
        expiringSoon: { $sum: { $cond: [{ $eq: ['$status', 'expiring_soon'] }, 1, 0] } },
        expired: { $sum: { $cond: [{ $eq: ['$status', 'expired'] }, 1, 0] } },
        renewed: { $sum: { $cond: [{ $eq: ['$status', 'renewed'] }, 1, 0] } }
      }
    }
  ]);

  const typeData = await InsurancePolicy.aggregate([
    { $match: { agencyId } },
    { $group: { _id: '$type', count: { $sum: 1 } } }
  ]);

  const byType = typeData.reduce((acc, curr) => {
    acc[curr._id] = curr.count;
    return acc;
  }, {});

  const p = policies[0] || {
    totalPolicies: 0,
    totalAnnualPremium: 0,
    totalSumAssured: 0,
    active: 0,
    expiringSoon: 0,
    expired: 0,
    renewed: 0
  };

  return {
    totalPolicies: p.totalPolicies,
    totalAnnualPremium: p.totalAnnualPremium,
    averagePremium: p.totalPolicies > 0 ? p.totalAnnualPremium / p.totalPolicies : 0,
    totalSumAssured: p.totalSumAssured,
    byStatus: {
      active: p.active,
      expiring_soon: p.expiringSoon,
      expired: p.expired,
      renewed: p.renewed
    },
    byType
  };
};

const getMutualFundAnalytics = async (agencyId) => {
  const mfData = await MutualFund.aggregate([
    { $match: { agencyId } },
    {
      $group: {
        _id: null,
        totalInvestments: { $sum: 1 },
        totalInvestedAmount: { $sum: '$investedAmount' },
        totalCurrentValue: { $sum: '$currentValue' },
        activeSipCount: { $sum: { $cond: [{ $eq: ['$isSip', true] }, 1, 0] } },
        totalMonthlySipAmount: { $sum: { $cond: [{ $eq: ['$isSip', true] }, '$sipAmount', 0] } }
      }
    }
  ]);

  const byAmc = await MutualFund.aggregate([
    { $match: { agencyId } },
    { $group: { _id: '$amc', totalValue: { $sum: '$currentValue' } } },
    { $sort: { totalValue: -1 } }
  ]);

  const topSchemes = await MutualFund.aggregate([
    { $match: { agencyId } },
    { $group: { _id: '$schemeName', totalValue: { $sum: '$currentValue' } } },
    { $sort: { totalValue: -1 } },
    { $limit: 5 }
  ]);

  const m = mfData[0] || {
    totalInvestments: 0,
    totalInvestedAmount: 0,
    totalCurrentValue: 0,
    activeSipCount: 0,
    totalMonthlySipAmount: 0
  };

  return {
    totalInvestments: m.totalInvestments,
    totalInvestedAmount: m.totalInvestedAmount,
    totalCurrentValue: m.totalCurrentValue,
    totalGainLoss: m.totalCurrentValue - m.totalInvestedAmount,
    activeSipCount: m.activeSipCount,
    totalMonthlySipAmount: m.totalMonthlySipAmount,
    byAmc,
    topSchemes
  };
};

const getCrmAnalytics = async (agencyId) => {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [totalCustomers, customersThisMonth, followUpStats, pendingDocs] = await Promise.all([
    Customer.countDocuments({ agencyId }),
    Customer.countDocuments({ agencyId, createdAt: { $gte: startOfMonth } }),
    FollowUp.aggregate([
      { $match: { agencyId } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          overdue: { 
            $sum: { 
              $cond: [
                { $and: [{ $eq: ['$status', 'pending'] }, { $lt: ['$dueDate', new Date()] }] }, 
                1, 
                0
              ] 
            } 
          }
        }
      }
    ]),
    Document.countDocuments({ agencyId, status: 'pending' })
  ]);

  const agentPerformance = await FollowUp.aggregate([
    { $match: { agencyId } },
    {
      $group: {
        _id: '$agentId',
        totalAssigned: { $sum: 1 },
        completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } }
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'agent'
      }
    },
    { $unwind: '$agent' },
    {
      $project: {
        agentId: '$_id',
        name: '$agent.name',
        followUpCompletion: {
          $cond: [{ $gt: ['$totalAssigned', 0] }, { $divide: ['$completed', '$totalAssigned'] }, 0]
        }
      }
    }
  ]);

  // Append customer counts per agent
  for (let perf of agentPerformance) {
    perf.customerCount = await Customer.countDocuments({ agencyId, assignedAgentId: perf.agentId });
  }

  const f = followUpStats[0] || { total: 0, pending: 0, completed: 0, overdue: 0 };

  return {
    totalCustomers,
    customersThisMonth,
    totalFollowUps: f.total,
    pendingFollowUps: f.pending,
    completedFollowUps: f.completed,
    overdueFollowUps: f.overdue,
    documentsPending: pendingDocs,
    agentPerformance
  };
};

module.exports = {
  getDashboard,
  getInsuranceAnalytics,
  getMutualFundAnalytics,
  getCrmAnalytics
};
