const { AuthorizationError } = require('../utils/apiError');

const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AuthorizationError('User not authenticated'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new AuthorizationError('You do not have permission to perform this action'));
    }

    next();
  };
};

// Support both: require('./authorize') and const { authorize } = require('./authorize')
module.exports = authorize;
module.exports.authorize = authorize;
