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
    policyType: { type: String, enum: Object.values(POLICY_TYPES), required: true },
    premium: { type: Number, min: 0 },
    premiumFrequency: { type: String, enum: Object.values(PREMIUM_FREQUENCIES) },
    startDate: Date,
    endDate: Date,
    renewalDate: Date,
    premiumDueDate: Date,
    maturityDate: Date,
    sumAssured: { type: Number, min: 0 },
    nominee: {
      name: String,
      relation: String,
      dob: Date,
      contact: String
    },
    advisorInfo: {
      name: String,
      code: String,
      contact: String
    },
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
insurancePolicySchema.index({ agencyId: 1, assignedAgentId: 1 });

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
