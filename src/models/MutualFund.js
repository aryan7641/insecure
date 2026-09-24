const mongoose = require('mongoose');
const { Schema } = mongoose;
const { MF_STATUSES } = require('../utils/constants');

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

const mutualFundSchema = new Schema(
  {
    agencyId: { type: Schema.Types.ObjectId, ref: 'Agency', required: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
    assignedAgentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    amc: { type: String, required: true, trim: true },
    schemeName: { type: String, required: true, trim: true },
    schemeCode: { type: String, trim: true },
    folioNumber: { type: String, required: true, trim: true },
    investmentType: { type: String, enum: ['lumpsum', 'sip', 'both'] },
    currentValue: { type: Number, default: 0 },
    investedAmount: { type: Number, default: 0 },
    units: { type: Number, default: 0 },
    latestNav: Number,
    latestNavDate: Date,
    status: { type: String, enum: Object.values(MF_STATUSES), default: MF_STATUSES.ACTIVE },
    isDeleted: { type: Boolean, default: false },
    deletedAt: Date,
    deletedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

mutualFundSchema.index({ agencyId: 1, folioNumber: 1, schemeCode: 1 }, { unique: true, partialFilterExpression: { isDeleted: { $ne: true } } });
mutualFundSchema.index({ agencyId: 1, customerId: 1 });
mutualFundSchema.index({ agencyId: 1, assignedAgentId: 1 });

addSoftDelete(mutualFundSchema);

mutualFundSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('MutualFund', mutualFundSchema);
