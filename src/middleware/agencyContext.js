const mongoose = require('mongoose');
const { ValidationError, AuthorizationError } = require('../utils/apiError');

const setAgencyContext = (req, res, next) => {
  let agencyId = req.params.agencyId || req.headers['x-agency-id'] || req.user?.activeAgencyId;

  // Fallback to user's active agency if agencyId is not a valid ObjectId
  if (!agencyId || !mongoose.Types.ObjectId.isValid(agencyId.toString())) {
    if (req.user?.activeAgencyId) {
      agencyId = req.user.activeAgencyId.toString();
    } else if (req.user?.agencies && req.user.agencies.length > 0) {
      const firstAgency = req.user.agencies[0].agencyId;
      agencyId = (firstAgency._id || firstAgency).toString();
    }
  }

  if (!agencyId || !mongoose.Types.ObjectId.isValid(agencyId.toString())) {
    return next(new ValidationError('Valid Agency ID is required'));
  }

  const belongsToAgency = req.user.role === 'super_admin' || 
    (req.user.agencies && req.user.agencies.some(a => {
      const aId = a.agencyId._id || a.agencyId;
      return aId && aId.toString() === agencyId.toString();
    }));

  if (!belongsToAgency) {
    return next(new AuthorizationError('You do not have access to this agency'));
  }

  req.agencyId = agencyId;
  next();
};

module.exports = setAgencyContext;
module.exports.setAgencyContext = setAgencyContext;
