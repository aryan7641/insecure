const { AuthorizationError } = require('../utils/apiError');
const { ROLES } = require('../utils/constants');
const Customer = require('../models/Customer');
const Policy = require('../models/InsurancePolicy');
const MutualFund = require('../models/MutualFund');
const Sip = require('../models/Sip');
const Transaction = require('../models/Transaction');
const Document = require('../models/Document');
const FollowUp = require('../models/FollowUp');

const getModelForResource = (resourceType) => {
  const models = {
    customer: Customer,
    policy: Policy,
    mutualFund: MutualFund,
    sip: Sip,
    transaction: Transaction,
    document: Document,
    followUp: FollowUp
  };
  return models[resourceType];
};

const checkResourceAccess = (resourceType) => {
  return async (req, res, next) => {
    try {
      if (req.user.role === ROLES.ADMIN) {
        return next();
      }

      const idParamMap = {
        customer: 'customerId',
        policy: 'policyId',
        mutualFund: 'mutualFundId',
        sip: 'sipId',
        transaction: 'transactionId',
        document: 'documentId',
        followUp: 'followUpId'
      };

      const resourceId = req.params[idParamMap[resourceType]] || req.params.id;
      if (!resourceId) return next();

      const Model = getModelForResource(resourceType);
      if (!Model) {
        return next();
      }

      const resource = await Model.findById(resourceId);
      if (!resource) {
        return next();
      }

      if (resourceType === 'customer') {
        if (resource.assignedAgentId.toString() !== req.user.userId.toString()) {
          throw new AuthorizationError('You do not have access to this resource');
        }
      } else {
        if (!resource.customerId) {
          throw new AuthorizationError('Resource missing customer reference');
        }
        const customer = await Customer.findById(resource.customerId);
        if (!customer || customer.assignedAgentId.toString() !== req.user.userId.toString()) {
          throw new AuthorizationError('You do not have access to this resource');
        }
      }

      req.resource = resource;
      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = checkResourceAccess;
