const mongoose = require('mongoose');
const { Schema } = mongoose;
const { FOLLOW_UP_TYPES, FOLLOW_UP_STATUSES } = require('../utils/constants');

const followUpSchema = new Schema(
  {
    agencyId: { type: Schema.Types.ObjectId, ref: 'Agency', required: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
    agentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    relatedPolicyId: { type: Schema.Types.ObjectId, ref: 'InsurancePolicy' },
    relatedMutualFundId: { type: Schema.Types.ObjectId, ref: 'MutualFund' },
    type: { type: String, enum: Object.values(FOLLOW_UP_TYPES), required: true },
    dueDate: { type: Date, required: true },
    status: { type: String, enum: Object.values(FOLLOW_UP_STATUSES), default: FOLLOW_UP_STATUSES.PENDING },
    notes: String,
    isAutomatic: { type: Boolean, default: false },
    renewalEventKey: { type: String, sparse: true, unique: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

followUpSchema.index({ agencyId: 1, agentId: 1, status: 1 });
followUpSchema.index({ agencyId: 1, dueDate: 1 });

followUpSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('FollowUp', followUpSchema);
