const { User } = require("../models"); // hoặc require("../models/index")

module.exports = async (req, res, next) => {
  try {
    // req.user được gán từ middleware auth (jwt)
    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        message: "Chưa đăng nhập",
      });
    }

    // tìm user trong DB
    const user = await User.findByPk(req.user.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Tài khoản không tồn tại",
      });
    }

    // Position bảo vệ = 13
    if (Number(user.IDPosition) !== 13) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền của bảo vệ",
      });
    }

    // gán lại full user cho request để dùng tiếp
    req.user = user;

    next();
  } catch (err) {
    console.log("guardOnly error:", err);
    return res.status(500).json({
      success: false,
      message: "Lỗi xác thực quyền bảo vệ",
    });
  }
};
