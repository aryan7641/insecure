const router = require('express').Router({ mergeParams: true });
const mutualFundController = require('../controllers/mutualFund.controller');
const authenticate = require('../middleware/authenticate');
const { setAgencyContext } = require('../middleware/agencyContext');
const { checkResourceAccess } = require('../middleware/resourceAccess');
const { authorize } = require('../middleware/authorize');

router.use(authenticate);
router.use(setAgencyContext);

router.post('/', mutualFundController.create);
router.get('/', mutualFundController.list);
router.get('/:fundId', checkResourceAccess('mutualFund'), mutualFundController.getById);
router.put('/:fundId', checkResourceAccess('mutualFund'), mutualFundController.update);
router.delete('/:fundId', checkResourceAccess('mutualFund'), authorize('admin'), mutualFundController.delete);

module.exports = router;
