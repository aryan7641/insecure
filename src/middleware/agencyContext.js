const mongoose = require('mongoose');
const { ValidationError, AuthorizationError } = require('../utils/apiError');

const setAgencyContext = (req, res, next) => {
  const agencyId = req.params.agencyId || req.headers['x-agency-id'];

  if (!agencyId) {
    return next(new ValidationError('Agency ID is required'));
  }

  if (!mongoose.Types.ObjectId.isValid(agencyId)) {
    return next(new ValidationError('Invalid Agency ID'));
  }

  const belongsToAgency = req.user.agencies && req.user.agencies.some(a => a.agencyId.toString() === agencyId.toString());

  if (!belongsToAgency) {
    return next(new AuthorizationError('You do not have access to this agency'));
  }

  req.agencyId = agencyId;
  next();
};

module.exports = setAgencyContext;
module.exports.setAgencyContext = setAgencyContext;
