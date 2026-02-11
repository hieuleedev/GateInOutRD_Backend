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

exports.changePassword = async (req, res) => {
  try {
    const userId = req.user.id;

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        message: "Thiếu dữ liệu",
      });
    }

    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({
        message: "User không tồn tại",
      });
    }

    const isMatch = await bcrypt.compare(
      currentPassword,
      user.password
    );

    if (!isMatch) {
      return res.status(401).json({
        message: "Mật khẩu hiện tại không đúng",
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await User.update(
      { password: hashedPassword },
      { where: { id: userId } }
    );

    return res.status(200).json({
      message: "Đổi mật khẩu thành công",
    });
  } catch (error) {
    console.error("changePassword error:", error);
    return res.status(500).json({
      message: "Lỗi server",
    });
  }
};
