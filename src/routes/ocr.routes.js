const router = require('express').Router({ mergeParams: true });
const ocrController = require('../controllers/ocr.controller');
const authenticate = require('../middleware/authenticate');
const { setAgencyContext } = require('../middleware/agencyContext');

router.use(authenticate);
router.use(setAgencyContext);

router.post('/:docId/process', ocrController.process);
router.get('/:docId/result', ocrController.getResult);
router.post('/:docId/confirm', ocrController.confirm);

module.exports = router;
