const router = require('express').Router();

router.use('/auth', require('./auth.routes'));
router.use('/agencies', require('./agency.routes'));
router.use('/users', require('./user.routes'));
router.use('/', require('./insuranceSchema.routes'));
router.use('/agencies/:agencyId/customers', require('./customer.routes'));
router.use('/agencies/:agencyId/insurance-policies', require('./insurancePolicy.routes'));
router.use('/agencies/:agencyId', require('./insuranceSchema.routes'));
router.use('/agencies/:agencyId/mutual-funds', require('./mutualFund.routes'));
router.use('/agencies/:agencyId/sips', require('./sip.routes'));
router.use('/agencies/:agencyId/transactions', require('./transaction.routes'));
router.use('/nav', require('./nav.routes'));
router.use('/agencies/:agencyId/documents', require('./document.routes'));
router.use('/agencies/:agencyId/ocr', require('./ocr.routes'));
router.use('/agencies/:agencyId/follow-ups', require('./followUp.routes'));
router.use('/agencies/:agencyId/notifications', require('./notification.routes'));
router.use('/agencies/:agencyId/templates', require('./template.routes'));
router.use('/agencies/:agencyId/imports', require('./import.routes'));
router.use('/agencies/:agencyId/analytics', require('./analytics.routes'));
router.use('/agencies/:agencyId/activity', require('./activity.routes'));
router.use('/agencies/:agencyId/audit-logs', require('./auditLog.routes'));
router.use('/agencies/:agencyId/document-requirements', require('./documentRequirement.routes'));

module.exports = router;
