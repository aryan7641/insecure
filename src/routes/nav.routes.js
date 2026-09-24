const router = require('express').Router();
const navController = require('../controllers/nav.controller');
const authenticate = require('../middleware/authenticate');
const { authorize } = require('../middleware/authorize');
const { uploadImport } = require('../middleware/upload');

router.use(authenticate);

router.post('/import', authorize('admin'), uploadImport.single('file'), navController.importNav);
router.get('/', navController.queryNav);
router.get('/import-history', authorize('admin'), navController.importHistory);

module.exports = router;
