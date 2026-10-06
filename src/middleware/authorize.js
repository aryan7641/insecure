const { AuthorizationError } = require('../utils/apiError');

const authorize = (...roles) => {
  const allowedRoles = roles
    .flat(Infinity)
    .filter(Boolean)
    .map(r => String(r).toLowerCase().trim());

  return (req, res, next) => {
    if (!req.user) {
      return next(new AuthorizationError('User not authenticated'));
    }

    const userRole = String(req.user.role || '').toLowerCase().trim();
    if (!allowedRoles.includes(userRole) && userRole !== 'super_admin') {
      return next(new AuthorizationError('You do not have permission to perform this action'));
    }

    next();
  };
};

// Support both: require('./authorize') and const { authorize } = require('./authorize')
module.exports = authorize;
module.exports.authorize = authorize;
