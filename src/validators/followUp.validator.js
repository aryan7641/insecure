const Joi = require('joi');
const { objectId, paginationSchema, dateString } = require('./common.validator');
const { FOLLOW_UP_TYPES, FOLLOW_UP_STATUSES } = require('../utils/constants');

const create = Joi.object({
  customerId: objectId.required(),
  type: Joi.string().valid(...(FOLLOW_UP_TYPES ? Object.values(FOLLOW_UP_TYPES) : ['call', 'meeting', 'email'])).required(),
  dueDate: dateString.required(),
  notes: Joi.string(),
  status: Joi.string().valid(...(FOLLOW_UP_STATUSES ? Object.values(FOLLOW_UP_STATUSES) : ['pending', 'completed', 'cancelled']))
});

const update = create.keys({
  customerId: Joi.forbidden(),
  type: Joi.string().valid(...(FOLLOW_UP_TYPES ? Object.values(FOLLOW_UP_TYPES) : ['call', 'meeting', 'email'])),
  dueDate: dateString
});

const list = paginationSchema.keys({
  customerId: objectId,
  status: Joi.string(),
  type: Joi.string()
});

module.exports = {
  create,
  update,
  list
};
