const Joi = require('joi');
const { IMPORT_TYPES, DUPLICATE_ACTIONS } = require('../utils/constants');

const upload = Joi.object({
  type: Joi.string().valid(...(IMPORT_TYPES ? Object.values(IMPORT_TYPES) : ['customers', 'policies'])).required()
});

const resolve = Joi.object({
  resolutions: Joi.array().items(
    Joi.object({
      row: Joi.number().required(),
      action: Joi.string().valid(...(DUPLICATE_ACTIONS ? Object.values(DUPLICATE_ACTIONS) : ['skip', 'overwrite', 'create_new'])).required()
    })
  ).required()
});

module.exports = {
  upload,
  resolve
};
