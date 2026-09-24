const Joi = require('joi');

const create = Joi.object({
  name: Joi.string().required(),
  body: Joi.string().required(),
  variables: Joi.array().items(Joi.string()),
  isAgencyWide: Joi.boolean(),
  type: Joi.string()
});

const update = create.keys({
  name: Joi.string(),
  body: Joi.string()
});

module.exports = {
  create,
  update
};
