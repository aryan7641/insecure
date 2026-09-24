const WhatsAppTemplate = require('../models/WhatsAppTemplate');
const Customer = require('../models/Customer');
const { NotFoundError, AuthorizationError } = require('../utils/apiError');
const { generateWhatsAppUrl, resolveTemplate } = require('../utils/whatsappUrl');
const activityService = require('./activity.service');

const create = async (agencyId, data, user) => {
  const payload = { ...data, agencyId, createdBy: user.userId };
  if (user.role !== 'admin') {
    payload.isAgencyWide = false;
  }
  const template = new WhatsAppTemplate(payload);
  await template.save();
  return template;
};

const list = async (agencyId, user) => {
  const query = {
    agencyId,
    $or: [{ isAgencyWide: true }, { createdBy: user.userId }]
  };
  return await WhatsAppTemplate.find(query).sort({ name: 1 });
};

const getById = async (templateId, agencyId) => {
  const template = await WhatsAppTemplate.findOne({ _id: templateId, agencyId });
  if (!template) throw new NotFoundError('Template not found');
  return template;
};

const update = async (templateId, agencyId, data, user) => {
  const template = await getById(templateId, agencyId);
  
  if (template.createdBy.toString() !== user.userId.toString() && user.role !== 'admin') {
    throw new AuthorizationError('You can only update your own templates');
  }

  if (user.role !== 'admin' && data.isAgencyWide !== undefined) {
    delete data.isAgencyWide;
  }

  Object.assign(template, data);
  await template.save();
  return template;
};

const remove = async (templateId, agencyId, user) => {
  const template = await getById(templateId, agencyId);
  
  if (template.createdBy.toString() !== user.userId.toString() && user.role !== 'admin') {
    throw new AuthorizationError('You can only delete your own templates');
  }

  await template.deleteOne();
};

const generateWhatsAppLink = async (templateId, agencyId, customerId, additionalVars, user) => {
  const template = await getById(templateId, agencyId);
  const customer = await Customer.findOne({ _id: customerId, agencyId });
  if (!customer) throw new NotFoundError('Customer not found');

  const variables = {
    customer_name: customer.name,
    customer_mobile: customer.mobile,
    customer_email: customer.email,
    ...(additionalVars || {})
  };

  const resolvedMessage = resolveTemplate(template.body, variables);
  const whatsappUrl = generateWhatsAppUrl(customer.mobile, resolvedMessage);

  await activityService.log({
    agencyId,
    actorId: user.userId,
    customerId: customer._id,
    resourceType: 'WhatsAppTemplate',
    resourceId: template._id,
    actionType: 'WHATSAPP_PREPARED',
    description: `WhatsApp message prepared for ${customer.name} using template ${template.name}`
  });

  return { whatsappUrl, resolvedMessage, status: 'prepared' };
};

module.exports = {
  create,
  list,
  getById,
  update,
  delete: remove,
  generateWhatsAppLink
};
