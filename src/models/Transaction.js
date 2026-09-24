const mongoose = require('mongoose');
const { Schema } = mongoose;
const { TRANSACTION_TYPES } = require('../utils/constants');

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

const transactionSchema = new Schema(
  {
    agencyId: { type: Schema.Types.ObjectId, ref: 'Agency', required: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
    assignedAgentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    mutualFundId: { type: Schema.Types.ObjectId, ref: 'MutualFund', required: true },
    sipId: { type: Schema.Types.ObjectId, ref: 'Sip' },
    type: { type: String, enum: Object.values(TRANSACTION_TYPES), required: true },
    amount: { type: Number, required: true },
    units: Number,
    nav: Number,
    date: { type: Date, required: true },
    schemeName: String,
    schemeCode: String,
    folioNumber: String,
    isDeleted: { type: Boolean, default: false },
    deletedAt: Date,
    deletedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

transactionSchema.index({ agencyId: 1, customerId: 1, date: -1 });
transactionSchema.index({ agencyId: 1, mutualFundId: 1 });

addSoftDelete(transactionSchema);

transactionSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('Transaction', transactionSchema);
