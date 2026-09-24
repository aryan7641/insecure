const Joi = require('joi');
const { dateString, paginationSchema } = require('./common.validator');

const query = paginationSchema.keys({
  schemeCode: Joi.string(),
  schemeName: Joi.string(),
  startDate: dateString,
  endDate: dateString
});

module.exports = {
  query
};
