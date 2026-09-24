const Joi = require('joi');
const { objectId, paginationSchema, positiveAmount, dateString } = require('./common.validator');

const create = Joi.object({
  customerId: objectId.required(),
  mutualFundId: objectId,
  amc: Joi.string(),
  schemeName: Joi.string(),
  folioNumber: Joi.string(),
  sipAmount: positiveAmount.required(),
  startDate: dateString.required(),
  endDate: dateString,
  frequency: Joi.string(),
  status: Joi.string()
});

const update = create.keys({
  customerId: Joi.forbidden(),
  sipAmount: positiveAmount,
  startDate: dateString
});

const list = paginationSchema.keys({
  customerId: objectId,
  status: Joi.string()
});

module.exports = {
  create,
  update,
  list
};
