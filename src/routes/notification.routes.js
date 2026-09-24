const router = require('express').Router({ mergeParams: true });
const notificationController = require('../controllers/notification.controller');
const authenticate = require('../middleware/authenticate');
const { setAgencyContext } = require('../middleware/agencyContext');

router.use(authenticate);
router.use(setAgencyContext);

router.get('/', notificationController.list);
router.put('/read-all', notificationController.markAllAsRead);
router.put('/:id/read', notificationController.markAsRead);
router.get('/unread-count', notificationController.getUnreadCount);

module.exports = router;
