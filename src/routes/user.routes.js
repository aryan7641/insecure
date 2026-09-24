const express = require('express');
const userController = require('../controllers/user.controller');
const authenticate = require('../middleware/authenticate');
const { authorize } = require('../middleware/authorize');
const { setAgencyContext } = require('../middleware/agencyContext');
const { ROLES } = require('../utils/constants');

const router = express.Router();

router.use(authenticate);

// List users in agency (admin only)
router.get('/', setAgencyContext, authorize(ROLES.ADMIN), userController.listUsers);

// Get user details
router.get('/:userId', userController.getUserById);

// Update user
router.put('/:userId', userController.updateUser);

module.exports = router;
