const express = require('express');
const agencyController = require('../controllers/agency.controller');
const authenticate = require('../middleware/authenticate');
const { authorize } = require('../middleware/authorize');
const { setAgencyContext } = require('../middleware/agencyContext');
const { ROLES } = require('../utils/constants');

const router = express.Router();

router.use(authenticate);

// List user's agencies
router.get('/', agencyController.getUserAgencies);

// Create agency (admin only)
router.post('/', authorize(ROLES.ADMIN), agencyController.createAgency);

// Agency specific routes
router.get('/:agencyId', setAgencyContext, agencyController.getAgencyById);
router.put('/:agencyId', setAgencyContext, authorize(ROLES.ADMIN), agencyController.updateAgency);
router.get('/:agencyId/members', setAgencyContext, agencyController.getAgencyMembers);
router.post('/:agencyId/agents', setAgencyContext, authorize(ROLES.ADMIN), agencyController.addAgent);
router.delete('/:agencyId/agents/:userId', setAgencyContext, authorize(ROLES.ADMIN), agencyController.removeAgent);
router.post('/:agencyId/admins', setAgencyContext, authorize(ROLES.ADMIN), agencyController.addAdmin);

module.exports = router;
