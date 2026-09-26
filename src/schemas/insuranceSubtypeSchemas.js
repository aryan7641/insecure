/**
 * INSecure Subtype-Specific Schema Registry
 * Complete schemas for all 22 Phase 1 Insurance Subtypes:
 * 
 * LIFE (9):
 * 1. term
 * 2. term_return_of_premium
 * 3. whole_life
 * 4. endowment
 * 5. money_back
 * 6. ulip
 * 7. child_insurance
 * 8. pension_annuity
 * 9. group_life
 * 
 * HEALTH (8):
 * 10. individual_health
 * 11. family_floater
 * 12. senior_citizen_health
 * 13. group_health
 * 14. critical_illness
 * 15. top_up
 * 16. super_top_up
 * 17. personal_accident
 * 
 * MOTOR (3):
 * 18. car
 * 19. two_wheeler
 * 20. commercial_vehicle
 * 
 * GENERAL (2):
 * 21. travel
 * 22. home_property
 */

const { FIELD_REGISTRY, FIELD_TYPES, FIELD_CATEGORIES } = require('./insuranceFieldRegistry');

// Common Base Fields Included in Every Policy
const COMMON_BASE_FIELD_KEYS = [
  'customer.name',
  'customer.mobile',
  'customer.email',
  'customer.dob',
  'customer.gender',
  'customer.pan',
  'customer.address',
  'customer.city',
  'customer.state',
  'customer.pincode',
  'policy.insurer',
  'policy.policyNumber',
  'policy.productName',
  'policy.businessType',
  'policy.startDate',
  'policy.endDate',
  'policy.renewalDate',
  'policy.sumAssured',
  'premium.basicPremium',
  'premium.gst',
  'premium.finalPremium',
  'premium.premiumFrequency',
  'nominee.name',
  'nominee.relation',
  'nominee.share'
];

const SUBTYPE_SCHEMAS = {
  // -------------------------------------------------------------
  // HEALTH INSURANCE (8 Subtypes)
  // -------------------------------------------------------------

  // 1. Individual Health
  'individual_health': {
    type: 'health',
    subtype: 'individual_health',
    name: 'Individual Health Insurance',
    entities: {
      hasMembers: true,
      hasVehicle: false,
      hasLifeDetails: false,
      hasTravelDetails: false,
      hasPropertyDetails: false
    },
    sections: ['customer', 'policy', 'coverage', 'premium', 'members', 'nominee'],
    fieldKeys: [
      ...COMMON_BASE_FIELD_KEYS,
      'health.roomRentLimit',
      'health.icuLimit',
      'health.coPayment',
      'health.deductible',
      'health.waitingPeriodPreExisting',
      'health.noClaimBonus',
      'health.restorationBenefit'
    ],
    customFields: [
      { key: 'health.roomRentLimit', label: 'Room Rent Limit (INR / % of SI)', type: FIELD_TYPES.TEXT, category: FIELD_CATEGORIES.COVERAGE, placeholder: 'e.g. 1% of SI or No Capping' },
      { key: 'health.icuLimit', label: 'ICU Limit', type: FIELD_TYPES.TEXT, category: FIELD_CATEGORIES.COVERAGE, placeholder: 'e.g. 2% of SI or No Capping' },
      { key: 'health.coPayment', label: 'Co-Payment (%)', type: FIELD_TYPES.TEXT, category: FIELD_CATEGORIES.COVERAGE, placeholder: 'e.g. 0% or 10% on claim' },
      { key: 'health.deductible', label: 'Deductible (INR)', type: FIELD_TYPES.CURRENCY, category: FIELD_CATEGORIES.COVERAGE },
      { key: 'health.waitingPeriodPreExisting', label: 'Pre-existing Disease Waiting (Months)', type: FIELD_TYPES.NUMBER, category: FIELD_CATEGORIES.COVERAGE, placeholder: 'e.g. 24 or 36' },
      { key: 'health.noClaimBonus', label: 'Cumulative Bonus / NCB (INR)', type: FIELD_TYPES.CURRENCY, category: FIELD_CATEGORIES.COVERAGE },
      { key: 'health.restorationBenefit', label: 'Sum Insured Restoration', type: FIELD_TYPES.TEXT, category: FIELD_CATEGORIES.COVERAGE, placeholder: 'e.g. 100% Once a year' }
    ]
  },

  // 2. Family Floater
  'family_floater': {
    type: 'health',
    subtype: 'family_floater',
    name: 'Family Floater Health Insurance',
    entities: {
      hasMembers: true,
      hasVehicle: false,
      hasLifeDetails: false,
      hasTravelDetails: false,
      hasPropertyDetails: false
    },
    sections: ['customer', 'policy', 'coverage', 'members', 'premium', 'nominee'],
    fieldKeys: [
      ...COMMON_BASE_FIELD_KEYS,
      'health.familySize',
      'health.roomRentLimit',
      'health.icuLimit',
      'health.coPayment',
      'health.waitingPeriodPreExisting',
      'health.noClaimBonus',
      'health.restorationBenefit'
    ],
    customFields: [
      { key: 'health.familySize', label: 'Family Composition (e.g. 2A+2C)', type: FIELD_TYPES.TEXT, category: FIELD_CATEGORIES.COVERAGE, placeholder: 'e.g. 2 Adults + 2 Children' },
      { key: 'health.roomRentLimit', label: 'Room Rent Limit', type: FIELD_TYPES.TEXT, category: FIELD_CATEGORIES.COVERAGE },
      { key: 'health.icuLimit', label: 'ICU Limit', type: FIELD_TYPES.TEXT, category: FIELD_CATEGORIES.COVERAGE },
      { key: 'health.coPayment', label: 'Co-Payment (%)', type: FIELD_TYPES.TEXT, category: FIELD_CATEGORIES.COVERAGE },
      { key: 'health.waitingPeriodPreExisting', label: 'PED Waiting Period (Months)', type: FIELD_TYPES.NUMBER, category: FIELD_CATEGORIES.COVERAGE },
      { key: 'health.noClaimBonus', label: 'Cumulative Bonus (INR)', type: FIELD_TYPES.CURRENCY, category: FIELD_CATEGORIES.COVERAGE },
      { key: 'health.restorationBenefit', label: 'Restoration Benefit', type: FIELD_TYPES.TEXT, category: FIELD_CATEGORIES.COVERAGE }
    ]
  },

  // 3. Senior Citizen Health
  'senior_citizen_health': {
    type: 'health',
    subtype: 'senior_citizen_health',
    name: 'Senior Citizen Health Insurance',
    entities: {
      hasMembers: true,
      hasVehicle: false,
      hasLifeDetails: false,
      hasTravelDetails: false,
      hasPropertyDetails: false
    },
    sections: ['customer', 'policy', 'coverage', 'members', 'premium', 'nominee'],
    fieldKeys: [
      ...COMMON_BASE_FIELD_KEYS,
      'health.entryAge',
      'health.coPayment',
      'health.diseaseSpecificLimits',
      'health.preExistingCovered',
      'health.waitingPeriodPreExisting'
    ],
    customFields: [
      { key: 'health.entryAge', label: 'Entry Age (Years)', type: FIELD_TYPES.NUMBER, category: FIELD_CATEGORIES.COVERAGE },
      { key: 'health.coPayment', label: 'Mandatory Co-Payment (%)', type: FIELD_TYPES.TEXT, category: FIELD_CATEGORIES.COVERAGE, placeholder: 'e.g. 20% co-pay' },
      { key: 'health.diseaseSpecificLimits', label: 'Disease-Specific Sub-Limits', type: FIELD_TYPES.TEXT, category: FIELD_CATEGORIES.COVERAGE, placeholder: 'e.g. Cataract ₹40k, Knee ₹1L' },
      { key: 'health.preExistingCovered', label: 'Pre-existing Ailments Specified', type: FIELD_TYPES.TEXT, category: FIELD_CATEGORIES.COVERAGE },
      { key: 'health.waitingPeriodPreExisting', label: 'PED Waiting Period (Months)', type: FIELD_TYPES.NUMBER, category: FIELD_CATEGORIES.COVERAGE }
    ]
  },

  // 4. Group Health
  'group_health': {
    type: 'health',
    subtype: 'group_health',
    name: 'Group Health Insurance (GMC)',
    entities: {
      hasMembers: true,
      hasVehicle: false,
      hasLifeDetails: false,
      hasTravelDetails: false,
      hasPropertyDetails: false
    },
    sections: ['customer', 'policy', 'coverage', 'members', 'premium', 'nominee'],
    fieldKeys: [
      ...COMMON_BASE_FIELD_KEYS,
      'health.employerName',
      'health.masterPolicyNumber',
      'health.employeeId',
      'health.maternityCover',
      'health.corporateBuffer'
    ],
    customFields: [
      { key: 'health.employerName', label: 'Employer / Corporate Group Name', type: FIELD_TYPES.TEXT, category: FIELD_CATEGORIES.POLICY },
      { key: 'health.masterPolicyNumber', label: 'Master Policy Number', type: FIELD_TYPES.TEXT, category: FIELD_CATEGORIES.POLICY },
      { key: 'health.employeeId', label: 'Employee ID / Staff Code', type: FIELD_TYPES.TEXT, category: FIELD_CATEGORIES.CUSTOMER },
      { key: 'health.maternityCover', label: 'Maternity Benefit Limit (INR)', type: FIELD_TYPES.CURRENCY, category: FIELD_CATEGORIES.COVERAGE },
      { key: 'health.corporateBuffer', label: 'Corporate Buffer Available', type: FIELD_TYPES.TEXT, category: FIELD_CATEGORIES.COVERAGE }
    ]
  },

  // 5. Critical Illness
  'critical_illness': {
    type: 'health',
    subtype: 'critical_illness',
    name: 'Critical Illness Insurance',
    entities: {
      hasMembers: true,
      hasVehicle: false,
      hasLifeDetails: false,
      hasTravelDetails: false,
      hasPropertyDetails: false
    },
    sections: ['customer', 'policy', 'coverage', 'premium', 'nominee'],
    fieldKeys: [
      ...COMMON_BASE_FIELD_KEYS,
      'health.numberOfIllnessesCovered',
      'health.survivalPeriodDays',
      'health.waitingPeriodDays',
      'health.lumpSumPayout'
    ],
    customFields: [
      { key: 'health.numberOfIllnessesCovered', label: 'Number of Critical Illnesses Covered', type: FIELD_TYPES.NUMBER, category: FIELD_CATEGORIES.COVERAGE, placeholder: 'e.g. 36 illnesses' },
      { key: 'health.survivalPeriodDays', label: 'Survival Period (Days)', type: FIELD_TYPES.NUMBER, category: FIELD_CATEGORIES.COVERAGE, placeholder: 'e.g. 30 days' },
      { key: 'health.waitingPeriodDays', label: 'Initial Waiting Period (Days)', type: FIELD_TYPES.NUMBER, category: FIELD_CATEGORIES.COVERAGE, placeholder: 'e.g. 90 days' },
      { key: 'health.lumpSumPayout', label: 'Lump-sum Benefit Structure', type: FIELD_TYPES.TEXT, category: FIELD_CATEGORIES.COVERAGE, placeholder: '100% on first diagnosis' }
    ]
  },

  // 6. Top-up
  'top_up': {
    type: 'health',
    subtype: 'top_up',
    name: 'Top-up Health Insurance',
    entities: {
      hasMembers: true,
      hasVehicle: false,
      hasLifeDetails: false,
      hasTravelDetails: false,
      hasPropertyDetails: false
    },
    sections: ['customer', 'policy', 'coverage', 'members', 'premium', 'nominee'],
    fieldKeys: [
      ...COMMON_BASE_FIELD_KEYS,
      'health.thresholdDeductible',
      'health.topUpSumInsured',
      'health.claimTriggerType'
    ],
    customFields: [
      { key: 'health.thresholdDeductible', label: 'Per-Claim Deductible Threshold (INR)', type: FIELD_TYPES.CURRENCY, category: FIELD_CATEGORIES.COVERAGE, required: true, placeholder: 'e.g. 500000' },
      { key: 'health.topUpSumInsured', label: 'Top-up Additional Cover (INR)', type: FIELD_TYPES.CURRENCY, category: FIELD_CATEGORIES.COVERAGE },
      { key: 'health.claimTriggerType', label: 'Deductible Application', type: FIELD_TYPES.TEXT, category: FIELD_CATEGORIES.COVERAGE, placeholder: 'Applies per single hospitalization' }
    ]
  },

  // 7. Super Top-up
  'super_top_up': {
    type: 'health',
    subtype: 'super_top_up',
    name: 'Super Top-up Health Insurance',
    entities: {
      hasMembers: true,
      hasVehicle: false,
      hasLifeDetails: false,
      hasTravelDetails: false,
      hasPropertyDetails: false
    },
    sections: ['customer', 'policy', 'coverage', 'members', 'premium', 'nominee'],
    fieldKeys: [
      ...COMMON_BASE_FIELD_KEYS,
      'health.aggregateDeductible',
      'health.topUpSumInsured',
      'health.floaterOrIndividual'
    ],
    customFields: [
      { key: 'health.aggregateDeductible', label: 'Annual Aggregate Deductible (INR)', type: FIELD_TYPES.CURRENCY, category: FIELD_CATEGORIES.COVERAGE, required: true, placeholder: 'e.g. 500000 cumulative across year' },
      { key: 'health.topUpSumInsured', label: 'Super Top-up Sum Insured (INR)', type: FIELD_TYPES.CURRENCY, category: FIELD_CATEGORIES.COVERAGE },
      { key: 'health.floaterOrIndividual', label: 'Coverage Basis', type: FIELD_TYPES.TEXT, category: FIELD_CATEGORIES.COVERAGE, placeholder: 'Family Floater / Individual' }
    ]
  },

  // 8. Personal Accident
  'personal_accident': {
    type: 'health',
    subtype: 'personal_accident',
    name: 'Personal Accident Insurance',
    entities: {
      hasMembers: false,
      hasVehicle: false,
      hasLifeDetails: false,
      hasTravelDetails: false,
      hasPropertyDetails: false
    },
    sections: ['customer', 'policy', 'coverage', 'premium', 'nominee'],
    fieldKeys: [
      ...COMMON_BASE_FIELD_KEYS,
      'health.accidentalDeathSum',
      'health.permanentTotalDisability',
      'health.permanentPartialDisability',
      'health.temporaryTotalDisability',
      'health.accidentMedicalExpenses',
      'health.educationGrant'
    ],
    customFields: [
      { key: 'health.accidentalDeathSum', label: 'Accidental Death Benefit (100% SI)', type: FIELD_TYPES.CURRENCY, category: FIELD_CATEGORIES.COVERAGE },
      { key: 'health.permanentTotalDisability', label: 'Permanent Total Disability (PTD %)', type: FIELD_TYPES.TEXT, category: FIELD_CATEGORIES.COVERAGE, placeholder: 'e.g. 100% - 150% of SI' },
      { key: 'health.permanentPartialDisability', label: 'Permanent Partial Disability (PPD)', type: FIELD_TYPES.TEXT, category: FIELD_CATEGORIES.COVERAGE },
      { key: 'health.temporaryTotalDisability', label: 'Temporary Weekly Benefit (TTD)', type: FIELD_TYPES.CURRENCY, category: FIELD_CATEGORIES.COVERAGE, placeholder: 'e.g. ₹5,000/week' },
      { key: 'health.accidentMedicalExpenses', label: 'Accidental Medical Reimbursement', type: FIELD_TYPES.CURRENCY, category: FIELD_CATEGORIES.COVERAGE },
      { key: 'health.educationGrant', label: "Children's Education Grant (INR)", type: FIELD_TYPES.CURRENCY, category: FIELD_CATEGORIES.COVERAGE }
    ]
  },

  // -------------------------------------------------------------
  // MOTOR INSURANCE (3 Subtypes)
  // -------------------------------------------------------------

  // 9. Car Insurance
  'car': {
    type: 'motor',
    subtype: 'car',
    name: 'Car Insurance (Private 4-Wheeler)',
    entities: {
      hasMembers: false,
      hasVehicle: true,
      hasLifeDetails: false,
      hasTravelDetails: false,
      hasPropertyDetails: false
    },
    sections: ['customer', 'vehicle', 'policy', 'coverage', 'premium', 'nominee', 'crm'],
    fieldKeys: [
      ...COMMON_BASE_FIELD_KEYS,
      'motor.registrationNumber',
      'motor.vehicleType',
      'motor.vehicleCategory',
      'motor.make',
      'motor.model',
      'motor.variant',
      'motor.subModel',
      'motor.fuelType',
      'motor.cubicCapacity',
      'motor.seatingCapacity',
      'motor.numberOfTyres',
      'motor.vehicleColor',
      'motor.registrationDate',
      'motor.registrationState',
      'motor.registrationCity',
      'motor.rtoCode',
      'motor.rtoName',
      'motor.zone',
      'motor.manufacturingMonth',
      'motor.manufacturingYear',
      'motor.manufacturingDate',
      'motor.engineNumber',
      'motor.chassisNumber',
      'motor.vinNumber',
      'motor.idv',
      'motor.vehicleValue',
      'motor.currentNcbPercentage',
      'motor.previousNcbPercentage',
      'motor.previousPolicyAvailable',
      'motor.previousInsurer',
      'motor.previousPolicyNumber',
      'motor.previousPolicyStartDate',
      'motor.previousPolicyEndDate',
      'motor.previousPolicyType',
      'motor.previousNcb',
      'motor.previousIdv',
      'motor.activeTpInsurerName',
      'motor.activeTpPolicyNumber',
      'motor.activeTpPolicyStartDate',
      'motor.activeTpPolicyEndDate',
      'motor.tpPremium',
      'motor.financed',
      'motor.financierName',
      'motor.hypothecation',
      'motor.ownDamagePremium',
      'motor.thirdPartyPremium',
      'motor.personalAccidentPremium',
      'motor.addonPremium',
      'motor.discount',
      'motor.loading',
      'motor.cess',
      'motor.zeroDepreciation',
      'motor.engineProtection',
      'motor.roadsideAssistance',
      'motor.consumables',
      'motor.returnToInvoice',
      'motor.ncbProtector',
      'motor.tyreProtector',
      'motor.keyReplacement',
      'motor.personalBelongings',
      'motor.personalAccidentCover',
      'broker.brokerAgency',
      'broker.agentName',
      'broker.subAgent',
      'broker.brokerCode',
      'broker.agentCode',
      'payment.paymentStatus',
      'payment.paymentMethod',
      'payment.transactionReference',
      'payment.receiptNumber'
    ],
    customFields: [
      { key: 'motor.registrationNumber', label: 'Vehicle Registration No.', type: FIELD_TYPES.TEXT, category: FIELD_CATEGORIES.MOTOR, required: true, placeholder: 'e.g. RJ60CE5618' },
      { key: 'motor.vehicleCategory', label: 'Vehicle Category', type: FIELD_TYPES.TEXT, category: FIELD_CATEGORIES.MOTOR, placeholder: 'Private Car' },
      { key: 'motor.make', label: 'Manufacturer / Make', type: FIELD_TYPES.TEXT, category: FIELD_CATEGORIES.MOTOR, placeholder: 'e.g. Hyundai / Maruti Suzuki' },
      { key: 'motor.model', label: 'Model', type: FIELD_TYPES.TEXT, category: FIELD_CATEGORIES.MOTOR, placeholder: 'e.g. Creta / Baleno' },
      { key: 'motor.variant', label: 'Variant', type: FIELD_TYPES.TEXT, category: FIELD_CATEGORIES.MOTOR, placeholder: 'e.g. 1.5 SX (O)' },
      { key: 'motor.fuelType', label: 'Fuel Type', type: FIELD_TYPES.SELECT, category: FIELD_CATEGORIES.MOTOR, options: [{ label: 'Petrol', value: 'Petrol' }, { label: 'Diesel', value: 'Diesel' }, { label: 'CNG', value: 'CNG' }, { label: 'Electric', value: 'Electric' }, { label: 'Hybrid', value: 'Hybrid' }] },
      { key: 'motor.cubicCapacity', label: 'Engine CC', type: FIELD_TYPES.NUMBER, category: FIELD_CATEGORIES.MOTOR },
      { key: 'motor.seatingCapacity', label: 'Seating Capacity', type: FIELD_TYPES.NUMBER, category: FIELD_CATEGORIES.MOTOR },
      { key: 'motor.manufacturingYear', label: 'Manufacturing Year', type: FIELD_TYPES.NUMBER, category: FIELD_CATEGORIES.MOTOR },
      { key: 'motor.registrationDate', label: 'Registration Date', type: FIELD_TYPES.DATE, category: FIELD_CATEGORIES.MOTOR },
      { key: 'motor.rtoCode', label: 'RTO Code', type: FIELD_TYPES.TEXT, category: FIELD_CATEGORIES.MOTOR, placeholder: 'e.g. RJ60' },
      { key: 'motor.rtoName', label: 'RTO Name / City', type: FIELD_TYPES.TEXT, category: FIELD_CATEGORIES.MOTOR, placeholder: 'e.g. Jaipur' },
      { key: 'motor.engineNumber', label: 'Engine Number', type: FIELD_TYPES.TEXT, category: FIELD_CATEGORIES.MOTOR },
      { key: 'motor.chassisNumber', label: 'Chassis / VIN Number', type: FIELD_TYPES.TEXT, category: FIELD_CATEGORIES.MOTOR },
      { key: 'motor.idv', label: 'Insured Declared Value - IDV (INR)', type: FIELD_TYPES.CURRENCY, category: FIELD_CATEGORIES.MOTOR, required: true },
      { key: 'motor.currentNcbPercentage', label: 'Current NCB (%)', type: FIELD_TYPES.NUMBER, category: FIELD_CATEGORIES.MOTOR, placeholder: '0 to 50%' },
      { key: 'motor.ownDamagePremium', label: 'Own Damage (OD) Premium', type: FIELD_TYPES.CURRENCY, category: FIELD_CATEGORIES.FINANCIAL },
      { key: 'motor.thirdPartyPremium', label: 'Third Party (TP) Premium', type: FIELD_TYPES.CURRENCY, category: FIELD_CATEGORIES.FINANCIAL },
      { key: 'motor.addonPremium', label: 'Add-on Covers Premium', type: FIELD_TYPES.CURRENCY, category: FIELD_CATEGORIES.FINANCIAL },
      { key: 'motor.zeroDepreciation', label: 'Zero Depreciation (Nil Dep)', type: FIELD_TYPES.BOOLEAN, category: FIELD_CATEGORIES.COVERAGE },
      { key: 'motor.engineProtection', label: 'Engine Protection', type: FIELD_TYPES.BOOLEAN, category: FIELD_CATEGORIES.COVERAGE },
      { key: 'motor.roadsideAssistance', label: '24x7 Roadside Assistance', type: FIELD_TYPES.BOOLEAN, category: FIELD_CATEGORIES.COVERAGE },
      { key: 'motor.consumables', label: 'Consumables Cover', type: FIELD_TYPES.BOOLEAN, category: FIELD_CATEGORIES.COVERAGE },
      { key: 'motor.returnToInvoice', label: 'Return to Invoice', type: FIELD_TYPES.BOOLEAN, category: FIELD_CATEGORIES.COVERAGE }
    ]
  },

  // 10. Two-Wheeler
  'two_wheeler': {
    type: 'motor',
    subtype: 'two_wheeler',
    name: 'Two-Wheeler Insurance (Bike / Scooter)',
    entities: {
      hasMembers: false,
      hasVehicle: true,
      hasLifeDetails: false,
      hasTravelDetails: false,
      hasPropertyDetails: false
    },
    sections: ['customer', 'vehicle', 'policy', 'coverage', 'premium', 'nominee', 'crm'],
    fieldKeys: [
      ...COMMON_BASE_FIELD_KEYS,
      'motor.registrationNumber',
      'motor.vehicleType',
      'motor.vehicleCategory',
      'motor.make',
      'motor.model',
      'motor.variant',
      'motor.fuelType',
      'motor.cubicCapacity',
      'motor.manufacturingYear',
      'motor.registrationDate',
      'motor.rtoCode',
      'motor.rtoName',
      'motor.engineNumber',
      'motor.chassisNumber',
      'motor.idv',
      'motor.currentNcbPercentage',
      'motor.previousInsurer',
      'motor.previousPolicyNumber',
      'motor.ownDamagePremium',
      'motor.thirdPartyPremium',
      'motor.zeroDepreciation',
      'motor.personalAccidentCover'
    ],
    customFields: [
      { key: 'motor.registrationNumber', label: 'Registration Number', type: FIELD_TYPES.TEXT, category: FIELD_CATEGORIES.MOTOR, required: true },
      { key: 'motor.make', label: 'Make', type: FIELD_TYPES.TEXT, category: FIELD_CATEGORIES.MOTOR },
      { key: 'motor.model', label: 'Model', type: FIELD_TYPES.TEXT, category: FIELD_CATEGORIES.MOTOR },
      { key: 'motor.variant', label: 'Variant', type: FIELD_TYPES.TEXT, category: FIELD_CATEGORIES.MOTOR },
      { key: 'motor.cubicCapacity', label: 'Cubic Capacity (CC)', type: FIELD_TYPES.NUMBER, category: FIELD_CATEGORIES.MOTOR },
      { key: 'motor.engineNumber', label: 'Engine Number', type: FIELD_TYPES.TEXT, category: FIELD_CATEGORIES.MOTOR },
      { key: 'motor.chassisNumber', label: 'Chassis Number', type: FIELD_TYPES.TEXT, category: FIELD_CATEGORIES.MOTOR },
      { key: 'motor.idv', label: 'IDV (INR)', type: FIELD_TYPES.CURRENCY, category: FIELD_CATEGORIES.MOTOR, required: true },
      { key: 'motor.currentNcbPercentage', label: 'NCB (%)', type: FIELD_TYPES.NUMBER, category: FIELD_CATEGORIES.MOTOR },
      { key: 'motor.ownDamagePremium', label: 'Own Damage Premium', type: FIELD_TYPES.CURRENCY, category: FIELD_CATEGORIES.FINANCIAL },
      { key: 'motor.thirdPartyPremium', label: 'Third Party Premium', type: FIELD_TYPES.CURRENCY, category: FIELD_CATEGORIES.FINANCIAL },
      { key: 'motor.zeroDepreciation', label: 'Zero Depreciation', type: FIELD_TYPES.BOOLEAN, category: FIELD_CATEGORIES.COVERAGE }
    ]
  },

  // 11. Commercial Vehicle
  'commercial_vehicle': {
    type: 'motor',
    subtype: 'commercial_vehicle',
    name: 'Commercial Vehicle Insurance (GCV / PCV)',
    entities: {
      hasMembers: false,
      hasVehicle: true,
      hasLifeDetails: false,
      hasTravelDetails: false,
      hasPropertyDetails: false
    },
    sections: ['customer', 'vehicle', 'policy', 'coverage', 'premium', 'nominee', 'crm'],
    fieldKeys: [
      ...COMMON_BASE_FIELD_KEYS,
      'motor.registrationNumber',
      'motor.vehicleType',
      'motor.vehicleCategory',
      'motor.make',
      'motor.model',
      'motor.variant',
      'motor.gvw',
      'motor.carryingCapacity',
      'motor.passengerCapacity',
      'motor.permitType',
      'motor.permitValidity',
      'motor.routeArea',
      'motor.fitnessExpiry',
      'motor.engineNumber',
      'motor.chassisNumber',
      'motor.idv',
      'motor.currentNcbPercentage',
      'motor.ownDamagePremium',
      'motor.thirdPartyPremium'
    ],
    customFields: [
      { key: 'motor.registrationNumber', label: 'Registration Number', type: FIELD_TYPES.TEXT, category: FIELD_CATEGORIES.MOTOR, required: true },
      { key: 'motor.vehicleCategory', label: 'Vehicle Category (Goods / Passenger Carrier)', type: FIELD_TYPES.TEXT, category: FIELD_CATEGORIES.MOTOR },
      { key: 'motor.gvw', label: 'Gross Vehicle Weight (GVW in Kg)', type: FIELD_TYPES.NUMBER, category: FIELD_CATEGORIES.MOTOR },
      { key: 'motor.carryingCapacity', label: 'Carrying Capacity (Tons / Kg)', type: FIELD_TYPES.NUMBER, category: FIELD_CATEGORIES.MOTOR },
      { key: 'motor.passengerCapacity', label: 'Seating / Passenger Capacity', type: FIELD_TYPES.NUMBER, category: FIELD_CATEGORIES.MOTOR },
      { key: 'motor.permitType', label: 'Permit Category', type: FIELD_TYPES.TEXT, category: FIELD_CATEGORIES.MOTOR, placeholder: 'National Permit / State Permit' },
      { key: 'motor.permitValidity', label: 'Permit Validity Date', type: FIELD_TYPES.DATE, category: FIELD_CATEGORIES.MOTOR },
      { key: 'motor.routeArea', label: 'Authorized Route / Area', type: FIELD_TYPES.TEXT, category: FIELD_CATEGORIES.MOTOR },
      { key: 'motor.fitnessExpiry', label: 'Fitness Certificate Expiry Date', type: FIELD_TYPES.DATE, category: FIELD_CATEGORIES.MOTOR },
      { key: 'motor.idv', label: 'IDV (INR)', type: FIELD_TYPES.CURRENCY, category: FIELD_CATEGORIES.MOTOR, required: true },
      { key: 'motor.currentNcbPercentage', label: 'NCB (%)', type: FIELD_TYPES.NUMBER, category: FIELD_CATEGORIES.MOTOR }
    ]
  },

  // -------------------------------------------------------------
  // LIFE INSURANCE (9 Subtypes)
  // -------------------------------------------------------------

  // 12. Term Insurance
  'term': {
    type: 'life',
    subtype: 'term',
    name: 'Term Life Insurance (Pure Protection)',
    entities: {
      hasMembers: false,
      hasVehicle: false,
      hasLifeDetails: true,
      hasTravelDetails: false,
      hasPropertyDetails: false
    },
    sections: ['customer', 'policy', 'life', 'premium', 'nominee'],
    fieldKeys: [
      ...COMMON_BASE_FIELD_KEYS,
      'life.uin',
      'life.policyTermYears',
      'life.premiumPaymentTermYears',
      'life.deathBenefit',
      'life.smokerStatus',
      'life.accidentalDeathRider',
      'life.criticalIllnessRider',
      'life.waiverOfPremiumRider'
    ],
    customFields: [
      { key: 'life.uin', label: 'IRDAI UIN Code', type: FIELD_TYPES.TEXT, category: FIELD_CATEGORIES.POLICY, placeholder: 'e.g. 101N101V01' },
      { key: 'life.policyTermYears', label: 'Policy Term (Years)', type: FIELD_TYPES.NUMBER, category: FIELD_CATEGORIES.LIFE, required: true, placeholder: 'e.g. 35' },
      { key: 'life.premiumPaymentTermYears', label: 'Premium Payment Term - PPT (Years)', type: FIELD_TYPES.NUMBER, category: FIELD_CATEGORIES.LIFE, required: true, placeholder: 'e.g. 10 (Limited Pay) or 35 (Regular)' },
      { key: 'life.deathBenefit', label: 'Death Benefit Structure', type: FIELD_TYPES.TEXT, category: FIELD_CATEGORIES.LIFE, placeholder: 'Lump-sum / Monthly Income' },
      { key: 'life.smokerStatus', label: 'Tobacco / Smoker Status', type: FIELD_TYPES.SELECT, category: FIELD_CATEGORIES.LIFE, options: [{ label: 'Non-Smoker', value: 'non_smoker' }, { label: 'Smoker', value: 'smoker' }] },
      { key: 'life.accidentalDeathRider', label: 'Accidental Death Benefit Rider (INR)', type: FIELD_TYPES.CURRENCY, category: FIELD_CATEGORIES.LIFE },
      { key: 'life.criticalIllnessRider', label: 'Critical Illness Rider (INR)', type: FIELD_TYPES.CURRENCY, category: FIELD_CATEGORIES.LIFE },
      { key: 'life.waiverOfPremiumRider', label: 'Waiver of Premium (WOP) Rider', type: FIELD_TYPES.BOOLEAN, category: FIELD_CATEGORIES.LIFE }
    ]
  },

  // 13. Term with Return of Premium (TROP)
  'term_return_of_premium': {
    type: 'life',
    subtype: 'term_return_of_premium',
    name: 'Term Insurance with Return of Premium (TROP)',
    entities: {
      hasMembers: false,
      hasVehicle: false,
      hasLifeDetails: true,
      hasTravelDetails: false,
      hasPropertyDetails: false
    },
    sections: ['customer', 'policy', 'life', 'premium', 'nominee'],
    fieldKeys: [
      ...COMMON_BASE_FIELD_KEYS,
      'life.uin',
      'life.policyTermYears',
      'life.premiumPaymentTermYears',
      'life.maturityDate',
      'life.maturityAmount',
      'life.returnOfPremiumBenefit'
    ],
    customFields: [
      { key: 'life.uin', label: 'IRDAI UIN', type: FIELD_TYPES.TEXT, category: FIELD_CATEGORIES.POLICY },
      { key: 'life.policyTermYears', label: 'Policy Term (Years)', type: FIELD_TYPES.NUMBER, category: FIELD_CATEGORIES.LIFE, required: true },
      { key: 'life.premiumPaymentTermYears', label: 'PPT (Years)', type: FIELD_TYPES.NUMBER, category: FIELD_CATEGORIES.LIFE, required: true },
      { key: 'life.maturityDate', label: 'Maturity Date', type: FIELD_TYPES.DATE, category: FIELD_CATEGORIES.LIFE },
      { key: 'life.maturityAmount', label: 'Maturity Refund Amount (100% of Premiums)', type: FIELD_TYPES.CURRENCY, category: FIELD_CATEGORIES.LIFE },
      { key: 'life.returnOfPremiumBenefit', label: 'Return of Premium Terms', type: FIELD_TYPES.TEXT, category: FIELD_CATEGORIES.LIFE, placeholder: '100% of Total Basic Premiums Paid' }
    ]
  },

  // 14. Whole Life
  'whole_life': {
    type: 'life',
    subtype: 'whole_life',
    name: 'Whole Life Insurance (Up to Age 99/100)',
    entities: {
      hasMembers: false,
      hasVehicle: false,
      hasLifeDetails: true,
      hasTravelDetails: false,
      hasPropertyDetails: false
    },
    sections: ['customer', 'policy', 'life', 'premium', 'nominee'],
    fieldKeys: [
      ...COMMON_BASE_FIELD_KEYS,
      'life.premiumPaymentTermYears',
      'life.maturityAge',
      'life.guaranteedAdditions',
      'life.bonusAccrued',
      'life.surrenderValue',
      'life.loanValue'
    ],
    customFields: [
      { key: 'life.premiumPaymentTermYears', label: 'PPT (Years)', type: FIELD_TYPES.NUMBER, category: FIELD_CATEGORIES.LIFE, required: true },
      { key: 'life.maturityAge', label: 'Maturity Age', type: FIELD_TYPES.NUMBER, category: FIELD_CATEGORIES.LIFE, placeholder: 'e.g. 100 Years' },
      { key: 'life.guaranteedAdditions', label: 'Guaranteed Additions (INR)', type: FIELD_TYPES.CURRENCY, category: FIELD_CATEGORIES.LIFE },
      { key: 'life.bonusAccrued', label: 'Simple / Compound Reversionary Bonus (INR)', type: FIELD_TYPES.CURRENCY, category: FIELD_CATEGORIES.LIFE },
      { key: 'life.surrenderValue', label: 'Guaranteed Surrender Value', type: FIELD_TYPES.CURRENCY, category: FIELD_CATEGORIES.LIFE },
      { key: 'life.loanValue', label: 'Eligible Policy Loan Facility', type: FIELD_TYPES.TEXT, category: FIELD_CATEGORIES.LIFE }
    ]
  },

  // 15. Endowment
  'endowment': {
    type: 'life',
    subtype: 'endowment',
    name: 'Endowment Savings Plan',
    entities: {
      hasMembers: false,
      hasVehicle: false,
      hasLifeDetails: true,
      hasTravelDetails: false,
      hasPropertyDetails: false
    },
    sections: ['customer', 'policy', 'life', 'premium', 'nominee'],
    fieldKeys: [
      ...COMMON_BASE_FIELD_KEYS,
      'life.policyTermYears',
      'life.premiumPaymentTermYears',
      'life.maturityDate',
      'life.guaranteedMaturityBenefit',
      'life.nonGuaranteedBonusEstimate',
      'life.paidUpValue'
    ],
    customFields: [
      { key: 'life.policyTermYears', label: 'Policy Term (Years)', type: FIELD_TYPES.NUMBER, category: FIELD_CATEGORIES.LIFE, required: true },
      { key: 'life.premiumPaymentTermYears', label: 'PPT (Years)', type: FIELD_TYPES.NUMBER, category: FIELD_CATEGORIES.LIFE, required: true },
      { key: 'life.maturityDate', label: 'Maturity Date', type: FIELD_TYPES.DATE, category: FIELD_CATEGORIES.LIFE, required: true },
      { key: 'life.guaranteedMaturityBenefit', label: 'Guaranteed Maturity Benefit (Sum Assured)', type: FIELD_TYPES.CURRENCY, category: FIELD_CATEGORIES.LIFE, required: true },
      { key: 'life.nonGuaranteedBonusEstimate', label: 'Estimated Reversionary / Terminal Bonus', type: FIELD_TYPES.CURRENCY, category: FIELD_CATEGORIES.LIFE },
      { key: 'life.paidUpValue', label: 'Paid-Up Policy Value', type: FIELD_TYPES.CURRENCY, category: FIELD_CATEGORIES.LIFE }
    ]
  },

  // 16. Money Back
  'money_back': {
    type: 'life',
    subtype: 'money_back',
    name: 'Money Back Anticipated Endowment Plan',
    entities: {
      hasMembers: false,
      hasVehicle: false,
      hasLifeDetails: true,
      hasTravelDetails: false,
      hasPropertyDetails: false
    },
    sections: ['customer', 'policy', 'life', 'premium', 'nominee'],
    fieldKeys: [
      ...COMMON_BASE_FIELD_KEYS,
      'life.policyTermYears',
      'life.premiumPaymentTermYears',
      'life.survivalBenefitSchedule',
      'life.survivalBenefitPercentage',
      'life.finalMaturityBenefit'
    ],
    customFields: [
      { key: 'life.policyTermYears', label: 'Policy Term (Years)', type: FIELD_TYPES.NUMBER, category: FIELD_CATEGORIES.LIFE, required: true },
      { key: 'life.premiumPaymentTermYears', label: 'PPT (Years)', type: FIELD_TYPES.NUMBER, category: FIELD_CATEGORIES.LIFE, required: true },
      { key: 'life.survivalBenefitSchedule', label: 'Periodic Survival Payout Schedule', type: FIELD_TYPES.TEXT, category: FIELD_CATEGORIES.LIFE, placeholder: 'e.g. 20% at 5th, 10th, 15th year' },
      { key: 'life.survivalBenefitPercentage', label: 'Periodic Payout Percentage (% of SI)', type: FIELD_TYPES.NUMBER, category: FIELD_CATEGORIES.LIFE },
      { key: 'life.finalMaturityBenefit', label: 'Final Maturity Balance + Bonus (INR)', type: FIELD_TYPES.CURRENCY, category: FIELD_CATEGORIES.LIFE }
    ]
  },

  // 17. ULIP
  'ulip': {
    type: 'life',
    subtype: 'ulip',
    name: 'Unit Linked Insurance Plan (ULIP)',
    entities: {
      hasMembers: false,
      hasVehicle: false,
      hasLifeDetails: true,
      hasTravelDetails: false,
      hasPropertyDetails: false
    },
    sections: ['customer', 'policy', 'life', 'premium', 'nominee'],
    fieldKeys: [
      ...COMMON_BASE_FIELD_KEYS,
      'life.policyTermYears',
      'life.premiumPaymentTermYears',
      'life.fundName',
      'life.fundType',
      'life.unitsHeld',
      'life.nav',
      'life.totalFundValue',
      'life.premiumAllocationCharge',
      'life.partialWithdrawalTerms'
    ],
    customFields: [
      { key: 'life.policyTermYears', label: 'Policy Term (Years)', type: FIELD_TYPES.NUMBER, category: FIELD_CATEGORIES.LIFE, required: true },
      { key: 'life.premiumPaymentTermYears', label: 'PPT (Years)', type: FIELD_TYPES.NUMBER, category: FIELD_CATEGORIES.LIFE, required: true },
      { key: 'life.fundName', label: 'Selected Fund(s) Name', type: FIELD_TYPES.TEXT, category: FIELD_CATEGORIES.LIFE, placeholder: 'e.g. Multi Cap Growth Fund' },
      { key: 'life.fundType', label: 'Fund Asset Category', type: FIELD_TYPES.SELECT, category: FIELD_CATEGORIES.LIFE, options: [{ label: 'Equity / Growth', value: 'equity' }, { label: 'Debt / Bond', value: 'debt' }, { label: 'Balanced / Hybrid', value: 'balanced' }] },
      { key: 'life.unitsHeld', label: 'Accumulated Units Count', type: FIELD_TYPES.NUMBER, category: FIELD_CATEGORIES.LIFE },
      { key: 'life.nav', label: 'Latest Unit NAV (INR)', type: FIELD_TYPES.CURRENCY, category: FIELD_CATEGORIES.LIFE },
      { key: 'life.totalFundValue', label: 'Current Fund Value (INR)', type: FIELD_TYPES.CURRENCY, category: FIELD_CATEGORIES.LIFE },
      { key: 'life.premiumAllocationCharge', label: 'Allocation Charges (%)', type: FIELD_TYPES.TEXT, category: FIELD_CATEGORIES.LIFE },
      { key: 'life.partialWithdrawalTerms', label: 'Partial Withdrawal Eligibility', type: FIELD_TYPES.TEXT, category: FIELD_CATEGORIES.LIFE, placeholder: 'Allowed post 5-year lock-in' }
    ]
  },

  // 18. Child Insurance
  'child_insurance': {
    type: 'life',
    subtype: 'child_insurance',
    name: 'Child Education & Future Insurance',
    entities: {
      hasMembers: false,
      hasVehicle: false,
      hasLifeDetails: true,
      hasTravelDetails: false,
      hasPropertyDetails: false
    },
    sections: ['customer', 'policy', 'life', 'premium', 'nominee'],
    fieldKeys: [
      ...COMMON_BASE_FIELD_KEYS,
      'life.childName',
      'life.childDob',
      'life.childAge',
      'life.educationMilestoneBenefit',
      'life.waiverOfPremiumOnParentDeath'
    ],
    customFields: [
      { key: 'life.childName', label: "Child (Beneficiary) Full Name", type: FIELD_TYPES.TEXT, category: FIELD_CATEGORIES.LIFE, required: true },
      { key: 'life.childDob', label: "Child's Date of Birth", type: FIELD_TYPES.DATE, category: FIELD_CATEGORIES.LIFE, required: true },
      { key: 'life.childAge', label: "Child's Current Age", type: FIELD_TYPES.NUMBER, category: FIELD_CATEGORIES.LIFE },
      { key: 'life.educationMilestoneBenefit', label: 'Milestone Education Payout Schedule', type: FIELD_TYPES.TEXT, category: FIELD_CATEGORIES.LIFE, placeholder: 'Payout at ages 18, 20, 22' },
      { key: 'life.waiverOfPremiumOnParentDeath', label: 'Inbuilt WOP on Proposer Death', type: FIELD_TYPES.BOOLEAN, category: FIELD_CATEGORIES.LIFE }
    ]
  },

  // 19. Pension / Annuity
  'pension_annuity': {
    type: 'life',
    subtype: 'pension_annuity',
    name: 'Pension / Annuity Plan (Retirement)',
    entities: {
      hasMembers: false,
      hasVehicle: false,
      hasLifeDetails: true,
      hasTravelDetails: false,
      hasPropertyDetails: false
    },
    sections: ['customer', 'policy', 'life', 'premium', 'nominee'],
    fieldKeys: [
      ...COMMON_BASE_FIELD_KEYS,
      'life.annuityType',
      'life.annuityAmount',
      'life.annuityFrequency',
      'life.annuityCommencementDate',
      'life.purchasePrice',
      'life.returnOfPurchasePrice',
      'life.jointLifeDetails'
    ],
    customFields: [
      { key: 'life.annuityType', label: 'Annuity Classification', type: FIELD_TYPES.SELECT, category: FIELD_CATEGORIES.LIFE, options: [{ label: 'Immediate Annuity', value: 'immediate' }, { label: 'Deferred Annuity', value: 'deferred' }] },
      { key: 'life.annuityAmount', label: 'Guaranteed Annuity / Pension (INR)', type: FIELD_TYPES.CURRENCY, category: FIELD_CATEGORIES.LIFE, required: true },
      { key: 'life.annuityFrequency', label: 'Pension Payout Frequency', type: FIELD_TYPES.SELECT, category: FIELD_CATEGORIES.LIFE, options: [{ label: 'Monthly', value: 'monthly' }, { label: 'Quarterly', value: 'quarterly' }, { label: 'Yearly', value: 'yearly' }] },
      { key: 'life.annuityCommencementDate', label: 'Annuity Start / Vesting Date', type: FIELD_TYPES.DATE, category: FIELD_CATEGORIES.LIFE, required: true },
      { key: 'life.purchasePrice', label: 'Purchase Price / Corpus (INR)', type: FIELD_TYPES.CURRENCY, category: FIELD_CATEGORIES.LIFE },
      { key: 'life.returnOfPurchasePrice', label: 'Return of Purchase Price (ROPP) to Nominee', type: FIELD_TYPES.BOOLEAN, category: FIELD_CATEGORIES.LIFE },
      { key: 'life.jointLifeDetails', label: 'Joint Life Secondary Annuitant', type: FIELD_TYPES.TEXT, category: FIELD_CATEGORIES.LIFE, placeholder: 'Spouse name & DOB if Joint Life' }
    ]
  },

  // 20. Group Life
  'group_life': {
    type: 'life',
    subtype: 'group_life',
    name: 'Group Life / Group Term (GTL)',
    entities: {
      hasMembers: false,
      hasVehicle: false,
      hasLifeDetails: true,
      hasTravelDetails: false,
      hasPropertyDetails: false
    },
    sections: ['customer', 'policy', 'life', 'premium', 'nominee'],
    fieldKeys: [
      ...COMMON_BASE_FIELD_KEYS,
      'life.masterPolicyNumber',
      'life.employerName',
      'life.employeeId',
      'life.groupTermCoverage'
    ],
    customFields: [
      { key: 'life.masterPolicyNumber', label: 'Master Policy Number', type: FIELD_TYPES.TEXT, category: FIELD_CATEGORIES.POLICY },
      { key: 'life.employerName', label: 'Corporate Group / Employer', type: FIELD_TYPES.TEXT, category: FIELD_CATEGORIES.POLICY },
      { key: 'life.employeeId', label: 'Member / Employee Code', type: FIELD_TYPES.TEXT, category: FIELD_CATEGORIES.CUSTOMER },
      { key: 'life.groupTermCoverage', label: 'Coverage Multiplier (e.g. 3x Annual CTC)', type: FIELD_TYPES.TEXT, category: FIELD_CATEGORIES.LIFE }
    ]
  },

  // -------------------------------------------------------------
  // GENERAL INSURANCE (2 Subtypes)
  // -------------------------------------------------------------

  // 21. Travel Insurance
  'travel': {
    type: 'general',
    subtype: 'travel',
    name: 'Travel Insurance (Overseas / Domestic)',
    entities: {
      hasMembers: true,
      hasVehicle: false,
      hasLifeDetails: false,
      hasTravelDetails: true,
      hasPropertyDetails: false
    },
    sections: ['customer', 'policy', 'travel', 'coverage', 'premium', 'nominee'],
    fieldKeys: [
      ...COMMON_BASE_FIELD_KEYS,
      'travel.passportNumber',
      'travel.nationality',
      'travel.destinationCountry',
      'travel.destinationRegion',
      'travel.tripDurationDays',
      'travel.tripType',
      'travel.medicalExpensesLimit',
      'travel.baggageLossLimit',
      'travel.tripCancellationCover',
      'travel.personalLiabilityLimit'
    ],
    customFields: [
      { key: 'travel.passportNumber', label: 'Passport Number', type: FIELD_TYPES.TEXT, category: FIELD_CATEGORIES.TRAVEL, required: true },
      { key: 'travel.nationality', label: 'Nationality', type: FIELD_TYPES.TEXT, category: FIELD_CATEGORIES.TRAVEL, placeholder: 'Indian' },
      { key: 'travel.destinationCountry', label: 'Destination Country / Countries', type: FIELD_TYPES.TEXT, category: FIELD_CATEGORIES.TRAVEL, required: true, placeholder: 'e.g. United States, Schengen, UAE' },
      { key: 'travel.destinationRegion', label: 'Geographical Region', type: FIELD_TYPES.SELECT, category: FIELD_CATEGORIES.TRAVEL, options: [{ label: 'Worldwide incl. USA & Canada', value: 'worldwide_inc_usa' }, { label: 'Worldwide excl. USA & Canada', value: 'worldwide_exc_usa' }, { label: 'Schengen Countries', value: 'schengen' }, { label: 'Asia', value: 'asia' }] },
      { key: 'travel.tripDurationDays', label: 'Trip Duration (Days)', type: FIELD_TYPES.NUMBER, category: FIELD_CATEGORIES.TRAVEL, required: true },
      { key: 'travel.tripType', label: 'Trip Type', type: FIELD_TYPES.SELECT, category: FIELD_CATEGORIES.TRAVEL, options: [{ label: 'Single Trip', value: 'single_trip' }, { label: 'Multi-Trip Annual', value: 'multi_trip_annual' }, { label: 'Student Overseas', value: 'student' }] },
      { key: 'travel.medicalExpensesLimit', label: 'Emergency Medical Cover (USD / EUR / INR)', type: FIELD_TYPES.TEXT, category: FIELD_CATEGORIES.COVERAGE, placeholder: 'e.g. $100,000' },
      { key: 'travel.baggageLossLimit', label: 'Checked Baggage Loss / Delay (USD)', type: FIELD_TYPES.TEXT, category: FIELD_CATEGORIES.COVERAGE },
      { key: 'travel.tripCancellationCover', label: 'Trip Cancellation / Interruption (USD)', type: FIELD_TYPES.TEXT, category: FIELD_CATEGORIES.COVERAGE },
      { key: 'travel.personalLiabilityLimit', label: 'Personal Liability Cover (USD)', type: FIELD_TYPES.TEXT, category: FIELD_CATEGORIES.COVERAGE }
    ]
  },

  // 22. Home / Property Insurance
  'home_property': {
    type: 'general',
    subtype: 'home_property',
    name: 'Home & Property Insurance (Bharat Griha Raksha)',
    entities: {
      hasMembers: false,
      hasVehicle: false,
      hasLifeDetails: false,
      hasTravelDetails: false,
      hasPropertyDetails: true
    },
    sections: ['customer', 'policy', 'property', 'coverage', 'premium', 'nominee'],
    fieldKeys: [
      ...COMMON_BASE_FIELD_KEYS,
      'property.propertyAddress',
      'property.propertyType',
      'property.occupancyType',
      'property.builtUpAreaSqFt',
      'property.buildingSumInsured',
      'property.contentsSumInsured',
      'property.earthquakeCover',
      'property.floodStormCover',
      'property.theftBurglaryCover'
    ],
    customFields: [
      { key: 'property.propertyAddress', label: 'Insured Property Full Address', type: FIELD_TYPES.TEXT, category: FIELD_CATEGORIES.PROPERTY, required: true },
      { key: 'property.propertyType', label: 'Structure Type', type: FIELD_TYPES.SELECT, category: FIELD_CATEGORIES.PROPERTY, options: [{ label: 'Apartment / Flat', value: 'flat' }, { label: 'Independent Villa / House', value: 'villa' }, { label: 'Commercial Office', value: 'commercial' }] },
      { key: 'property.occupancyType', label: 'Occupancy', type: FIELD_TYPES.SELECT, category: FIELD_CATEGORIES.PROPERTY, options: [{ label: 'Self Occupied', value: 'self_occupied' }, { label: 'Tenant Occupied', value: 'tenant' }, { label: 'Vacant', value: 'vacant' }] },
      { key: 'property.builtUpAreaSqFt', label: 'Built-up Carpet Area (Sq. Ft.)', type: FIELD_TYPES.NUMBER, category: FIELD_CATEGORIES.PROPERTY },
      { key: 'property.buildingSumInsured', label: 'Building Structure Sum Insured (INR)', type: FIELD_TYPES.CURRENCY, category: FIELD_CATEGORIES.COVERAGE, required: true },
      { key: 'property.contentsSumInsured', label: 'Home Contents Sum Insured (INR)', type: FIELD_TYPES.CURRENCY, category: FIELD_CATEGORIES.COVERAGE },
      { key: 'property.earthquakeCover', label: 'Earthquake (STFI) Peril Cover', type: FIELD_TYPES.BOOLEAN, category: FIELD_CATEGORIES.COVERAGE },
      { key: 'property.floodStormCover', label: 'Flood / Storm / Inundation Cover', type: FIELD_TYPES.BOOLEAN, category: FIELD_CATEGORIES.COVERAGE },
      { key: 'property.theftBurglaryCover', label: 'Burglary & Housebreaking Cover', type: FIELD_TYPES.BOOLEAN, category: FIELD_CATEGORIES.COVERAGE }
    ]
  }
};

// Helper to get schema for any of the 22 subtypes
const getSubtypeSchema = (subtypeCode) => {
  if (!subtypeCode) return SUBTYPE_SCHEMAS['individual_health'];
  const code = subtypeCode.toLowerCase().trim();
  return SUBTYPE_SCHEMAS[code] || SUBTYPE_SCHEMAS['individual_health'];
};

module.exports = {
  SUBTYPE_SCHEMAS,
  getSubtypeSchema
};
