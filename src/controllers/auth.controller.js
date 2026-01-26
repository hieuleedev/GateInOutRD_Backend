const User = require('../models/User');
const Department = require('../models/Department');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { secret, expiresIn } = require('../config/jwt');

exports.login = async (req, res) => {
  console.log("user",req.body)
  try {
    const { username, password } = req.body;

    // 1️⃣ Validate input
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập MSNV và mật khẩu'
      });
    }

    // 2️⃣ Tìm user
    const user = await User.findOne({
      where: { MSNV: username },
      include: [
        {
          model: Department,
          as: 'department',
          attributes: ['id', 'NameDept'] // chỉnh theo DB của bạn
        }
      ]
    });
    

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'MSNV hoặc mật khẩu không đúng'
      });
    }

    // 3️⃣ So sánh mật khẩu (Laravel bcrypt)
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'MSNV hoặc mật khẩu không đúng'
      });
    }

    // 4️⃣ Tạo JWT
    const token = jwt.sign(
      {
        id: user.id,
        MSNV: user.MSNV,
        Admin: user.Admin,
        IDDepartment: user.IDDepartment
      },
      secret,
      { expiresIn }
    );
    console.log("token",token)

    // 5️⃣ Response
    return res.json({
      success: true,
      token,
      user: {
        id: user.id,
        MSNV: user.MSNV,
        FullName: user.FullName,
        MailAddress: user.MailAddress,
        Division: user.Division,
        Admin: user.Admin,
        IDDepartment: user.IDDepartment,
        Avatar: user.Avatar.Admin,
        department: user.department
        ? {
            id: user.department.id,
            NameDept: user.department.NameDept
          }
        : null
      }
    });

  } catch (error) {
    console.error('LOGIN ERROR:', error);

    return res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống'
    });
  }
};
