const router = require('express').Router({ mergeParams: true });
const ocrController = require('../controllers/ocr.controller');
const authenticate = require('../middleware/authenticate');
const { setAgencyContext } = require('../middleware/agencyContext');
const { uploadDocument } = require('../middleware/upload');

router.use(authenticate);
router.use(setAgencyContext);

// 1. Upload Policy PDF & extract structured draft with OCR + LLM
router.post('/extract-pdf', uploadDocument.single('file'), ocrController.extractPolicyPdf);
router.post('/extract', uploadDocument.single('file'), ocrController.extractPolicyPdf);

// 2. Retrieve extracted result for human verification
router.get('/:docId/result', ocrController.getResult);

// 3. Confirm agent-reviewed data, commit Customer & Policy to database
router.post('/:docId/confirm-policy', ocrController.confirmPolicyFromOcr);
router.post('/:docId/confirm', ocrController.confirmPolicyFromOcr);

module.exports = router;
