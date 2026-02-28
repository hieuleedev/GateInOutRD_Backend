const { User, Department, Position, FcmToken } = require('../models');

/**
 * Lấy user kèm department + position
 * @param {number} userId
 * @returns {Promise<User|null>}
 */
const getUserWithRelations = async (userId) => {
  if (!userId) return null;

  return User.findByPk(userId, {
    include: [
      {
        model: Department,
        as: 'department',
        attributes: ['id', 'NameDept', 'Group']
      },
      {
        model: Position,
        as: 'position',
        attributes: ['id', 'Name']
      }
    ]
  });
};

/**
 * Lấy departmentId từ user
 * @param {number} userId
 * @returns {Promise<number|null>}
 */
const getDepartmentIdByUserId = async (userId) => {
  if (!userId) return null;

  const user = await User.findByPk(userId, {
    attributes: ['IDDepartment','id']
  });
  console.log("usser",user)

  return user ;
};

/**
 * Lấy group của user (hay dùng cho phân quyền)
 * @param {number} userId
 * @returns {Promise<string|null>}
 */
const getGroupByUserId = async (userId) => {
  if (!userId) return null;

  const user = await User.findByPk(userId, {
    include: {
      model: Department,
      as: 'department',
      attributes: ['Group']
    }
  });
  console.log("user",user)

  return user?.department?.Group || null;
};

const getApproversByPositionId = async (positionId) => {
    if (!positionId) return [];
  
    return User.findOne({
      where: {
        IDPosition: positionId
      }
    });
  };

/**
 * Xác định vị trí (position) dùng để duyệt theo group của user
 * @param {number} userId
 * @returns {Promise<Position|null>}
 * 
 * 
 */


const getUserApprovePosition = async (userId) => {
    if (!userId) return null;
  
    const user = await User.findByPk(userId, {
      include: [
        {
          model: Department,
          as: 'department',
          attributes: ['Group']
        },
        {
          model: Position,
          as: 'position'
        }
      ]
    });
  
    if (!user || !user.department) return null;
  
    const group = user.department.Group;
  
    // 🔥 SWITCH CASE THEO GROUP
    switch (group) {
      case 'NVQT Cơ bản':
        // nhân viên cơ bản → không có quyền duyệt
        return getApproversByPositionId(5);
  
      case 'NV NC Sản phẩm':
        // duyệt theo position hiện tại
        return getApproversByPositionId(177);
  
      case 'Thiết kế chuyên môn':
        // duyệt theo position hiện tại
        return getApproversByPositionId(4);
  
      case 'Thiết kế ô tô':
        return getApproversByPositionId(5);
  
      case 'Ban lãnh đạo':
        // lãnh đạo → duyệt cấp cao
        return getApproversByPositionId(1);
      case 'Mô phỏng & Thử nghiệm':
          // lãnh đạo → duyệt cấp cao
          return getApproversByPositionId(5);
      case 'Phòng Phát triển sản phẩm xe Tải':
            // lãnh đạo → duyệt cấp cao
          return getDepartmentIdByUserId(260);
      case 'Phòng Phát triển sản phẩm xe Bus':
            // lãnh đạo → duyệt cấp cao
          return getDepartmentIdByUserId(123);
      
      case 'Phòng Phát triển sản phẩm xe Royal & Du lịch':
            // lãnh đạo → duyệt cấp cao
          return getDepartmentIdByUserId(177);
      case 'Phòng Phát triển sản phẩm xe Minibus & Năng lương mới':
            // lãnh đạo → duyệt cấp cao
          return getDepartmentIdByUserId(324);
      default:
        return null;
    }
  };

  const getUserCheckManager = async (userId) => {
    if (!userId) return null;
  
    // 1️⃣ Lấy department của user hiện tại
    const user = await User.findByPk(userId, {
      attributes: ['IDDepartment']
    });
  
    if (!user?.IDDepartment) return null;
  
    // 2️⃣ Ưu tiên tìm position = 6
    let manager = await User.findOne({
      where: {
        IDDepartment: user.IDDepartment,
        IDPosition: 6
      },
      include: [
        { model: Department, as: 'department', attributes: ['id', 'NameDept'] },
        { model: Position, as: 'position', attributes: ['id', 'NamePosition'] }
      ]
    });
  
    // 3️⃣ Nếu không có → tìm position = 7
    if (!manager) {
      manager = await User.findOne({
        where: {
          IDDepartment: user.IDDepartment,
          IDPosition: 7
        },
        include: [
          { model: Department, as: 'department', attributes: ['id', 'NameDept'] },
          { model: Position, as: 'position', attributes: ['id', 'NamePosition'] }
        ]
      });
    }
  
    return manager;
  };


  const getUserLevel1 = async (userId) => {
    if (!userId) return null;

    // ✅ Mảng ID mặc định trong function
    const allowedUserIds = [383]; // sửa theo nhu cầu
  
    // ✅ Nếu không nằm trong mảng → return luôn
    if (!allowedUserIds.includes(userId)) {
      return null;
    }
  
    // ✅ Nếu có trong mảng → mới query DB
    const user = await User.findByPk(userId, {
      include: [
        { model: Department, as: 'department', attributes: ['id', 'NameDept'] },
        { model: Position, as: 'position', attributes: ['id', 'NamePosition'] }
      ]
    });
  
    return user || null;
  };

  const getFcmTokenByUserId = async (userId) => {
    if (!userId) return null;
  
    const token = await FcmToken.findByPk({
      where: { user_id: userId },
      //order: [['createdAt', 'DESC']], // hoặc updatedAt
      attributes: ['token']
    });
  
    return token?.token || null;
  };
  


/**
 * Kiểm tra user có thuộc group cho phép không
 * @param {number} userId
 * @param {string[]} allowedGroups
 * @returns {Promise<boolean>}
 */
const userInGroups = async (userId, allowedGroups = []) => {
  const group = await getGroupByUserId(userId);
  if (!group) return false;
  return allowedGroups.includes(group);
};

module.exports = {
  getUserWithRelations,
  getDepartmentIdByUserId,
  getGroupByUserId,
  userInGroups,
  getUserCheckManager,
  getUserApprovePosition,
  getFcmTokenByUserId,
  getUserLevel1
};
