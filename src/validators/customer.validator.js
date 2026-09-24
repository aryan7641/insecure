const Joi = require('joi');
const {
  indianMobile,
  panNumber,
  aadhaarNumber,
  pincodeNumber,
  positiveAmount,
  objectId,
  paginationSchema
} = require('./common.validator');

const create = Joi.object({
  name: Joi.string().required(),
  mobile: indianMobile.required(),
  email: Joi.string().email(),
  dob: Joi.date().iso(),
  address: Joi.object({
    street: Joi.string(),
    city: Joi.string(),
    state: Joi.string(),
    pincode: pincodeNumber
  }),
  pan: panNumber,
  aadhaar: aadhaarNumber,
  nominee: Joi.object({
    name: Joi.string(),
    relation: Joi.string(),
    dob: Joi.date().iso()
  }),
  family: Joi.array().items(Joi.object({
    name: Joi.string(),
    relation: Joi.string(),
    dob: Joi.date().iso()
  })),
  occupation: Joi.string(),
  income: positiveAmount,
  assignedAgentId: objectId.required(),
  customFields: Joi.object()
});

const update = create.keys({
  name: Joi.string(),
  mobile: indianMobile,
  assignedAgentId: Joi.forbidden()
});

const list = paginationSchema.keys({
  assignedAgentId: objectId,
  search: Joi.string().allow(''),
  status: Joi.string()
});

const assign = Joi.object({
  agentId: objectId.required()
});

const checkDuplicate = Joi.object({
  mobile: indianMobile,
  pan: panNumber,
  email: Joi.string().email()
}).or('mobile', 'pan', 'email');

module.exports = {
  create,
  update,
  list,
  assign,
  checkDuplicate
};
