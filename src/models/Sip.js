const mongoose = require('mongoose');
const { Schema } = mongoose;
const { SIP_FREQUENCIES, SIP_STATUSES } = require('../utils/constants');

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

const sipSchema = new Schema(
  {
    agencyId: { type: Schema.Types.ObjectId, ref: 'Agency', required: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
    assignedAgentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    mutualFundId: { type: Schema.Types.ObjectId, ref: 'MutualFund', required: true },
    schemeName: String,
    schemeCode: String,
    folioNumber: String,
    sipAmount: { type: Number, required: true, min: 0 },
    frequency: { type: String, enum: Object.values(SIP_FREQUENCIES), default: SIP_FREQUENCIES.MONTHLY },
    startDate: { type: Date, required: true },
    endDate: Date,
    nextDebitDate: Date,
    status: { type: String, enum: Object.values(SIP_STATUSES), default: SIP_STATUSES.ACTIVE },
    isDeleted: { type: Boolean, default: false },
    deletedAt: Date,
    deletedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

sipSchema.index({ agencyId: 1, customerId: 1 });
sipSchema.index({ agencyId: 1, status: 1 });

addSoftDelete(sipSchema);

sipSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('Sip', sipSchema);
