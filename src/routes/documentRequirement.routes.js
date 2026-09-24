const router = require('express').Router({ mergeParams: true });
const documentRequirementController = require('../controllers/documentRequirement.controller');
const authenticate = require('../middleware/authenticate');
const { authorize } = require('../middleware/authorize');
const { setAgencyContext } = require('../middleware/agencyContext');

router.use(authenticate);
router.use(setAgencyContext);

router.post('/', authorize('admin'), documentRequirementController.create);
router.get('/', documentRequirementController.list);
router.put('/:id', authorize('admin'), documentRequirementController.update);
router.delete('/:id', authorize('admin'), documentRequirementController.remove);

module.exports = router;
