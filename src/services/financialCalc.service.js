const MutualFund = require('../models/MutualFund');
const Transaction = require('../models/Transaction');
const Sip = require('../models/Sip');
const Policy = require('../models/Policy');
const navService = require('./nav.service');

const calculateCustomerPortfolio = async (customerId, agencyId) => {
  const funds = await MutualFund.find({ customerId, agencyId, isDeleted: false });
  const transactions = await Transaction.find({ customerId, agencyId, isDeleted: false, status: 'completed' });
  const sips = await Sip.find({ customerId, agencyId, isDeleted: false, status: 'active' });

  let totalInvestedAmount = 0;
  let totalCurrentValue = 0;
  const dataLimitations = [];
  const fundBreakdown = [];

  for (const fund of funds) {
    const fundTxns = transactions.filter(t => t.mutualFundId.toString() === fund._id.toString());
    
    let investedAmount = 0;
    let units = 0;

    for (const txn of fundTxns) {
      if (['purchase', 'sip_purchase'].includes(txn.type)) {
        investedAmount += txn.amount || 0;
        units += txn.units || 0;
      } else if (['redemption', 'swp', 'switch_out'].includes(txn.type)) {
        investedAmount -= txn.amount || 0;
        units -= txn.units || 0;
      }
    }

    totalInvestedAmount += investedAmount;

    let currentValue = 0;
    const latestNavData = await navService.getLatestNav(fund.schemeCode);
    
    if (latestNavData) {
      currentValue = units * latestNavData.nav;
      totalCurrentValue += currentValue;
    } else {
      dataLimitations.push(`NAV data unavailable for scheme ${fund.schemeCode}`);
    }

    fundBreakdown.push({
      mutualFundId: fund._id,
      schemeCode: fund.schemeCode,
      amc: fund.amc,
      investedAmount,
      units,
      currentValue,
      gainLoss: currentValue - investedAmount,
      hasNavData: !!latestNavData
    });
  }

  const totalGainLoss = totalCurrentValue - totalInvestedAmount;
  const gainLossPercentage = totalInvestedAmount > 0 ? (totalGainLoss / totalInvestedAmount) * 100 : 0;
  const totalSipAmount = sips.reduce((sum, sip) => sum + (sip.amount || 0), 0);

  return {
    totalInvestedAmount,
    totalCurrentValue,
    totalGainLoss,
    gainLossPercentage,
    totalSipAmount,
    fundBreakdown,
    dataLimitations
  };
};

const calculateFundHoldings = async (mutualFundId, agencyId) => {
  const transactions = await Transaction.find({ mutualFundId, agencyId, isDeleted: false, status: 'completed' });
  const fund = await MutualFund.findOne({ _id: mutualFundId, agencyId, isDeleted: false });

  if (!fund) throw new Error('Mutual fund not found');

  let investedAmount = 0;
  let units = 0;

  for (const txn of transactions) {
    if (['purchase', 'sip_purchase'].includes(txn.type)) {
      investedAmount += txn.amount || 0;
      units += txn.units || 0;
    } else if (['redemption', 'swp', 'switch_out'].includes(txn.type)) {
      investedAmount -= txn.amount || 0;
      units -= txn.units || 0;
    }
  }

  const latestNavData = await navService.getLatestNav(fund.schemeCode);
  let currentValue = 0;
  let gainLoss = 0;
  let gainLossPercentage = 0;
  const hasNavData = !!latestNavData;

  if (hasNavData) {
    currentValue = units * latestNavData.nav;
    gainLoss = currentValue - investedAmount;
    gainLossPercentage = investedAmount > 0 ? (gainLoss / investedAmount) * 100 : 0;
  }

  return {
    investedAmount,
    units,
    currentValue,
    gainLoss,
    gainLossPercentage,
    latestNav: latestNavData ? latestNavData.nav : null,
    latestNavDate: latestNavData ? latestNavData.date : null,
    hasNavData
  };
};

const calculateInsuranceMetrics = async (customerId, agencyId) => {
  const policies = await Policy.find({ customerId, agencyId, isDeleted: false });

  let totalAnnualPremium = 0;
  let totalSumAssured = 0;
  let activePolicies = 0;
  const policyBreakdown = [];

  for (const policy of policies) {
    if (policy.status === 'active') {
      activePolicies++;
      totalAnnualPremium += policy.annualPremium || 0;
    }
    totalSumAssured += policy.sumAssured || 0;
    
    policyBreakdown.push({
      policyId: policy._id,
      type: policy.type,
      status: policy.status,
      annualPremium: policy.annualPremium,
      sumAssured: policy.sumAssured
    });
  }

  return {
    totalPolicies: policies.length,
    activePolicies,
    totalAnnualPremium,
    totalSumAssured,
    policyBreakdown
  };
};

const calculateAgencyMFMetrics = async (agencyId) => {
  const funds = await MutualFund.find({ agencyId, isDeleted: false });
  const sips = await Sip.find({ agencyId, isDeleted: false, status: 'active' });

  let totalInvestedAmount = 0;
  let totalCurrentValue = 0;

  for (const fund of funds) {
    totalInvestedAmount += fund.investedAmount || 0;
    totalCurrentValue += fund.currentValue || 0;
  }

  const totalGainLoss = totalCurrentValue - totalInvestedAmount;
  const activeSipCount = sips.length;
  const totalSipAmount = sips.reduce((sum, sip) => sum + (sip.amount || 0), 0);

  return {
    totalInvestments: funds.length,
    totalInvestedAmount,
    totalCurrentValue,
    totalGainLoss,
    activeSipCount,
    totalSipAmount
  };
};

module.exports = {
  calculateCustomerPortfolio,
  calculateFundHoldings,
  calculateInsuranceMetrics,
  calculateAgencyMFMetrics
};
