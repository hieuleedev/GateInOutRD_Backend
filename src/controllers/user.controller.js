const User = require('../models/User');
const  FcmToken  = require("../models/FcmToken");
/**
 * Lấy danh sách nhân sự cùng phòng với user đang đăng nhập
 */
exports.getStaffInMyDepartment = async (req, res) => {
  try {
    const userId = req.user.id; // lấy từ middleware auth
    console.log("usser",userId)
    // Lấy user hiện tại
    const currentUser = await User.findOne({
      where: { id: userId }
    });

    if (!currentUser || !currentUser.IDDepartment) {
      return res.json({
        success: true,
        data: []
      });
    }

    // Lấy danh sách nhân sự trong cùng phòng
    const users = await User.findAll({
      where: {
        IDDepartment: currentUser.IDDepartment
      },
      attributes: [
        'id',
        'MSNV',
        'FullName',
        'MailAdress',
        'Division',
        'PositionDetail',
        'Avatar'
      ]
    });

    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.saveFcmToken = async (req, res) => {
  try {
    const user_id = req.user?.id; // tùy middleware bạn đặt
    const { fcm_token } = req.body;
    if (!user_id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!fcm_token) {
      return res.status(400).json({ message: "Missing fcm_token" });
    }

    // 1) Check token tồn tại chưa
    const existed = await FcmToken.findOne({
      where: { token: fcm_token },
    });

    if (existed) {
      // 2) Nếu tồn tại rồi thì update lại user_id (phòng token thuộc user khác)
      existed.user_id = user_id;
      await existed.save();

      return res.json({
        message: "FCM token updated",
        data: existed,
      });
    }

    // 3) Nếu chưa có thì tạo mới
    const newToken = await FcmToken.create({
      user_id,
      token: fcm_token,
      platform: 'web',
    });

    return res.json({
      message: "FCM token saved",
      data: newToken,
    });
  } catch (err) {
    console.error("saveFcmToken error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
