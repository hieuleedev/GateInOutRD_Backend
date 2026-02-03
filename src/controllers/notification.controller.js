const Notification = require('../models/Notification');
const { FcmToken } = require("../models");
const { sendToTokens } = require("../utils/fcm.util");
/**
 * GET /api/notifications
 * Lấy danh sách thông báo của user đang đăng nhập
 */
exports.getMyNotifications = async (req, res) => {
  try {
    const userId = req.user.id;

    const notifications = await Notification.findAll({
      where: { user_id: userId },
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      data: notifications
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * PATCH /api/notifications/:id/read
 * Đánh dấu 1 thông báo là đã đọc
 */
exports.markAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const notification = await Notification.findOne({
      where: { id, user_id: userId }
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    notification.is_read = true;
    await notification.save();

    res.json({ success: true, message: 'Marked as read' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * PATCH /api/notifications/read-all
 * Đánh dấu tất cả thông báo là đã đọc
 */
exports.markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;

    await Notification.update(
      { is_read: true },
      { where: { user_id: userId, is_read: false } }
    );

    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * GET /api/notifications/unread-count
 * Đếm số thông báo chưa đọc
 */
exports.getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id;

    const count = await Notification.count({
      where: { user_id: userId, is_read: false }
    });

    res.json({ success: true, data: count });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
exports.pushToUser = async (req, res) => {
  try {
    const { userId, title, body, data } = req.body;

    const fcmTokens = await FcmToken.findAll({
      where: { user_id: userId },
      attributes: ["token"],
    });

    const tokens = fcmTokens.map((t) => t.token).filter(Boolean);

    if (!tokens.length) {
      return res.status(404).json({ message: "User chưa có token" });
    }

    const result = await sendToTokens(tokens, title, body, data);

    return res.json({ message: "Gửi thành công", result });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Lỗi server", error: err.message });
  }
}