const User = require('../models/User');

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
