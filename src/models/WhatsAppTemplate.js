const mongoose = require('mongoose');
const { Schema } = mongoose;

const whatsAppTemplateSchema = new Schema(
  {
    agencyId: { type: Schema.Types.ObjectId, ref: 'Agency', required: true },
    name: { type: String, required: true, trim: true },
    body: { type: String, required: true },
    variables: [String],
    isAgencyWide: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

whatsAppTemplateSchema.index({ agencyId: 1, name: 1 }, { unique: true });

whatsAppTemplateSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('WhatsAppTemplate', whatsAppTemplateSchema);
