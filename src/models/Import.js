const mongoose = require('mongoose');
const { Schema } = mongoose;
const { IMPORT_TYPES, IMPORT_STATUSES, DUPLICATE_ACTIONS } = require('../utils/constants');

const importSchema = new Schema(
  {
    agencyId: { type: Schema.Types.ObjectId, ref: 'Agency', required: true },
    type: { type: String, enum: Object.values(IMPORT_TYPES), required: true },
    fileName: { type: String, required: true },
    totalRows: { type: Number, default: 0 },
    successCount: { type: Number, default: 0 },
    errorCount: { type: Number, default: 0 },
    duplicateCount: { type: Number, default: 0 },
    status: { type: String, enum: Object.values(IMPORT_STATUSES), default: IMPORT_STATUSES.UPLOADED },
    errors: [
      {
        row: Number,
        field: String,
        message: String
      }
    ],
    duplicates: [
      {
        row: Number,
        existingId: Schema.Types.ObjectId,
        fields: Schema.Types.Mixed,
        action: { type: String, enum: Object.values(DUPLICATE_ACTIONS) }
      }
    ],
    parsedData: [Schema.Types.Mixed],
    resolutions: [
      {
        row: Number,
        action: { type: String, enum: Object.values(DUPLICATE_ACTIONS) }
      }
    ],
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
  },
  { timestamps: true }
);

importSchema.index({ agencyId: 1, createdAt: -1 });

importSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('Import', importSchema);
