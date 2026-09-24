const mongoose = require('mongoose');
const { Schema } = mongoose;
const { ACTIVITY_TYPES } = require('../utils/constants');

const activitySchema = new Schema(
  {
    agencyId: { type: Schema.Types.ObjectId, ref: 'Agency', required: true },
    actorId: { type: Schema.Types.ObjectId, ref: 'User' },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer' },
    resourceType: String,
    resourceId: Schema.Types.ObjectId,
    actionType: { type: String, enum: Object.values(ACTIVITY_TYPES), required: true },
    description: String,
    metadata: { type: Schema.Types.Mixed, default: {} }
  },
  { timestamps: true }
);

activitySchema.index({ agencyId: 1, customerId: 1, createdAt: -1 });
activitySchema.index({ agencyId: 1, createdAt: -1 });

activitySchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('Activity', activitySchema);
