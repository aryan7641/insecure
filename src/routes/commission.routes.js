const router = require('express').Router({ mergeParams: true });
const commissionController = require('../controllers/commission.controller');
const authenticate = require('../middleware/authenticate');
const { authorize } = require('../middleware/authorize');
const { setAgencyContext } = require('../middleware/agencyContext');
const { ROLES } = require('../utils/constants');

router.use(authenticate);
router.use(setAgencyContext);

// List all commissions for agency (admin views all, agent views own)
router.get('/', commissionController.list);

// Policy commission endpoints
router.get('/:policyId', commissionController.getByPolicyId);
router.post('/:policyId', commissionController.upsertCommission);
router.put('/:policyId', commissionController.upsertCommission);
router.delete('/:policyId', commissionController.deleteCommission);

module.exports = router;
