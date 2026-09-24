const Joi = require('joi');

const objectId = Joi.string().regex(/^[0-9a-fA-F]{24}$/);

const indianMobile = Joi.string().pattern(/^[6-9]\d{9}$/).messages({
  'string.pattern.base': 'Invalid Indian mobile number'
});

const panNumber = Joi.string().uppercase().pattern(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/).messages({
  'string.pattern.base': 'Invalid PAN format'
});

const aadhaarNumber = Joi.string().pattern(/^\d{12}$/).messages({
  'string.pattern.base': 'Invalid Aadhaar number'
});

const pincodeNumber = Joi.string().pattern(/^\d{6}$/).messages({
  'string.pattern.base': 'Invalid pincode'
});

const positiveAmount = Joi.number().positive().precision(2);

const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sort: Joi.string(),
  search: Joi.string().allow('')
});

const dateString = Joi.date().iso();

module.exports = {
  objectId,
  indianMobile,
  panNumber,
  aadhaarNumber,
  pincodeNumber,
  positiveAmount,
  paginationSchema,
  dateString
};
