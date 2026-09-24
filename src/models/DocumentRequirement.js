const mongoose = require('mongoose');
const { Schema } = mongoose;
const { DOC_REQUIREMENT_MODULES } = require('../utils/constants');

const documentRequirementSchema = new Schema(
  {
    agencyId: { type: Schema.Types.ObjectId, ref: 'Agency', required: true },
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true },
    module: { type: String, enum: Object.values(DOC_REQUIREMENT_MODULES), required: true },
    isRequired: { type: Boolean, default: true },
    isPredefined: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

documentRequirementSchema.index({ agencyId: 1, name: 1, module: 1 }, { unique: true });

documentRequirementSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('DocumentRequirement', documentRequirementSchema);
