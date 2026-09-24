const mongoose = require('mongoose');
const { Schema } = mongoose;

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

const customerSchema = new Schema(
  {
    agencyId: { type: Schema.Types.ObjectId, ref: 'Agency', required: true },
    assignedAgentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true },
    mobile: { type: String, required: true, trim: true },
    email: { type: String, lowercase: true, trim: true },
    dob: Date,
    address: {
      street: String,
      city: String,
      state: String,
      pincode: String,
      country: { type: String, default: 'India' }
    },
    pan: { type: String, uppercase: true, trim: true },
    aadhaar: String,
    nominee: {
      name: String,
      relation: String,
      dob: Date,
      contact: String
    },
    family: [
      {
        name: String,
        relation: String,
        dob: Date,
        contact: String
      }
    ],
    occupation: String,
    income: Number,
    customFields: { type: Schema.Types.Mixed, default: {} },
    isDeleted: { type: Boolean, default: false },
    deletedAt: Date,
    deletedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

customerSchema.index({ agencyId: 1, mobile: 1 }, { unique: true, partialFilterExpression: { isDeleted: { $ne: true } } });
customerSchema.index({ agencyId: 1, assignedAgentId: 1 });
customerSchema.index({ agencyId: 1, pan: 1 }, { sparse: true });
customerSchema.index({ agencyId: 1, name: 1 });

addSoftDelete(customerSchema);

customerSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('Customer', customerSchema);
