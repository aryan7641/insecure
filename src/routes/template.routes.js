const router = require('express').Router({ mergeParams: true });
const templateController = require('../controllers/template.controller');
const authenticate = require('../middleware/authenticate');
const { setAgencyContext } = require('../middleware/agencyContext');

router.use(authenticate);
router.use(setAgencyContext);

router.post('/', templateController.create);
router.get('/', templateController.list);
router.get('/:templateId', templateController.getById);
router.put('/:templateId', templateController.update);
router.delete('/:templateId', templateController.remove);
router.post('/:templateId/generate', templateController.generateLink);

module.exports = router;
