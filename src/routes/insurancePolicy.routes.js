const router = require('express').Router({ mergeParams: true });
const insurancePolicyController = require('../controllers/insurancePolicy.controller');
const authenticate = require('../middleware/authenticate');
const { authorize } = require('../middleware/authorize');
const { setAgencyContext } = require('../middleware/agencyContext');
const { checkResourceAccess } = require('../middleware/resourceAccess');
const { ROLES } = require('../utils/constants');

router.use(authenticate);
router.use(setAgencyContext);

router.post('/', insurancePolicyController.create);
router.get('/', insurancePolicyController.list);

router.get('/:policyId', checkResourceAccess('policy'), insurancePolicyController.getById);
router.put('/:policyId', checkResourceAccess('policy'), insurancePolicyController.update);
router.delete('/:policyId', authorize([ROLES.ADMIN, ROLES.SUPER_ADMIN]), insurancePolicyController.delete);

module.exports = router;
