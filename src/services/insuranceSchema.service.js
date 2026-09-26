const { INSURANCE_TAXONOMY, INSURANCE_TYPES, getSubtypeConfig, normalizeLegacyLob } = require('../schemas/insuranceTaxonomy');
const { FIELD_REGISTRY } = require('../schemas/insuranceFieldRegistry');
const { SUBTYPE_SCHEMAS, getSubtypeSchema } = require('../schemas/insuranceSubtypeSchemas');

/**
 * Returns all insurance types and their subtypes
 */
const getTaxonomy = () => {
  return INSURANCE_TAXONOMY;
};

/**
 * Returns subtypes for a specific insurance type
 */
const getSubtypesByType = (typeCode) => {
  const normType = (typeCode || '').toLowerCase().trim();
  const found = INSURANCE_TAXONOMY.find(t => t.code === normType);
  return found ? found.subtypes : [];
};

/**
 * Returns the complete schema for a subtype (including full field definitions)
 */
const getSchemaBySubtype = (subtypeCode) => {
  const schema = getSubtypeSchema(subtypeCode);
  if (!schema) return null;

  // Resolve base fields and combine with custom fields
  const resolvedFields = (schema.fieldKeys || []).map(key => {
    if (FIELD_REGISTRY[key]) {
      return FIELD_REGISTRY[key];
    }
    // Check if custom field
    const custom = (schema.customFields || []).find(f => f.key === key);
    return custom || { key, label: key, type: 'text', category: 'policy' };
  });

  // Add any custom fields not in fieldKeys
  (schema.customFields || []).forEach(custom => {
    if (!resolvedFields.find(f => f.key === custom.key)) {
      resolvedFields.push(custom);
    }
  });

  return {
    ...schema,
    fields: resolvedFields
  };
};

/**
 * Normalizes an OCR or Manual entry payload according to the subtype schema
 */
const normalizePolicyPayload = (payload, subtypeCode) => {
  const schema = getSubtypeSchema(subtypeCode);
  const type = schema ? schema.type : 'health';
  const subtype = schema ? schema.subtype : 'individual_health';

  const customerData = payload.customerData || payload.customer || {};
  const policyData = payload.policyData || payload.policy || {};
  const premiumData = payload.premiumData || payload.premium || {};
  const motorData = payload.motorData || payload.vehicleDetails || payload.motor || {};
  const nomineeData = payload.nomineeData || payload.nominee || {};
  const insuredMembers = payload.insuredMembers || payload.members || [];
  const subtypeDetails = payload.subtypeDetails || payload.coverageDetails || {};

  // Standardize dates
  const parseDate = (d) => {
    if (!d) return null;
    const parsed = new Date(d);
    return isNaN(parsed.getTime()) ? null : parsed;
  };

  // Convert numbers
  const parseNumber = (n) => {
    if (n === null || n === undefined || n === '') return null;
    const cleaned = String(n).replace(/[^\d.-]/g, '');
    const val = parseFloat(cleaned);
    return isNaN(val) ? null : val;
  };

  const finalPremium = parseNumber(premiumData.finalPremium || policyData.premium || policyData.finalPremium) || 0;
  const basicPremium = parseNumber(premiumData.basicPremium || policyData.basicPremium);
  const gst = parseNumber(premiumData.gst || policyData.gst);
  const sumAssured = parseNumber(policyData.sumAssured || policyData.sumInsured || subtypeDetails.sumInsured);

  return {
    insuranceType: type,
    insuranceSubtype: subtype,
    policyType: type, // for backward compatibility
    lob: type.toUpperCase(), // for backward compatibility
    subLob: schema ? schema.name : 'General',

    customer: {
      name: customerData.name ? customerData.name.trim() : '',
      mobile: customerData.mobile ? customerData.mobile.trim() : '',
      email: customerData.email ? customerData.email.trim().toLowerCase() : '',
      dob: parseDate(customerData.dob),
      gender: customerData.gender || 'male',
      pan: customerData.pan ? customerData.pan.trim().toUpperCase() : '',
      aadhaar: customerData.aadhaar ? customerData.aadhaar.trim() : '',
      address: customerData.address || '',
      city: customerData.city || '',
      state: customerData.state || '',
      pincode: customerData.pincode || '',
      customerType: customerData.customerType || 'individual'
    },

    policy: {
      insuranceCompany: policyData.insurer || policyData.insuranceCompany || 'Insurer',
      policyNumber: policyData.policyNumber ? policyData.policyNumber.trim() : '',
      productName: policyData.productName || policyData.planName || '',
      planName: policyData.planName || policyData.productName || '',
      businessType: policyData.businessType || 'new',
      startDate: parseDate(policyData.startDate),
      endDate: parseDate(policyData.endDate),
      renewalDate: parseDate(policyData.renewalDate || policyData.endDate),
      issueDate: parseDate(policyData.issueDate),
      sumAssured: sumAssured,
      tenureYears: parseNumber(policyData.tenureYears) || 1
    },

    premium: {
      basicPremium: basicPremium,
      gst: gst,
      netPremium: basicPremium || finalPremium,
      premium: finalPremium,
      finalPremium: finalPremium,
      installmentAmount: parseNumber(premiumData.installmentAmount),
      premiumFrequency: premiumData.premiumFrequency || 'yearly'
    },

    vehicleDetails: schema.entities.hasVehicle ? {
      registrationNumber: motorData.registrationNumber ? motorData.registrationNumber.trim().toUpperCase() : '',
      vehicleType: motorData.vehicleType || 'Private Car',
      vehicleCategory: motorData.vehicleCategory || 'Private Car',
      businessType: motorData.businessType || policyData.businessType || 'new',
      make: motorData.make || '',
      model: motorData.model || '',
      variant: motorData.variant || '',
      subModel: motorData.subModel || '',
      fuelType: motorData.fuelType || 'Petrol',
      cubicCapacity: parseNumber(motorData.cubicCapacity),
      seatingCapacity: parseNumber(motorData.seatingCapacity),
      numberOfTyres: parseNumber(motorData.numberOfTyres),
      vehicleColor: motorData.vehicleColor || '',
      registrationDate: parseDate(motorData.registrationDate),
      registrationState: motorData.registrationState || '',
      registrationCity: motorData.registrationCity || '',
      rtoCode: motorData.rtoCode ? motorData.rtoCode.trim().toUpperCase() : '',
      rtoName: motorData.rtoName || '',
      zone: motorData.zone || '',
      manufacturingMonth: motorData.manufacturingMonth || '',
      manufacturingYear: parseNumber(motorData.manufacturingYear),
      manufacturingDate: parseDate(motorData.manufacturingDate),
      engineNumber: motorData.engineNumber ? motorData.engineNumber.trim().toUpperCase() : '',
      chassisNumber: motorData.chassisNumber ? motorData.chassisNumber.trim().toUpperCase() : '',
      vinNumber: motorData.vinNumber ? motorData.vinNumber.trim().toUpperCase() : '',
      idv: parseNumber(motorData.idv),
      vehicleValue: parseNumber(motorData.vehicleValue),
      ncb: parseNumber(motorData.ncb || motorData.currentNcbPercentage || motorData.ncbPercentage) || 0,
      currentNcbPercentage: parseNumber(motorData.currentNcbPercentage || motorData.ncbPercentage || motorData.ncb),
      previousNcbPercentage: parseNumber(motorData.previousNcbPercentage || motorData.previousNcb),
      previousPolicyAvailable: motorData.previousPolicyAvailable !== undefined ? motorData.previousPolicyAvailable : null,
      previousInsurer: motorData.previousInsurer || '',
      previousPolicyNumber: motorData.previousPolicyNumber || '',
      previousPolicyStartDate: parseDate(motorData.previousPolicyStartDate),
      previousPolicyEndDate: parseDate(motorData.previousPolicyEndDate),
      previousPolicyType: motorData.previousPolicyType || '',
      previousNcb: parseNumber(motorData.previousNcb),
      previousIdv: parseNumber(motorData.previousIdv),
      activeTpInsurerName: motorData.activeTpInsurerName || '',
      activeTpPolicyNumber: motorData.activeTpPolicyNumber || '',
      activeTpPolicyStartDate: parseDate(motorData.activeTpPolicyStartDate),
      activeTpPolicyEndDate: parseDate(motorData.activeTpPolicyEndDate),
      tpPremium: parseNumber(motorData.tpPremium),
      financed: motorData.financed !== undefined ? motorData.financed : null,
      financierName: motorData.financierName || '',
      hypothecation: motorData.hypothecation || '',
      loanProvider: motorData.loanProvider || '',
      addons: Array.isArray(motorData.addons) ? motorData.addons : [],
      zeroDepreciation: !!motorData.zeroDepreciation,
      engineProtection: !!motorData.engineProtection,
      roadsideAssistance: !!motorData.roadsideAssistance,
      consumables: !!motorData.consumables,
      returnToInvoice: !!motorData.returnToInvoice,
      ncbProtector: !!motorData.ncbProtector,
      tyreProtector: !!motorData.tyreProtector,
      keyReplacement: !!motorData.keyReplacement,
      personalBelongings: !!motorData.personalBelongings,
      personalAccidentCover: !!motorData.personalAccidentCover
    } : undefined,

    brokerDetails: payload.brokerDetails || payload.broker ? {
      brokerAgency: (payload.brokerDetails?.brokerAgency || payload.broker?.brokerAgency || '').trim(),
      agentName: (payload.brokerDetails?.agentName || payload.broker?.agentName || '').trim(),
      subAgent: (payload.brokerDetails?.subAgent || payload.broker?.subAgent || '').trim(),
      brokerCode: (payload.brokerDetails?.brokerCode || payload.broker?.brokerCode || '').trim(),
      agentCode: (payload.brokerDetails?.agentCode || payload.broker?.agentCode || '').trim()
    } : undefined,

    paymentDetails: payload.paymentDetails || payload.payment ? {
      paymentStatus: payload.paymentDetails?.paymentStatus || payload.payment?.paymentStatus || 'completed',
      paymentMethod: payload.paymentDetails?.paymentMethod || payload.payment?.paymentMethod || 'Online',
      paymentDate: parseDate(payload.paymentDetails?.paymentDate || payload.payment?.paymentDate),
      paymentAmount: parseNumber(payload.paymentDetails?.paymentAmount || payload.payment?.paymentAmount),
      transactionReference: payload.paymentDetails?.transactionReference || payload.payment?.transactionReference || '',
      receiptNumber: payload.paymentDetails?.receiptNumber || payload.payment?.receiptNumber || ''
    } : undefined,

    premiumBreakdown: {
      ownDamagePremium: parseNumber(motorData.ownDamagePremium || premiumData.ownDamagePremium),
      thirdPartyPremium: parseNumber(motorData.thirdPartyPremium || premiumData.thirdPartyPremium),
      personalAccidentPremium: parseNumber(motorData.personalAccidentPremium || premiumData.personalAccidentPremium),
      addonPremium: parseNumber(motorData.addonPremium || premiumData.addonPremium),
      basicPremium: basicPremium,
      otherPremium: parseNumber(premiumData.otherPremium),
      discount: parseNumber(motorData.discount || premiumData.discount),
      loading: parseNumber(motorData.loading || premiumData.loading),
      netPremium: basicPremium || finalPremium,
      gstPercentage: parseNumber(premiumData.gstPercentage),
      gst: gst,
      cess: parseNumber(motorData.cess || premiumData.cess),
      finalPremium: finalPremium
    },

    insuredMembers: schema.entities.hasMembers && Array.isArray(insuredMembers) ? insuredMembers.map(m => ({
      name: m.name ? m.name.trim() : '',
      dob: parseDate(m.dob),
      age: parseNumber(m.age),
      gender: m.gender || 'male',
      relationship: m.relationship || 'Self',
      memberId: m.memberId || '',
      sumInsured: parseNumber(m.sumInsured) || sumAssured
    })) : [],

    nominee: nomineeData.name ? {
      name: nomineeData.name.trim(),
      relation: nomineeData.relation || 'Spouse',
      dob: parseDate(nomineeData.dob),
      share: parseNumber(nomineeData.share) || 100
    } : undefined,

    coverageDetails: {
      ...subtypeDetails,
      ...payload.customFields
    }
  };
};

module.exports = {
  getTaxonomy,
  getSubtypesByType,
  getSchemaBySubtype,
  normalizePolicyPayload,
  getSubtypeConfig,
  normalizeLegacyLob
};
