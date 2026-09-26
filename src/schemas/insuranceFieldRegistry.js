/**
 * INSecure Field Registry
 * Reusable field definitions for schema-driven validation, OCR mapping, and dynamic form generation.
 */

const FIELD_TYPES = Object.freeze({
  TEXT: 'text',
  NUMBER: 'number',
  CURRENCY: 'currency',
  DATE: 'date',
  SELECT: 'select',
  BOOLEAN: 'boolean',
  ARRAY: 'array',
  OBJECT: 'object'
});

const FIELD_CATEGORIES = Object.freeze({
  CUSTOMER: 'customer',
  POLICY: 'policy',
  FINANCIAL: 'financial',
  COVERAGE: 'coverage',
  MEMBERS: 'members',
  MOTOR: 'motor',
  LIFE: 'life',
  TRAVEL: 'travel',
  PROPERTY: 'property',
  NOMINEE: 'nominee'
});

const FIELD_REGISTRY = Object.freeze({
  // Customer Fields
  'customer.name': {
    key: 'customer.name',
    label: 'Customer / Proposer Full Name',
    type: FIELD_TYPES.TEXT,
    category: FIELD_CATEGORIES.CUSTOMER,
    required: true,
    editable: true,
    confidenceThreshold: 0.75,
    placeholder: 'e.g. Ramesh Chandra Sharma',
    validation: { minLength: 2, maxLength: 80 }
  },
  'customer.mobile': {
    key: 'customer.mobile',
    label: 'Primary Mobile Number',
    type: FIELD_TYPES.TEXT,
    category: FIELD_CATEGORIES.CUSTOMER,
    required: true,
    editable: true,
    confidenceThreshold: 0.8,
    placeholder: '10-digit mobile number',
    validation: { regex: '^[6-9]\\d{9}$', message: 'Enter a valid 10-digit Indian mobile number' }
  },
  'customer.email': {
    key: 'customer.email',
    label: 'Email Address',
    type: FIELD_TYPES.TEXT,
    category: FIELD_CATEGORIES.CUSTOMER,
    required: false,
    editable: true,
    confidenceThreshold: 0.75,
    placeholder: 'customer@domain.com',
    validation: { regex: '^[\\w.-]+@[\\w.-]+\\.[a-zA-Z]{2,}$', message: 'Enter a valid email address' }
  },
  'customer.dob': {
    key: 'customer.dob',
    label: 'Date of Birth',
    type: FIELD_TYPES.DATE,
    category: FIELD_CATEGORIES.CUSTOMER,
    required: false,
    editable: true,
    confidenceThreshold: 0.75
  },
  'customer.gender': {
    key: 'customer.gender',
    label: 'Gender',
    type: FIELD_TYPES.SELECT,
    category: FIELD_CATEGORIES.CUSTOMER,
    options: [
      { label: 'Male', value: 'male' },
      { label: 'Female', value: 'female' },
      { label: 'Other', value: 'other' }
    ],
    required: false,
    editable: true,
    confidenceThreshold: 0.7
  },
  'customer.pan': {
    key: 'customer.pan',
    label: 'Permanent Account Number (PAN)',
    type: FIELD_TYPES.TEXT,
    category: FIELD_CATEGORIES.CUSTOMER,
    required: false,
    editable: true,
    confidenceThreshold: 0.8,
    placeholder: 'ABCDE1234F',
    validation: { regex: '^[A-Z]{5}[0-9]{4}[A-Z]{1}$', message: 'Enter a valid 10-character PAN' }
  },
  'customer.aadhaar': {
    key: 'customer.aadhaar',
    label: 'Aadhaar (Last 4 Digits or Token)',
    type: FIELD_TYPES.TEXT,
    category: FIELD_CATEGORIES.CUSTOMER,
    required: false,
    editable: true,
    confidenceThreshold: 0.75
  },
  'customer.address': {
    key: 'customer.address',
    label: 'Full Residential / Communication Address',
    type: FIELD_TYPES.TEXT,
    category: FIELD_CATEGORIES.CUSTOMER,
    required: false,
    editable: true,
    confidenceThreshold: 0.7
  },
  'customer.city': {
    key: 'customer.city',
    label: 'City',
    type: FIELD_TYPES.TEXT,
    category: FIELD_CATEGORIES.CUSTOMER,
    required: false,
    editable: true,
    confidenceThreshold: 0.75
  },
  'customer.state': {
    key: 'customer.state',
    label: 'State',
    type: FIELD_TYPES.TEXT,
    category: FIELD_CATEGORIES.CUSTOMER,
    required: false,
    editable: true,
    confidenceThreshold: 0.75
  },
  'customer.pincode': {
    key: 'customer.pincode',
    label: 'Pincode',
    type: FIELD_TYPES.TEXT,
    category: FIELD_CATEGORIES.CUSTOMER,
    required: false,
    editable: true,
    confidenceThreshold: 0.75,
    validation: { regex: '^\\d{6}$', message: 'Enter a valid 6-digit Indian PIN code' }
  },

  // Common Policy Fields
  'policy.insurer': {
    key: 'policy.insurer',
    label: 'Insurance Company / Underwriter',
    type: FIELD_TYPES.TEXT,
    category: FIELD_CATEGORIES.POLICY,
    required: true,
    editable: true,
    confidenceThreshold: 0.8,
    placeholder: 'e.g. Tata AIG General Insurance'
  },
  'policy.policyNumber': {
    key: 'policy.policyNumber',
    label: 'Policy Number / Certificate No',
    type: FIELD_TYPES.TEXT,
    category: FIELD_CATEGORIES.POLICY,
    required: true,
    editable: true,
    confidenceThreshold: 0.85,
    placeholder: 'e.g. 7330359466'
  },
  'policy.productName': {
    key: 'policy.productName',
    label: 'Product / Plan Name',
    type: FIELD_TYPES.TEXT,
    category: FIELD_CATEGORIES.POLICY,
    required: false,
    editable: true,
    confidenceThreshold: 0.75,
    placeholder: 'e.g. MediCare Premier / iSelect Smart'
  },
  'policy.businessType': {
    key: 'policy.businessType',
    label: 'Business Classification',
    type: FIELD_TYPES.SELECT,
    category: FIELD_CATEGORIES.POLICY,
    options: [
      { label: 'New Business', value: 'new' },
      { label: 'Renewal', value: 'renewal' },
      { label: 'Rollover', value: 'rollover' },
      { label: 'Portability', value: 'portability' }
    ],
    required: true,
    editable: true,
    confidenceThreshold: 0.8
  },
  'policy.startDate': {
    key: 'policy.startDate',
    label: 'Policy Start / Risk Inception Date',
    type: FIELD_TYPES.DATE,
    category: FIELD_CATEGORIES.POLICY,
    required: true,
    editable: true,
    confidenceThreshold: 0.8
  },
  'policy.endDate': {
    key: 'policy.endDate',
    label: 'Policy Expiry Date',
    type: FIELD_TYPES.DATE,
    category: FIELD_CATEGORIES.POLICY,
    required: true,
    editable: true,
    confidenceThreshold: 0.8
  },
  'policy.renewalDate': {
    key: 'policy.renewalDate',
    label: 'Next Renewal Due Date',
    type: FIELD_TYPES.DATE,
    category: FIELD_CATEGORIES.POLICY,
    required: true,
    editable: true,
    confidenceThreshold: 0.85
  },
  'policy.sumAssured': {
    key: 'policy.sumAssured',
    label: 'Sum Insured / Sum Assured (INR)',
    type: FIELD_TYPES.CURRENCY,
    category: FIELD_CATEGORIES.COVERAGE,
    required: true,
    editable: true,
    confidenceThreshold: 0.8,
    placeholder: 'e.g. 500000'
  },

  // Financial & Premium Fields
  'premium.basicPremium': {
    key: 'premium.basicPremium',
    label: 'Basic / Net Premium (excl. GST)',
    type: FIELD_TYPES.CURRENCY,
    category: FIELD_CATEGORIES.FINANCIAL,
    required: false,
    editable: true,
    confidenceThreshold: 0.75
  },
  'premium.gst': {
    key: 'premium.gst',
    label: 'GST / Tax Amount (18%)',
    type: FIELD_TYPES.CURRENCY,
    category: FIELD_CATEGORIES.FINANCIAL,
    required: false,
    editable: true,
    confidenceThreshold: 0.75
  },
  'premium.finalPremium': {
    key: 'premium.finalPremium',
    label: 'Gross Premium Paid (INR)',
    type: FIELD_TYPES.CURRENCY,
    category: FIELD_CATEGORIES.FINANCIAL,
    required: true,
    editable: true,
    confidenceThreshold: 0.85,
    placeholder: 'e.g. 15127'
  },
  'premium.premiumFrequency': {
    key: 'premium.premiumFrequency',
    label: 'Payment Frequency',
    type: FIELD_TYPES.SELECT,
    category: FIELD_CATEGORIES.FINANCIAL,
    options: [
      { label: 'Yearly / Annual', value: 'yearly' },
      { label: 'Half-Yearly', value: 'half_yearly' },
      { label: 'Quarterly', value: 'quarterly' },
      { label: 'Monthly', value: 'monthly' },
      { label: 'Single Premium', value: 'single' }
    ],
    required: true,
    editable: true,
    confidenceThreshold: 0.8
  },

  // Nominee
  'nominee.name': {
    key: 'nominee.name',
    label: 'Nominee Full Name',
    type: FIELD_TYPES.TEXT,
    category: FIELD_CATEGORIES.NOMINEE,
    required: false,
    editable: true,
    confidenceThreshold: 0.75
  },
  'nominee.relation': {
    key: 'nominee.relation',
    label: 'Relationship with Insured',
    type: FIELD_TYPES.TEXT,
    category: FIELD_CATEGORIES.NOMINEE,
    required: false,
    editable: true,
    confidenceThreshold: 0.75
  },
  'nominee.share': {
    key: 'nominee.share',
    label: 'Entitlement Share (%)',
    type: FIELD_TYPES.NUMBER,
    category: FIELD_CATEGORIES.NOMINEE,
    required: false,
    editable: true,
    confidenceThreshold: 0.8,
    validation: { min: 1, max: 100 }
  },

  // Motor Specific Fields
  'motor.registrationNumber': {
    key: 'motor.registrationNumber',
    label: 'Registration Number',
    type: FIELD_TYPES.TEXT,
    category: FIELD_CATEGORIES.MOTOR,
    required: true,
    editable: true,
    confidenceThreshold: 0.9,
    placeholder: 'e.g. RJ60CE5618'
  },
  'motor.vehicleType': {
    key: 'motor.vehicleType',
    label: 'Vehicle Type',
    type: FIELD_TYPES.SELECT,
    category: FIELD_CATEGORIES.MOTOR,
    options: [
      { label: 'Private Car', value: 'Private Car' },
      { label: 'Two-Wheeler', value: 'Two-Wheeler' },
      { label: 'Commercial Vehicle', value: 'Commercial Vehicle' },
      { label: 'Other Motor', value: 'Other Motor' }
    ],
    required: true,
    editable: true
  },
  'motor.vehicleCategory': {
    key: 'motor.vehicleCategory',
    label: 'Vehicle Category',
    type: FIELD_TYPES.SELECT,
    category: FIELD_CATEGORIES.MOTOR,
    options: [
      { label: 'Private Car', value: 'Private Car' },
      { label: 'Two Wheeler', value: 'Two Wheeler' },
      { label: 'Goods Carrier', value: 'Goods Carrier' },
      { label: 'Passenger Carrier', value: 'Passenger Carrier' },
      { label: 'Miscellaneous', value: 'Miscellaneous' }
    ],
    required: false,
    editable: true
  },
  'motor.make': {
    key: 'motor.make',
    label: 'Make / Manufacturer',
    type: FIELD_TYPES.TEXT,
    category: FIELD_CATEGORIES.MOTOR,
    required: true,
    editable: true,
    placeholder: 'e.g. Maruti Suzuki / Hyundai'
  },
  'motor.model': {
    key: 'motor.model',
    label: 'Model',
    type: FIELD_TYPES.TEXT,
    category: FIELD_CATEGORIES.MOTOR,
    required: true,
    editable: true,
    placeholder: 'e.g. Swift / Creta'
  },
  'motor.variant': {
    key: 'motor.variant',
    label: 'Variant',
    type: FIELD_TYPES.TEXT,
    category: FIELD_CATEGORIES.MOTOR,
    required: false,
    editable: true,
    placeholder: 'e.g. VXI / 1.5 SX(O)'
  },
  'motor.subModel': {
    key: 'motor.subModel',
    label: 'Sub Model',
    type: FIELD_TYPES.TEXT,
    category: FIELD_CATEGORIES.MOTOR,
    required: false,
    editable: true
  },
  'motor.fuelType': {
    key: 'motor.fuelType',
    label: 'Fuel Type',
    type: FIELD_TYPES.SELECT,
    category: FIELD_CATEGORIES.MOTOR,
    options: [
      { label: 'Petrol', value: 'Petrol' },
      { label: 'Diesel', value: 'Diesel' },
      { label: 'CNG', value: 'CNG' },
      { label: 'Electric', value: 'Electric' },
      { label: 'Hybrid', value: 'Hybrid' },
      { label: 'LPG', value: 'LPG' }
    ],
    required: true,
    editable: true
  },
  'motor.cubicCapacity': {
    key: 'motor.cubicCapacity',
    label: 'Cubic Capacity (CC)',
    type: FIELD_TYPES.NUMBER,
    category: FIELD_CATEGORIES.MOTOR,
    required: false,
    editable: true
  },
  'motor.seatingCapacity': {
    key: 'motor.seatingCapacity',
    label: 'Seating Capacity',
    type: FIELD_TYPES.NUMBER,
    category: FIELD_CATEGORIES.MOTOR,
    required: false,
    editable: true
  },
  'motor.numberOfTyres': {
    key: 'motor.numberOfTyres',
    label: 'Number of Tyres',
    type: FIELD_TYPES.NUMBER,
    category: FIELD_CATEGORIES.MOTOR,
    required: false,
    editable: true
  },
  'motor.vehicleColor': {
    key: 'motor.vehicleColor',
    label: 'Vehicle Color',
    type: FIELD_TYPES.TEXT,
    category: FIELD_CATEGORIES.MOTOR,
    required: false,
    editable: true
  },
  'motor.registrationDate': {
    key: 'motor.registrationDate',
    label: 'Registration Date',
    type: FIELD_TYPES.DATE,
    category: FIELD_CATEGORIES.MOTOR,
    required: false,
    editable: true
  },
  'motor.registrationState': {
    key: 'motor.registrationState',
    label: 'Registration State',
    type: FIELD_TYPES.TEXT,
    category: FIELD_CATEGORIES.MOTOR,
    required: false,
    editable: true
  },
  'motor.registrationCity': {
    key: 'motor.registrationCity',
    label: 'Registration City',
    type: FIELD_TYPES.TEXT,
    category: FIELD_CATEGORIES.MOTOR,
    required: false,
    editable: true
  },
  'motor.rtoCode': {
    key: 'motor.rtoCode',
    label: 'RTO Code',
    type: FIELD_TYPES.TEXT,
    category: FIELD_CATEGORIES.MOTOR,
    required: false,
    editable: true,
    placeholder: 'e.g. RJ60'
  },
  'motor.rtoName': {
    key: 'motor.rtoName',
    label: 'RTO Name / Location',
    type: FIELD_TYPES.TEXT,
    category: FIELD_CATEGORIES.MOTOR,
    required: false,
    editable: true,
    placeholder: 'e.g. Jaipur'
  },
  'motor.zone': {
    key: 'motor.zone',
    label: 'Zone (Tariff Zone A/B)',
    type: FIELD_TYPES.TEXT,
    category: FIELD_CATEGORIES.MOTOR,
    required: false,
    editable: true
  },
  'motor.manufacturingMonth': {
    key: 'motor.manufacturingMonth',
    label: 'Manufacturing Month',
    type: FIELD_TYPES.TEXT,
    category: FIELD_CATEGORIES.MOTOR,
    required: false,
    editable: true
  },
  'motor.manufacturingYear': {
    key: 'motor.manufacturingYear',
    label: 'Manufacturing Year',
    type: FIELD_TYPES.NUMBER,
    category: FIELD_CATEGORIES.MOTOR,
    required: false,
    editable: true
  },
  'motor.manufacturingDate': {
    key: 'motor.manufacturingDate',
    label: 'Manufacturing Date',
    type: FIELD_TYPES.DATE,
    category: FIELD_CATEGORIES.MOTOR,
    required: false,
    editable: true
  },
  'motor.engineNumber': {
    key: 'motor.engineNumber',
    label: 'Engine Number',
    type: FIELD_TYPES.TEXT,
    category: FIELD_CATEGORIES.MOTOR,
    required: false,
    editable: true
  },
  'motor.chassisNumber': {
    key: 'motor.chassisNumber',
    label: 'Chassis Number / VIN',
    type: FIELD_TYPES.TEXT,
    category: FIELD_CATEGORIES.MOTOR,
    required: false,
    editable: true
  },
  'motor.vinNumber': {
    key: 'motor.vinNumber',
    label: 'VIN Number',
    type: FIELD_TYPES.TEXT,
    category: FIELD_CATEGORIES.MOTOR,
    required: false,
    editable: true
  },
  'motor.idv': {
    key: 'motor.idv',
    label: 'Insured Declared Value - IDV (INR)',
    type: FIELD_TYPES.CURRENCY,
    category: FIELD_CATEGORIES.MOTOR,
    required: true,
    editable: true
  },
  'motor.vehicleValue': {
    key: 'motor.vehicleValue',
    label: 'Vehicle Value',
    type: FIELD_TYPES.CURRENCY,
    category: FIELD_CATEGORIES.MOTOR,
    required: false,
    editable: true
  },
  'motor.currentNcbPercentage': {
    key: 'motor.currentNcbPercentage',
    label: 'Current NCB (%)',
    type: FIELD_TYPES.NUMBER,
    category: FIELD_CATEGORIES.MOTOR,
    required: false,
    editable: true
  },
  'motor.previousNcbPercentage': {
    key: 'motor.previousNcbPercentage',
    label: 'Previous NCB (%)',
    type: FIELD_TYPES.NUMBER,
    category: FIELD_CATEGORIES.MOTOR,
    required: false,
    editable: true
  },
  'motor.previousPolicyAvailable': {
    key: 'motor.previousPolicyAvailable',
    label: 'Previous Policy Available',
    type: FIELD_TYPES.BOOLEAN,
    category: FIELD_CATEGORIES.POLICY,
    required: false,
    editable: true
  },
  'motor.previousInsurer': {
    key: 'motor.previousInsurer',
    label: 'Previous Insurer',
    type: FIELD_TYPES.TEXT,
    category: FIELD_CATEGORIES.POLICY,
    required: false,
    editable: true
  },
  'motor.previousPolicyNumber': {
    key: 'motor.previousPolicyNumber',
    label: 'Previous Policy Number',
    type: FIELD_TYPES.TEXT,
    category: FIELD_CATEGORIES.POLICY,
    required: false,
    editable: true
  },
  'motor.previousPolicyStartDate': {
    key: 'motor.previousPolicyStartDate',
    label: 'Previous Policy Start Date',
    type: FIELD_TYPES.DATE,
    category: FIELD_CATEGORIES.POLICY,
    required: false,
    editable: true
  },
  'motor.previousPolicyEndDate': {
    key: 'motor.previousPolicyEndDate',
    label: 'Previous Policy End Date',
    type: FIELD_TYPES.DATE,
    category: FIELD_CATEGORIES.POLICY,
    required: false,
    editable: true
  },
  'motor.previousPolicyType': {
    key: 'motor.previousPolicyType',
    label: 'Previous Policy Type',
    type: FIELD_TYPES.TEXT,
    category: FIELD_CATEGORIES.POLICY,
    required: false,
    editable: true
  },
  'motor.previousNcb': {
    key: 'motor.previousNcb',
    label: 'Previous Policy NCB (%)',
    type: FIELD_TYPES.NUMBER,
    category: FIELD_CATEGORIES.POLICY,
    required: false,
    editable: true
  },
  'motor.previousIdv': {
    key: 'motor.previousIdv',
    label: 'Previous IDV (INR)',
    type: FIELD_TYPES.CURRENCY,
    category: FIELD_CATEGORIES.POLICY,
    required: false,
    editable: true
  },
  'motor.activeTpInsurerName': {
    key: 'motor.activeTpInsurerName',
    label: 'Active TP Insurer Name',
    type: FIELD_TYPES.TEXT,
    category: FIELD_CATEGORIES.COVERAGE,
    required: false,
    editable: true
  },
  'motor.activeTpPolicyNumber': {
    key: 'motor.activeTpPolicyNumber',
    label: 'Active TP Policy Number',
    type: FIELD_TYPES.TEXT,
    category: FIELD_CATEGORIES.COVERAGE,
    required: false,
    editable: true
  },
  'motor.activeTpPolicyStartDate': {
    key: 'motor.activeTpPolicyStartDate',
    label: 'Active TP Policy Start Date',
    type: FIELD_TYPES.DATE,
    category: FIELD_CATEGORIES.COVERAGE,
    required: false,
    editable: true
  },
  'motor.activeTpPolicyEndDate': {
    key: 'motor.activeTpPolicyEndDate',
    label: 'Active TP Policy End Date',
    type: FIELD_TYPES.DATE,
    category: FIELD_CATEGORIES.COVERAGE,
    required: false,
    editable: true
  },
  'motor.tpPremium': {
    key: 'motor.tpPremium',
    label: 'TP Premium Component (INR)',
    type: FIELD_TYPES.CURRENCY,
    category: FIELD_CATEGORIES.FINANCIAL,
    required: false,
    editable: true
  },
  'motor.financed': {
    key: 'motor.financed',
    label: 'Hypothecation / Financed',
    type: FIELD_TYPES.BOOLEAN,
    category: FIELD_CATEGORIES.MOTOR,
    required: false,
    editable: true
  },
  'motor.financierName': {
    key: 'motor.financierName',
    label: 'Financier / Bank Name',
    type: FIELD_TYPES.TEXT,
    category: FIELD_CATEGORIES.MOTOR,
    required: false,
    editable: true
  },
  'motor.hypothecation': {
    key: 'motor.hypothecation',
    label: 'Hypothecation City / Details',
    type: FIELD_TYPES.TEXT,
    category: FIELD_CATEGORIES.MOTOR,
    required: false,
    editable: true
  },
  'motor.loanProvider': {
    key: 'motor.loanProvider',
    label: 'Loan Provider',
    type: FIELD_TYPES.TEXT,
    category: FIELD_CATEGORIES.MOTOR,
    required: false,
    editable: true
  },
  'motor.ownDamagePremium': {
    key: 'motor.ownDamagePremium',
    label: 'Own Damage (OD) Premium',
    type: FIELD_TYPES.CURRENCY,
    category: FIELD_CATEGORIES.FINANCIAL,
    required: false,
    editable: true
  },
  'motor.thirdPartyPremium': {
    key: 'motor.thirdPartyPremium',
    label: 'Third Party (TP) Premium',
    type: FIELD_TYPES.CURRENCY,
    category: FIELD_CATEGORIES.FINANCIAL,
    required: false,
    editable: true
  },
  'motor.personalAccidentPremium': {
    key: 'motor.personalAccidentPremium',
    label: 'PA Cover Premium (INR)',
    type: FIELD_TYPES.CURRENCY,
    category: FIELD_CATEGORIES.FINANCIAL,
    required: false,
    editable: true
  },
  'motor.addonPremium': {
    key: 'motor.addonPremium',
    label: 'Add-on Total Premium',
    type: FIELD_TYPES.CURRENCY,
    category: FIELD_CATEGORIES.FINANCIAL,
    required: false,
    editable: true
  },
  'motor.discount': {
    key: 'motor.discount',
    label: 'Total Discount (INR)',
    type: FIELD_TYPES.CURRENCY,
    category: FIELD_CATEGORIES.FINANCIAL,
    required: false,
    editable: true
  },
  'motor.loading': {
    key: 'motor.loading',
    label: 'Loading Charges (INR)',
    type: FIELD_TYPES.CURRENCY,
    category: FIELD_CATEGORIES.FINANCIAL,
    required: false,
    editable: true
  },
  'motor.cess': {
    key: 'motor.cess',
    label: 'Cess (INR)',
    type: FIELD_TYPES.CURRENCY,
    category: FIELD_CATEGORIES.FINANCIAL,
    required: false,
    editable: true
  },
  'motor.zeroDepreciation': {
    key: 'motor.zeroDepreciation',
    label: 'Zero Depreciation (Nil Dep)',
    type: FIELD_TYPES.BOOLEAN,
    category: FIELD_CATEGORIES.COVERAGE,
    required: false,
    editable: true
  },
  'motor.engineProtection': {
    key: 'motor.engineProtection',
    label: 'Engine Protector',
    type: FIELD_TYPES.BOOLEAN,
    category: FIELD_CATEGORIES.COVERAGE,
    required: false,
    editable: true
  },
  'motor.roadsideAssistance': {
    key: 'motor.roadsideAssistance',
    label: 'Roadside Assistance (RSA)',
    type: FIELD_TYPES.BOOLEAN,
    category: FIELD_CATEGORIES.COVERAGE,
    required: false,
    editable: true
  },
  'motor.consumables': {
    key: 'motor.consumables',
    label: 'Consumables Cover',
    type: FIELD_TYPES.BOOLEAN,
    category: FIELD_CATEGORIES.COVERAGE,
    required: false,
    editable: true
  },
  'motor.returnToInvoice': {
    key: 'motor.returnToInvoice',
    label: 'Return to Invoice (RTI)',
    type: FIELD_TYPES.BOOLEAN,
    category: FIELD_CATEGORIES.COVERAGE,
    required: false,
    editable: true
  },
  'motor.ncbProtector': {
    key: 'motor.ncbProtector',
    label: 'NCB Protector',
    type: FIELD_TYPES.BOOLEAN,
    category: FIELD_CATEGORIES.COVERAGE,
    required: false,
    editable: true
  },
  'motor.tyreProtector': {
    key: 'motor.tyreProtector',
    label: 'Tyre Protector',
    type: FIELD_TYPES.BOOLEAN,
    category: FIELD_CATEGORIES.COVERAGE,
    required: false,
    editable: true
  },
  'motor.keyReplacement': {
    key: 'motor.keyReplacement',
    label: 'Key Replacement',
    type: FIELD_TYPES.BOOLEAN,
    category: FIELD_CATEGORIES.COVERAGE,
    required: false,
    editable: true
  },
  'motor.personalBelongings': {
    key: 'motor.personalBelongings',
    label: 'Loss of Personal Belongings',
    type: FIELD_TYPES.BOOLEAN,
    category: FIELD_CATEGORIES.COVERAGE,
    required: false,
    editable: true
  },
  'motor.personalAccidentCover': {
    key: 'motor.personalAccidentCover',
    label: 'Owner-Driver Compulsory PA Cover (15L)',
    type: FIELD_TYPES.BOOLEAN,
    category: FIELD_CATEGORIES.COVERAGE,
    required: false,
    editable: true
  },

  // Broker & CRM Fields
  'broker.brokerAgency': {
    key: 'broker.brokerAgency',
    label: 'Broker / Agency Name',
    type: FIELD_TYPES.TEXT,
    category: FIELD_CATEGORIES.POLICY,
    required: false,
    editable: true
  },
  'broker.agentName': {
    key: 'broker.agentName',
    label: 'Agent / Pos Name',
    type: FIELD_TYPES.TEXT,
    category: FIELD_CATEGORIES.POLICY,
    required: false,
    editable: true
  },
  'broker.subAgent': {
    key: 'broker.subAgent',
    label: 'Sub-Agent',
    type: FIELD_TYPES.TEXT,
    category: FIELD_CATEGORIES.POLICY,
    required: false,
    editable: true
  },
  'broker.brokerCode': {
    key: 'broker.brokerCode',
    label: 'Broker Code',
    type: FIELD_TYPES.TEXT,
    category: FIELD_CATEGORIES.POLICY,
    required: false,
    editable: true
  },
  'broker.agentCode': {
    key: 'broker.agentCode',
    label: 'Agent / POSP Code',
    type: FIELD_TYPES.TEXT,
    category: FIELD_CATEGORIES.POLICY,
    required: false,
    editable: true
  },

  // Payment Details
  'payment.paymentStatus': {
    key: 'payment.paymentStatus',
    label: 'Payment Status',
    type: FIELD_TYPES.SELECT,
    category: FIELD_CATEGORIES.FINANCIAL,
    options: [
      { label: 'Completed / Paid', value: 'completed' },
      { label: 'Pending', value: 'pending' },
      { label: 'Failed', value: 'failed' }
    ],
    required: false,
    editable: true
  },
  'payment.paymentMethod': {
    key: 'payment.paymentMethod',
    label: 'Payment Mode',
    type: FIELD_TYPES.SELECT,
    category: FIELD_CATEGORIES.FINANCIAL,
    options: [
      { label: 'Online / Gateway', value: 'Online' },
      { label: 'Credit Card', value: 'Credit' },
      { label: 'Cash', value: 'Cash' },
      { label: 'Cut & Pay', value: 'Cut & Pay' },
      { label: 'Cheque / DD', value: 'Cheque' },
      { label: 'NEFT / RTGS / UPI', value: 'UPI/NEFT' }
    ],
    required: false,
    editable: true
  },
  'payment.transactionReference': {
    key: 'payment.transactionReference',
    label: 'Transaction Reference / Txn ID',
    type: FIELD_TYPES.TEXT,
    category: FIELD_CATEGORIES.FINANCIAL,
    required: false,
    editable: true
  },
  'payment.receiptNumber': {
    key: 'payment.receiptNumber',
    label: 'Receipt Number',
    type: FIELD_TYPES.TEXT,
    category: FIELD_CATEGORIES.FINANCIAL,
    required: false,
    editable: true
  }
});

module.exports = {
  FIELD_TYPES,
  FIELD_CATEGORIES,
  FIELD_REGISTRY
};

