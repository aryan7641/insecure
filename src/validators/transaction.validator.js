const Joi = require('joi');
const { objectId, paginationSchema, positiveAmount, dateString } = require('./common.validator');
const { TRANSACTION_TYPES } = require('../utils/constants');

const create = Joi.object({
  customerId: objectId.required(),
  mutualFundId: objectId.required(),
  type: Joi.string().valid(...(TRANSACTION_TYPES ? Object.values(TRANSACTION_TYPES) : ['buy', 'sell'])).required(),
  amount: positiveAmount.required(),
  date: dateString.required(),
  units: Joi.number().positive(),
  nav: positiveAmount,
  status: Joi.string()
});

const update = create.keys({
  customerId: Joi.forbidden(),
  mutualFundId: Joi.forbidden(),
  type: Joi.string().valid(...(TRANSACTION_TYPES ? Object.values(TRANSACTION_TYPES) : ['buy', 'sell'])),
  amount: positiveAmount,
  date: dateString
});

const list = paginationSchema.keys({
  customerId: objectId,
  mutualFundId: objectId,
  type: Joi.string()
});

module.exports = {
  create,
  update,
  list
};
