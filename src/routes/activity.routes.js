const router = require('express').Router({ mergeParams: true });
const activityController = require('../controllers/activity.controller');
const authenticate = require('../middleware/authenticate');
const { setAgencyContext } = require('../middleware/agencyContext');

router.use(authenticate);
router.use(setAgencyContext);

router.get('/', activityController.getAgencyFeed);

module.exports = router;
