const router = require('express').Router({ mergeParams: true });
const sipController = require('../controllers/sip.controller');
const authenticate = require('../middleware/authenticate');
const { setAgencyContext } = require('../middleware/agencyContext');
const { checkResourceAccess } = require('../middleware/resourceAccess');
const { authorize } = require('../middleware/authorize');

router.use(authenticate);
router.use(setAgencyContext);

router.post('/', sipController.create);
router.get('/', sipController.list);
router.get('/:sipId', checkResourceAccess('sip'), sipController.getById);
router.put('/:sipId', checkResourceAccess('sip'), sipController.update);
router.delete('/:sipId', checkResourceAccess('sip'), authorize('admin'), sipController.delete);

module.exports = router;
