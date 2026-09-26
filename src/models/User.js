const mongoose = require('mongoose');
const { Schema } = mongoose;
const { ROLES, USER_STATUS } = require('../utils/constants');

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    googleId: { type: String, sparse: true },
    password: { type: String },
    role: { type: String, enum: Object.values(ROLES), default: ROLES.AGENT },
    agencies: [
      {
        agencyId: { type: Schema.Types.ObjectId, ref: 'Agency' },
        role: { type: String, enum: Object.values(ROLES) }
      }
    ],
    activeAgencyId: { type: Schema.Types.ObjectId, ref: 'Agency' },
    status: { type: String, enum: Object.values(USER_STATUS), default: USER_STATUS.PENDING },
    lastLogin: Date
  },
  { timestamps: true }
);

userSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('User', userSchema);
