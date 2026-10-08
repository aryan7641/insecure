const express = require('express');
const passport = require('passport');
const authController = require('../controllers/auth.controller');
const authenticate = require('../middleware/authenticate');
const config = require('../config');

const router = express.Router();
router.post('/login', authController.login);

// Google OAuth initiation
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// Google OAuth callback with robust error handling
router.get('/google/callback', (req, res, next) => {
  passport.authenticate('google', { session: false }, async (err, user, info) => {
    if (err || !user) {
      console.error('[Google OAuth Failure]:', err || info);
      const message = encodeURIComponent(err?.message || info?.message || 'Google authentication failed. Please try again.');
      return res.redirect(`${config.frontendUrl}/login?error=${message}`);
    }
    req.user = user;
    return authController.googleCallback(req, res, next);
  })(req, res, next);
});

// Token refresh
router.post('/refresh', authController.refreshToken);

// Logout
router.post('/logout', authController.logout);

// Get current user
router.get('/me', authenticate, authController.getMe);

// Switch agency
router.put('/switch-agency', authenticate, authController.switchAgency);

module.exports = router;
