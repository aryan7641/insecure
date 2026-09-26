const mongoose = require('mongoose');
const { Schema } = mongoose;
const { POLICY_TYPES, PREMIUM_FREQUENCIES, POLICY_STATUSES } = require('../utils/constants');

const addSoftDelete = (schema) => {
  schema.pre(/^find/, function (next) {
    if (this.getOptions().includeSoftDeleted) return next();
    this.where({ isDeleted: { $ne: true } });
    next();
  });
  schema.pre('countDocuments', function (next) {
    if (this.getOptions().includeSoftDeleted) return next();
    this.where({ isDeleted: { $ne: true } });
    next();
  });
};

const insurancePolicySchema = new Schema(
  {
    agencyId: { type: Schema.Types.ObjectId, ref: 'Agency', required: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
    assignedAgentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    policyNumber: { type: String, required: true, trim: true },
    insuranceCompany: { type: String, required: true, trim: true },
    productName: { type: String, trim: true },
    planName: { type: String, trim: true },
    
    // Controlled Taxonomy Architecture
    insuranceType: { type: String, enum: ['health', 'motor', 'life', 'general', 'other'], default: 'health' },
    insuranceSubtype: { type: String, trim: true, default: 'individual_health' },
    
    // Legacy mapping compatibility
    policyType: { type: String, trim: true, default: 'health' },
    lob: { type: String, trim: true },
    subLob: { type: String, trim: true },
    businessType: { type: String, enum: ['new', 'renewal', 'rollover', 'portability', 'other'], default: 'new' },
    
    // Dates & Tenure
    issueDate: Date,
    startDate: Date,
    endDate: Date,
    renewalDate: Date,
    premiumDueDate: Date,
    maturityDate: Date,
    tenureYears: Number,
    
    // Coverage & Sum Assured
    sumAssured: { type: Number, min: 0 },
    coverageDetails: { type: Schema.Types.Mixed, default: {} },
    
    // Subtype-Specific Specialized Detail Entities
    healthDetails: {
      roomRentLimit: String,
      icuLimit: String,
      coPayment: String,
      deductible: Number,
      aggregateDeductible: Number,
      preExistingWaitingPeriod: String,
      cumulativeBonus: String,
      restorationBenefit: String,
      diseaseSpecificLimits: String,
      maternityCover: Number
    },

    lifeDetails: {
      uin: String,
      policyTermYears: Number,
      premiumPaymentTermYears: Number,
      deathBenefit: String,
      maturityDate: Date,
      maturityBenefit: String,
      smokerStatus: String,
      accidentalDeathRider: Number,
      criticalIllnessRider: Number,
      waiverOfPremium: Boolean,
      fundName: String,
      fundType: String,
      unitsHeld: Number,
      nav: Number,
      totalFundValue: Number,
      annuityType: String,
      annuityAmount: Number,
      annuityFrequency: String,
      annuityCommencementDate: Date,
      childName: String,
      childDob: Date
    },

    travelDetails: {
      passportNumber: String,
      nationality: String,
      destinationCountry: String,
      destinationRegion: String,
      tripDurationDays: Number,
      tripType: String,
      medicalExpensesLimit: String
    },

    propertyDetails: {
      propertyAddress: String,
      propertyType: String,
      occupancyType: String,
      builtUpAreaSqFt: Number,
      buildingSumInsured: Number,
      contentsSumInsured: Number
    },
    
    // Premium Breakdown (INR)
    basicPremium: { type: Number, min: 0 },
    addonPremium: { type: Number, min: 0 },
    gst: { type: Number, min: 0 },
    netPremium: { type: Number, min: 0 },
    premium: { type: Number, min: 0, required: true }, // Total / Final Premium
    installmentAmount: { type: Number, min: 0 },
    premiumFrequency: { type: String, enum: Object.values(PREMIUM_FREQUENCIES), default: PREMIUM_FREQUENCIES.YEARLY },
    
    // Motor Insurance Specific Details
    vehicleDetails: {
      registrationNumber: { type: String, uppercase: true, trim: true },
      vehicleType: { type: String, trim: true }, // 2-Wheeler, 4-Wheeler Private, Commercial, etc.
      make: { type: String, trim: true },
      model: { type: String, trim: true },
      variant: { type: String, trim: true },
      fuelType: { type: String, trim: true },
      registrationDate: Date,
      manufacturingYear: Number,
      engineNumber: { type: String, trim: true },
      chassisNumber: { type: String, trim: true },
      idv: { type: Number, min: 0 },
      ncb: { type: Number, min: 0, default: 0 },
      previousInsurer: { type: String, trim: true },
      previousPolicyNumber: { type: String, trim: true }
    },
    
    // Insured Members (e.g. Floater / Group / Family Members)
    insuredMembers: [
      {
        name: { type: String, trim: true },
        dob: Date,
        age: Number,
        gender: String,
        relationship: String,
        memberId: String,
        sumInsured: Number
      }
    ],

    // Nominee
    nominee: {
      name: String,
      relation: String,
      dob: Date,
      contact: String,
      share: { type: Number, default: 100 }
    },
    
    // Advisor / Commission Details
    commission: {
      percentage: Number,
      amount: Number,
      receivableDate: Date,
      status: { type: String, enum: ['pending', 'received', 'reconciled'], default: 'pending' }
    },
    advisorInfo: {
      name: String,
      code: String,
      contact: String
    },
    
    // Associated Documents & Renewal Lineage
    documentId: { type: Schema.Types.ObjectId, ref: 'Document' },
    originalDocumentUrl: String,
    renewedFromPolicyId: { type: Schema.Types.ObjectId, ref: 'InsurancePolicy' },
    renewedToPolicyId: { type: Schema.Types.ObjectId, ref: 'InsurancePolicy' },
    
    notes: String,
    status: { type: String, enum: Object.values(POLICY_STATUSES), default: POLICY_STATUSES.ACTIVE },
    isDeleted: { type: Boolean, default: false },
    deletedAt: Date,
    deletedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

insurancePolicySchema.index({ agencyId: 1, policyNumber: 1 }, { unique: true, partialFilterExpression: { isDeleted: { $ne: true } } });
insurancePolicySchema.index({ agencyId: 1, customerId: 1 });
insurancePolicySchema.index({ agencyId: 1, renewalDate: 1, status: 1 });
insurancePolicySchema.index({ agencyId: 1, insuranceType: 1, insuranceSubtype: 1 });
insurancePolicySchema.index({ agencyId: 1, assignedAgentId: 1 });
insurancePolicySchema.index({ 'vehicleDetails.registrationNumber': 1 });

addSoftDelete(insurancePolicySchema);

insurancePolicySchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('InsurancePolicy', insurancePolicySchema);
