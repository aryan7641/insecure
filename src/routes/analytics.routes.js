const router = require('express').Router({ mergeParams: true });
const analyticsController = require('../controllers/analytics.controller');
const authenticate = require('../middleware/authenticate');
const { authorize } = require('../middleware/authorize');
const { setAgencyContext } = require('../middleware/agencyContext');

router.use(authenticate);
router.use(setAgencyContext);

router.get('/dashboard', authorize('admin'), analyticsController.getDashboard);
router.get('/insurance', analyticsController.getInsuranceAnalytics);
router.get('/mutual-funds', analyticsController.getMutualFundAnalytics);
router.get('/crm', analyticsController.getCrmAnalytics);

module.exports = router;
