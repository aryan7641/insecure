const Customer = require('../models/Customer');
const { NotFoundError } = require('../utils/apiError');
const { generateWhatsAppUrl } = require('../utils/whatsappUrl');
const activityService = require('./activity.service');

const prepareMessage = async (agencyId, customerId, message, user) => {
  const customer = await Customer.findOne({ _id: customerId, agencyId });
  if (!customer) throw new NotFoundError('Customer not found');

  const whatsappUrl = generateWhatsAppUrl(customer.mobile, message);

  await activityService.log({
    agencyId,
    actorId: user.userId,
    customerId: customer._id,
    resourceType: 'WhatsAppMessage',
    resourceId: null,
    actionType: 'WHATSAPP_PREPARED',
    description: `WhatsApp message prepared for ${customer.name}`
  });

  return { whatsappUrl, resolvedMessage: message, status: 'prepared' };
};

module.exports = {
  prepareMessage
};
