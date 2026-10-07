const router = require('express').Router({ mergeParams: true });
const insurancePolicyController = require('../controllers/insurancePolicy.controller');
const authenticate = require('../middleware/authenticate');
const { authorize } = require('../middleware/authorize');
const { setAgencyContext } = require('../middleware/agencyContext');
const { checkResourceAccess } = require('../middleware/resourceAccess');
const { ROLES } = require('../utils/constants');

const commissionController = require('../controllers/commission.controller');

router.use(authenticate);
router.use(setAgencyContext);

router.post('/', insurancePolicyController.create);
router.get('/', insurancePolicyController.list);

router.get('/:policyId', checkResourceAccess('policy'), insurancePolicyController.getById);
router.put('/:policyId', checkResourceAccess('policy'), insurancePolicyController.update);
router.post('/:policyId/renew', checkResourceAccess('policy'), insurancePolicyController.renew);
router.delete('/:policyId', authorize([ROLES.ADMIN, ROLES.SUPER_ADMIN]), insurancePolicyController.delete);

// Policy commission management
router.get('/:policyId/commission', commissionController.getByPolicyId);
router.post('/:policyId/commission', commissionController.upsertCommission);
router.put('/:policyId/commission', commissionController.upsertCommission);
router.delete('/:policyId/commission', authorize([ROLES.ADMIN, ROLES.SUPER_ADMIN]), commissionController.deleteCommission);

// Policy Document Storage (Aadhaar, PAN, RC, GST Certificate)
router.use('/:policyId/documents', require('./policyDocument.routes'));

module.exports = router;
