const router = require('express').Router({ mergeParams: true });
const followUpController = require('../controllers/followUp.controller');
const authenticate = require('../middleware/authenticate');
const { authorize } = require('../middleware/authorize');
const { setAgencyContext } = require('../middleware/agencyContext');
const { ROLES } = require('../utils/constants');

router.use(authenticate);
router.use(setAgencyContext);

router.post('/', followUpController.create);
router.get('/', followUpController.list);

router.get('/:followUpId', followUpController.getById);
router.put('/:followUpId', followUpController.update);
router.delete('/:followUpId', authorize([ROLES.ADMIN, ROLES.SUPER_ADMIN]), followUpController.delete);

module.exports = router;
