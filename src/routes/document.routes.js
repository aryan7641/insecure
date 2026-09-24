const router = require('express').Router({ mergeParams: true });
const documentController = require('../controllers/document.controller');
const authenticate = require('../middleware/authenticate');
const { setAgencyContext } = require('../middleware/agencyContext');
const { uploadDocument } = require('../middleware/upload');

router.use(authenticate);
router.use(setAgencyContext);

router.post('/', uploadDocument.single('file'), documentController.upload);
router.get('/', documentController.list);
router.get('/:docId', documentController.getById);
router.get('/:docId/download', documentController.download);
router.delete('/:docId', documentController.delete);

module.exports = router;
