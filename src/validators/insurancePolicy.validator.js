const Joi = require('joi');
const { objectId, paginationSchema, positiveAmount, dateString } = require('./common.validator');
const { POLICY_STATUSES } = require('../utils/constants');

const create = Joi.object({
  customerId: objectId.required(),
  policyNumber: Joi.string().required(),
  insuranceCompany: Joi.string().required(),
  policyType: Joi.string().required(),
  premiumAmount: positiveAmount,
  sumAssured: positiveAmount,
  premiumFrequency: Joi.string(),
  issueDate: dateString,
  commencementDate: dateString,
  maturityDate: dateString,
  renewalDate: dateString,
  status: Joi.string().valid(...(POLICY_STATUSES ? Object.values(POLICY_STATUSES) : ['active', 'inactive', 'lapsed'])),
  customFields: Joi.object()
});

const update = create.keys({
  customerId: Joi.forbidden(),
  policyNumber: Joi.string(),
  insuranceCompany: Joi.string(),
  policyType: Joi.string()
});

const list = paginationSchema.keys({
  customerId: objectId,
  policyType: Joi.string(),
  status: Joi.string()
});

module.exports = {
  create,
  update,
  list
};
