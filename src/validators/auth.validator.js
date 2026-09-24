const Joi = require('joi');
const { objectId } = require('./common.validator');

const switchAgency = Joi.object({
  agencyId: objectId.required()
});

module.exports = {
  switchAgency
};
