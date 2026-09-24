const router = require('express').Router({ mergeParams: true });
const customerController = require('../controllers/customer.controller');
const authenticate = require('../middleware/authenticate');
const { authorize } = require('../middleware/authorize');
const { setAgencyContext } = require('../middleware/agencyContext');
const { checkResourceAccess } = require('../middleware/resourceAccess');
const { ROLES } = require('../utils/constants');

router.use(authenticate);
router.use(setAgencyContext);

router.post('/', customerController.create);
router.get('/', customerController.list);
router.get('/check-duplicate', customerController.checkDuplicate);
router.post('/merge', authorize([ROLES.ADMIN, ROLES.SUPER_ADMIN]), customerController.merge);

router.get('/:customerId', checkResourceAccess('customer'), customerController.getById);
router.put('/:customerId', checkResourceAccess('customer'), customerController.update);
router.delete('/:customerId', authorize([ROLES.ADMIN, ROLES.SUPER_ADMIN]), customerController.delete);
router.post('/:customerId/assign', authorize([ROLES.ADMIN, ROLES.SUPER_ADMIN]), customerController.assign);
router.get('/:customerId/analytics', checkResourceAccess('customer'), customerController.getAnalytics);
router.get('/:customerId/documents/status', checkResourceAccess('customer'), customerController.getDocumentStatus);

module.exports = router;
