const mongoose = require('mongoose');
const { Schema } = mongoose;
const { DOCUMENT_CATEGORIES, OCR_STATUSES } = require('../utils/constants');

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

const documentSchema = new Schema(
  {
    agencyId: { type: Schema.Types.ObjectId, ref: 'Agency', required: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
    category: { type: String, enum: Object.values(DOCUMENT_CATEGORIES), required: true },
    customCategory: String,
    fileName: { type: String, required: true },
    originalName: { type: String, required: true },
    blobUrl: String,
    blobKey: { type: String, required: true },
    fileType: { type: String, enum: ['pdf', 'jpg', 'png'], required: true },
    fileSize: { type: Number, required: true },
    ocrStatus: { type: String, enum: Object.values(OCR_STATUSES), default: OCR_STATUSES.NOT_APPLICABLE },
    extractedData: { type: Schema.Types.Mixed, default: {} },
    ocrConfirmed: { type: Boolean, default: false },
    ocrConfirmedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    ocrConfirmedAt: Date,
    isDeleted: { type: Boolean, default: false },
    deletedAt: Date,
    deletedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
  },
  { timestamps: true }
);

documentSchema.index({ agencyId: 1, customerId: 1, category: 1 });

addSoftDelete(documentSchema);

documentSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('Document', documentSchema);
