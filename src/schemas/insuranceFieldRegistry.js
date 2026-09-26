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
  }
});

module.exports = {
  FIELD_TYPES,
  FIELD_CATEGORIES,
  FIELD_REGISTRY
};
