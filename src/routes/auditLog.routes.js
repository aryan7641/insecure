const router = require('express').Router({ mergeParams: true });
const auditLogController = require('../controllers/auditLog.controller');
const authenticate = require('../middleware/authenticate');
const { authorize } = require('../middleware/authorize');
const { setAgencyContext } = require('../middleware/agencyContext');

router.use(authenticate);
router.use(setAgencyContext);
router.use(authorize('admin')); // Admin only

router.get('/', auditLogController.queryAuditLogs);

module.exports = router;
