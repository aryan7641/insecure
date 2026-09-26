const express = require('express');
const passport = require('passport');
const authController = require('../controllers/auth.controller');
const authenticate = require('../middleware/authenticate');

const router = express.Router();
router.post('/login', authController.login);

// Google OAuth initiation
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// Google OAuth callback
router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/login' }),
  authController.googleCallback
);

// Token refresh
router.post('/refresh', authController.refreshToken);

// Logout
router.post('/logout', authController.logout);

// Get current user
router.get('/me', authenticate, authController.getMe);

// Switch agency
router.put('/switch-agency', authenticate, authController.switchAgency);

module.exports = router;
