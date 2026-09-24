const Joi = require('joi');
const { objectId, paginationSchema, positiveAmount } = require('./common.validator');

const create = Joi.object({
  customerId: objectId.required(),
  amc: Joi.string().required(),
  schemeName: Joi.string().required(),
  folioNumber: Joi.string().required(),
  totalUnits: positiveAmount,
  currentValue: positiveAmount,
  status: Joi.string()
});

const update = create.keys({
  customerId: Joi.forbidden(),
  amc: Joi.string(),
  schemeName: Joi.string(),
  folioNumber: Joi.string()
});

const list = paginationSchema.keys({
  customerId: objectId,
  amc: Joi.string(),
  status: Joi.string()
});

module.exports = {
  create,
  update,
  list
};
