const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth.middleware');
const notificationController = require('../controllers/notification.controller');

// lấy danh sách thông báo
router.get('/', authMiddleware, notificationController.getMyNotifications);

// đếm chưa đọc
router.get('/unread-count', authMiddleware, notificationController.getUnreadCount);

// đọc 1 thông báo
router.patch('/:id/read', authMiddleware, notificationController.markAsRead);

// đọc tất cả
router.patch('/read-all', authMiddleware, notificationController.markAllAsRead);

module.exports = router;
