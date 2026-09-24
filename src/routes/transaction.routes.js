const router = require('express').Router({ mergeParams: true });
const transactionController = require('../controllers/transaction.controller');
const authenticate = require('../middleware/authenticate');
const { setAgencyContext } = require('../middleware/agencyContext');
const { checkResourceAccess } = require('../middleware/resourceAccess');
const { authorize } = require('../middleware/authorize');

router.use(authenticate);
router.use(setAgencyContext);

router.post('/', transactionController.create);
router.get('/', transactionController.list);
router.get('/:txnId', checkResourceAccess('transaction'), transactionController.getById);
router.put('/:txnId', checkResourceAccess('transaction'), transactionController.update);
router.delete('/:txnId', checkResourceAccess('transaction'), authorize('admin'), transactionController.delete);

module.exports = router;
