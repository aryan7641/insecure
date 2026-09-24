const Joi = require('joi');
const { objectId, paginationSchema } = require('./common.validator');
const { DOCUMENT_CATEGORIES } = require('../utils/constants');

const upload = Joi.object({
  customerId: objectId.required(),
  category: Joi.string().valid(...(DOCUMENT_CATEGORIES ? Object.values(DOCUMENT_CATEGORIES) : ['kyc', 'policy', 'custom'])).required(),
  customCategory: Joi.when('category', {
    is: 'custom',
    then: Joi.string().required(),
    otherwise: Joi.forbidden()
  }),
  description: Joi.string()
});

const list = paginationSchema.keys({
  customerId: objectId,
  category: Joi.string()
});

module.exports = {
  upload,
  list
};
