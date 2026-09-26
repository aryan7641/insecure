const mongoose = require('mongoose');
const { Schema } = mongoose;

const extractionJobSchema = new Schema(
  {
    agencyId: { type: Schema.Types.ObjectId, ref: 'Agency', required: true },
    documentId: { type: Schema.Types.ObjectId, ref: 'Document', required: true },
    insuranceType: { type: String, trim: true },
    insuranceSubtype: { type: String, trim: true },
    status: {
      type: String,
      enum: ['uploaded', 'classifying', 'extracting', 'review_required', 'confirmed', 'failed'],
      default: 'uploaded'
    },
    rawText: String,
    classificationResult: { type: Schema.Types.Mixed, default: {} },
    extractedData: { type: Schema.Types.Mixed, default: {} },
    confidence: { type: Schema.Types.Mixed, default: {} },
    duplicateCandidates: {
      customers: [{ type: Schema.Types.Mixed }],
      policies: [{ type: Schema.Types.Mixed }]
    },
    confirmedPolicyId: { type: Schema.Types.ObjectId, ref: 'InsurancePolicy' },
    confirmedCustomerId: { type: Schema.Types.ObjectId, ref: 'Customer' },
    error: String,
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

extractionJobSchema.index({ agencyId: 1, documentId: 1 });
extractionJobSchema.index({ agencyId: 1, status: 1 });

extractionJobSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('ExtractionJob', extractionJobSchema);
