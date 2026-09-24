const mongoose = require('mongoose');
const { Schema } = mongoose;

const navSchema = new Schema(
  {
    schemeCode: { type: String, required: true, trim: true },
    schemeName: { type: String, trim: true },
    amc: { type: String, trim: true },
    nav: { type: Number, required: true },
    date: { type: Date, required: true },
    importId: { type: Schema.Types.ObjectId, ref: 'Import' }
  },
  { timestamps: true }
);

navSchema.index({ schemeCode: 1, date: 1 }, { unique: true });

navSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('Nav', navSchema);
