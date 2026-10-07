const router = require('express').Router({ mergeParams: true });
const policyDocumentController = require('../controllers/policyDocument.controller');
const { uploadPolicyDocumentSingle } = require('../middleware/upload');
const authenticate = require('../middleware/authenticate');
const { authorize } = require('../middleware/authorize');
const { setAgencyContext } = require('../middleware/agencyContext');
const { ROLES } = require('../utils/constants');

router.use(authenticate);
router.use(setAgencyContext);

// 1. Upload or replace document for policy
router.post('/', uploadPolicyDocumentSingle, policyDocumentController.uploadDocument);

// 2. List documents for policy
router.get('/', policyDocumentController.listDocuments);

// 3. Get single document metadata
router.get('/:documentId', policyDocumentController.getDocumentById);

// 4. Download document (authorized pre-signed URL)
router.get('/:documentId/download', policyDocumentController.getDownloadUrl);

// 5. Preview document (authorized inline pre-signed URL)
router.get('/:documentId/preview', (req, res, next) => {
  req.query.inline = 'true';
  next();
}, policyDocumentController.getDownloadUrl);

// 6. Direct server stream
router.get('/:documentId/stream', policyDocumentController.streamDocument);

// 7. Replace document
router.post('/:documentId/replace', uploadPolicyDocumentSingle, policyDocumentController.uploadDocument);
router.put('/:documentId/replace', uploadPolicyDocumentSingle, policyDocumentController.uploadDocument);

// 8. Archive / Delete document (Admin only)
router.delete('/:documentId', authorize([ROLES.ADMIN, 'super_admin']), policyDocumentController.deleteDocument);

module.exports = router;
