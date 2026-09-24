const router = require('express').Router({ mergeParams: true });
const importController = require('../controllers/import.controller');
const authenticate = require('../middleware/authenticate');
const { authorize } = require('../middleware/authorize');
const { setAgencyContext } = require('../middleware/agencyContext');
const { uploadImport } = require('../middleware/upload');

router.use(authenticate);
router.use(setAgencyContext);

// Most import routes are admin-only
router.post('/upload', authorize(['admin']), uploadImport.single('file'), importController.upload);
router.get('/:importId/preview', authorize(['admin']), importController.preview);
router.post('/:importId/resolve', authorize(['admin']), importController.resolve);
router.post('/:importId/execute', authorize(['admin']), importController.execute);
router.get('/:importId/status', authorize(['admin']), importController.getStatus);
router.get('/:importId/errors', authorize(['admin']), importController.getErrors);
router.get('/templates/:type', authorize(['admin']), importController.downloadTemplate);
router.get('/', authorize(['admin']), importController.listHistory);

module.exports = router;
