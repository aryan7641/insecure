const mongoose = require('mongoose');
const { Schema } = mongoose;
const { AGENCY_STATUS } = require('../utils/constants');

const agencySchema = new Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    admins: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    agents: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    config: { type: Schema.Types.Mixed, default: {} },
    status: { type: String, enum: Object.values(AGENCY_STATUS), default: AGENCY_STATUS.ACTIVE }
  },
  { timestamps: true }
);

agencySchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('Agency', agencySchema);
