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

const policyCommissionSchema = new Schema(
  {
    agencyId: { type: Schema.Types.ObjectId, ref: 'Agency', required: true, index: true },
    policyId: { type: Schema.Types.ObjectId, ref: 'InsurancePolicy', required: true, index: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', index: true },
    agentId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    commissionType: {
      type: String,
      trim: true,
      lowercase: true,
      default: 'percentage'
    },
    commissionBasis: {
      type: String,
      trim: true,
      lowercase: true,
      default: 'net_premium'
    },
    commissionPercentage: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    commissionAmount: {
      type: Number,
      min: 0,
      default: 0
    },
    commissionStatus: {
      type: String,
      trim: true,
      lowercase: true,
      default: 'pending'
    },
    remarks: {
      type: String,
      trim: true
    },
    isDeleted: {
      type: Boolean,
      default: false
    },
    deletedAt: Date,
    deletedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

policyCommissionSchema.index({ agencyId: 1, policyId: 1 });
policyCommissionSchema.index({ agencyId: 1, customerId: 1 });
policyCommissionSchema.index({ agencyId: 1, agentId: 1, commissionStatus: 1 });

addSoftDelete(policyCommissionSchema);

policyCommissionSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('PolicyCommission', policyCommissionSchema);
