const rateLimit = require('express-rate-limit');
const config = require('../config');

const generalLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs || 60000,
  max: config.rateLimit.max || 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({ success: false, message: 'Too many requests, please try again later' });
  }
});

const authLimiter = rateLimit({
  windowMs: 60000,
  max: config.rateLimit.authMax || 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({ success: false, message: 'Too many requests, please try again later' });
  }
});

module.exports = {
  generalLimiter,
  authLimiter
};
