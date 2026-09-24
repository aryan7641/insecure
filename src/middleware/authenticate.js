const jwt = require('jsonwebtoken');
const config = require('../config');
const User = require('../models/User');
const { AuthenticationError } = require('../utils/apiError');

const authenticate = async (req, res, next) => {
  try {
    let token;
    
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      throw new AuthenticationError('No authentication token provided');
    }

    const decoded = jwt.verify(token, config.jwt.secret);
    const user = await User.findById(decoded.userId);

    if (!user || user.status !== 'active') {
      throw new AuthenticationError('User not found or inactive');
    }

    req.user = {
      userId: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
      agencies: user.agencies,
      activeAgencyId: user.activeAgencyId
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
      return next(new AuthenticationError('Invalid or expired token'));
    }
    next(error);
  }
};

module.exports = authenticate;
