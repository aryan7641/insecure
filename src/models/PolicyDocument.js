const mongoose = require('mongoose');
const { Schema } = mongoose;
const { POLICY_DOCUMENT_TYPES, POLICY_DOCUMENT_STATUSES } = require('../utils/constants');

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

const policyDocumentSchema = new Schema(
  {
    agencyId: { type: Schema.Types.ObjectId, ref: 'Agency', required: true, index: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer' },
    policyId: { type: Schema.Types.ObjectId, ref: 'InsurancePolicy', required: true, index: true },
    documentType: {
      type: String,
      required: true,
      uppercase: true,
      enum: Object.values(POLICY_DOCUMENT_TYPES),
      index: true
    },
    version: { type: Number, required: true, min: 1, default: 1 },
    storageKey: { type: String, required: true },
    storageBucket: { type: String },
    storageProvider: { type: String, default: 's3' },
    originalFilename: { type: String, required: true, trim: true },
    mimeType: { type: String, required: true },
    fileSize: { type: Number, required: true, min: 1 },
    checksum: { type: String, required: true },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    uploadedByName: { type: String },
    uploadedAt: { type: Date, default: Date.now },
    isCurrent: { type: Boolean, default: true, index: true },
    status: {
      type: String,
      enum: Object.values(POLICY_DOCUMENT_STATUSES),
      default: POLICY_DOCUMENT_STATUSES.UPLOADED
    },
    isDeleted: { type: Boolean, default: false },
    deletedAt: Date,
    deletedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    metadata: { type: Schema.Types.Mixed, default: {} }
  },
  { timestamps: true }
);

policyDocumentSchema.index({ agencyId: 1, policyId: 1 });
policyDocumentSchema.index({ policyId: 1, documentType: 1 });
policyDocumentSchema.index({ policyId: 1, documentType: 1, version: 1 });
policyDocumentSchema.index({ policyId: 1, documentType: 1, isCurrent: 1 });
policyDocumentSchema.index({ agencyId: 1, checksum: 1 });

addSoftDelete(policyDocumentSchema);

policyDocumentSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('PolicyDocument', policyDocumentSchema);
