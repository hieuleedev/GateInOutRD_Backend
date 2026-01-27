import {
  User,
  Card,
  AccessRequest,
  AccessRequestCompanion,
  AccessRequestApproval,
  Factory,
  Notification,
  AccessLog,
  Department
} from '../models/index.js';

import {
  getGroupByUserId,
  getUserApprovePosition,
  getUserCheckManager
} from '../utils/user.util.js';

import sequelize from '../config/database.js';
import { Op, fn, col, literal } from 'sequelize';



// exports.createAccessRequest = async (req, res) => {
//   const t = await sequelize.transaction();
//   try {
//     const {
//       factory_id,
//       checkInTime,
//       checkOutTime,
//       reason,
//       companions = []
//     } = req.body;
//     const factoryId = Number(factory_id)
//     const user_id = req.user.id;
//     const userAprove = await  getUserApprovePosition(req.user.id);
//     const userCheck = await  getUserCheckManager(req.user.id);
//     if (!factory_id || !checkInTime || !checkOutTime) {
//       await t.rollback();
//       return res.status(400).json({
//         message: 'Thiếu thông tin bắt buộc'
//       });
//     }

//     // 1️⃣ Lấy user để biết department
//     const user = await User.findByPk(user_id, {
//       transaction: t
//     });

//     if (!user || !user.IDDepartment) {
//       await t.rollback();
//       return res.status(400).json({
//         message: 'User chưa có phòng ban'
//       });
//     }

//     // 2️⃣ Tìm Card của phòng (1–1)
//     const card = await Card.findOne({
//       where: {
//         department_id: user.IDDepartment
//       },
//       transaction: t
//     });

//     if (!card) {
//       await t.rollback();
//       return res.status(400).json({
//         message: 'Phòng chưa được cấp thẻ'
//       });
//     }

//     // 3️⃣ Tạo AccessRequest (card_id LÚC NÀY GẮN LUÔN hoặc để null)
//     const request = await AccessRequest.create({
//       user_id,
//       factory_id: Number(factory_id),
//       card_id: card.id, // 👈 gắn card của phòng
//       planned_out_time: checkInTime,
//       planned_in_time: checkOutTime,
//       reason,
//       status: 'PENDING'
//     }, { transaction: t });

//     // 4️⃣ Người đi cùng
//     if (companions.length > 0) {
//       const companionRows = companions.map(uid => ({
//         request_id: request.id,
//         user_id: uid
//       }));

//       await AccessRequestCompanion.bulkCreate(
//         companionRows,
//         { transaction: t }
//       );
//     }
//     const approverRows = [
//       {
//         request_id: request.id,
//         approver_id: user_id,      // 👈 CẤP 1: chính user
//         approval_level: 1,
        
//       },
//       {
//         request_id: request.id,
//         approver_id: userCheck.id,   // 👈 CẤP 2: trưởng / phó phòng
//         approval_level: 2,
//         decision: null
//       },
//       {
//         request_id: request.id,
//         approver_id: userAprove.id,  // 👈 CẤP 3: approver theo group
//         approval_level: 3,
//         decision: null
//       }
//     ];
    
//     await AccessRequestApproval.bulkCreate(
//       approverRows,
//       { transaction: t }
//     );

//     await t.commit();


    

//     return res.status(201).json({
//       message: 'Đăng ký ra/vào cổng thành công',
//       data: request
//     });

//   } catch (error) {
//     await t.rollback();
//     console.error(error);
//     return res.status(500).json({
//       message: 'Lỗi server'
//     });
//   }
// };


export const createAccessRequest = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const {
      factory_id,
      checkInTime,
      checkOutTime,
      reason,
      companions = []
    } = req.body;

    const user_id = req.user.id;

    if (!factory_id || !checkInTime || !checkOutTime) {
      await t.rollback();
      return res.status(400).json({ message: 'Thiếu thông tin bắt buộc' });
    }

    // 1️⃣ Lấy user + department
    const user = await User.findByPk(user_id, { transaction: t });
    if (!user?.IDDepartment) {
      await t.rollback();
      return res.status(400).json({ message: 'User chưa có phòng ban' });
    }

    // 2️⃣ Lấy card theo department
    const card = await Card.findOne({
      where: { department_id: user.IDDepartment },
      transaction: t
    });

    if (!card) {
      await t.rollback();
      return res.status(400).json({ message: 'Phòng chưa được cấp thẻ' });
    }

    // 3️⃣ Xác định người duyệt
    const manager = await getUserCheckManager(user_id);        // cấp 2
    const approver = await getUserApprovePosition(user_id);    // cấp 3

    // 4️⃣ Tạo AccessRequest
    const request = await AccessRequest.create({
      user_id,
      factory_id: Number(factory_id),
      card_id: card.id,
      planned_out_time: checkInTime,
      planned_in_time: checkOutTime,
      reason,
      status: 'PENDING',
      current_approval_level: 0 // chưa duyệt cấp nào
    }, { transaction: t });

    // 5️⃣ Người đi cùng
    if (companions.length > 0) {
      await AccessRequestCompanion.bulkCreate(
        companions.map(uid => ({
          request_id: request.id,
          user_id: uid
        })),
        { transaction: t }
      );
    }

    // 6️⃣ TẠO DANH SÁCH DUYỆT (QUAN TRỌNG NHẤT)
    const approverRows = [];
    let level = 1;
    
    // Cấp 1: user tạo đơn → PENDING
    approverRows.push({
      request_id: request.id,
      approver_id: user_id,
      approval_level: level,
      decision: 'PENDING'
    });
    level++;
    
    // Cấp 2: manager (nếu khác user) → NULL
    if (manager && manager.id !== user_id) {
      approverRows.push({
        request_id: request.id,
        approver_id: manager.id,
        approval_level: level,
        decision: null
      });
      level++;
    }
    
    // Cấp 3: approver theo group → NULL
    if (
      approver &&
      approver.id !== user_id &&
      approver.id !== manager?.id
    ) {
      approverRows.push({
        request_id: request.id,
        approver_id: approver.id,
        approval_level: level,
        decision: null
      });
      level++;
    }
    

    await AccessRequestApproval.bulkCreate(
      approverRows,
      { transaction: t }
    );

    // 7️⃣ Cập nhật tổng số cấp duyệt
    await request.update({
      approval_levels: approverRows.length
    }, { transaction: t });

    await t.commit();

    return res.status(201).json({
      message: 'Đăng ký ra/vào cổng thành công',
      data: {
        request_id: request.id,
        approval_levels: approverRows.length
      }
    });

  } catch (error) {
    await t.rollback();
    console.error(error);
    return res.status(500).json({ message: 'Lỗi server' });
  }
};


export const getAccessRequestsByApprover = async (req, res) => {
  try {
    const approverId = req.user.id;

    // 1️⃣ LẤY DANH SÁCH REQUEST (như bạn đang làm)
    const requests = await AccessRequestApproval.findAll({
      where: {
        approver_id: approverId,
        decision: {
          [Op.in]: ['PENDING', 'APPROVED', 'REJECTED']
        }
      },
      include: [
        {
          model: AccessRequest,
          as: 'request',
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'FullName','Division','MSNV']
            },
            {
              model: Factory,
              as: 'factory',
              attributes: ['id', 'factory_code', 'factory_name']
            },
            {
              model: AccessRequestCompanion,
              as: 'companions',
              include: [
                {
                  model: User,
                  as: 'user',
                  attributes: ['id', 'FullName','MSNV']
                }
              ]
            },
            {
              model: Card,
              as: 'card',
              attributes: ['id', 'card_code']
            },
            {
              model: AccessRequestApproval,
              as: 'approvals',
              include: [
                {
                  model: User,
                  as: 'approver',
                  attributes: ['id', 'FullName']
                }
              ],
              order: [['id', 'ASC']]
            }
          ]
        }
      ],
      order: [[{ model: AccessRequest, as: 'request' }, 'createdAt', 'DESC']],
      distinct: true
    });

    // 2️⃣ ĐẾM STATS
    const statsRaw = await AccessRequest.findAll({
      include: [
        {
          model: AccessRequestApproval,
          as: 'approvals',
          where: {
            approver_id: approverId
          },
          attributes: []
        }
      ],
      attributes: [
        [fn('COUNT', fn('DISTINCT', col('AccessRequest.id'))), 'total'],
        [
          fn(
            'SUM',
            literal(`CASE WHEN AccessRequest.status = 'PENDING' THEN 1 ELSE 0 END`)
          ),
          'pending'
        ],
        [
          fn(
            'SUM',
            literal(`CASE WHEN AccessRequest.status = 'APPROVED' THEN 1 ELSE 0 END`)
          ),
          'approved'
        ],
        [
          fn(
            'SUM',
            literal(`CASE WHEN AccessRequest.status = 'REJECTED' THEN 1 ELSE 0 END`)
          ),
          'rejected'
        ]
      ],
      raw: true
    });
    

    const stats = {
      total: Number(statsRaw[0].total) || 0,
      pending: Number(statsRaw[0].pending) || 0,
      approved: Number(statsRaw[0].approved) || 0,
      rejected: Number(statsRaw[0].rejected) || 0
    };

    return res.json({
      data: requests,
      stats
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Lỗi server' });
  }
};

export const approveRequest = async (req, res) => {
  try {
    const requestId = req.params.id;
    const userId = req.user.id;

    // 1️⃣ Lấy approval đang PENDING
    const currentApproval = await AccessRequestApproval.findOne({
      where: {
        request_id: requestId,
        decision: 'PENDING'
      },
      order: [['id', 'ASC']]
    });

    if (!currentApproval) {
      return res.status(400).json({
        message: 'Không có bước duyệt đang chờ'
      });
    }

    // 2️⃣ Check đúng approver
    if (currentApproval.approver_id !== userId) {
      return res.status(403).json({
        message: 'Bạn không có quyền duyệt bước này'
      });
    }

    // 3️⃣ Approve bước hiện tại
    await currentApproval.update({
      decision: 'APPROVED',
      approved_at: new Date()
    });

    // 4️⃣ Tìm bước kế tiếp (decision = NULL)
    const nextApproval = await AccessRequestApproval.findOne({
      where: {
        request_id: requestId,
        decision: null
      },
      order: [['id', 'ASC']]
    });

    if (nextApproval) {
      // 👉 chuyển bước kế tiếp sang PENDING
      await nextApproval.update({
        decision: 'PENDING'
      });

      // 🔔 notify approver kế tiếp
      await Notification.create({
        user_id: nextApproval.approver_id,
        title: 'Yêu cầu cần duyệt',
        content: 'Bạn có một yêu cầu ra/vào cổng cần duyệt',
        type: 'REQUEST_APPROVED',
        reference_id: requestId
      });

    } else {
      // 5️⃣ Không còn bước nào → duyệt xong
      await AccessRequest.update(
        {
          status: 'APPROVED',
          approved_at: new Date()
        },
        { where: { id: requestId } }
      );

      // 🔔 notify người tạo đơn
      const request = await AccessRequest.findByPk(requestId);
      await Notification.create({
        user_id: request.user_id,
        title: 'Yêu cầu đã được duyệt hoàn tất',
        content: 'Yêu cầu ra/vào cổng của bạn đã được duyệt đầy đủ',
        type: 'REQUEST_APPROVED',
        reference_id: requestId
      });
    }

    return res.json({ message: 'Approved successfully' });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
};



export const rejectRequest = async (req, res) => {
  try {
    const requestId = req.params.id;
    const userId = req.user.id;
    const { reason } = req.body;

    if (!reason || reason.trim() === '') {
      return res.status(400).json({
        message: 'Vui lòng nhập lý do từ chối'
      });
    }

    // 1️⃣ Lấy approval đang PENDING
    const currentApproval = await AccessRequestApproval.findOne({
      where: {
        request_id: requestId,
        decision: 'PENDING'
      },
      order: [['id', 'ASC']]
    });

    if (!currentApproval) {
      return res.status(400).json({
        message: 'Không có bước duyệt đang chờ'
      });
    }

    // 2️⃣ Check đúng approver
    if (currentApproval.approver_id !== userId) {
      return res.status(403).json({
        message: 'Bạn không có quyền từ chối bước này'
      });
    }

    // 3️⃣ Reject bước hiện tại + lưu reason
    await currentApproval.update({
      decision: 'REJECTED',
      
      comment: reason // 👈 CẦN CỘT NÀY TRONG DB
    });

    // 4️⃣ Update request → REJECTED
    await AccessRequest.update(
      {
        status: 'REJECTED',
        approved_at: new Date(),
       // comment: reason // (nếu muốn lưu ở bảng cha)
      },
      { where: { id: requestId } }
    );

    // 5️⃣ Notify người tạo đơn
    const request = await AccessRequest.findByPk(requestId);

    await Notification.create({
      user_id: request.user_id,
      title: 'Yêu cầu bị từ chối',
      content: `Yêu cầu ra/vào cổng của bạn đã bị từ chối. Lý do: ${reason}`,
      type: 'REQUEST_REJECTED',
      reference_id: requestId
    });

    return res.json({ message: 'Rejected successfully' });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const getAllAccessHistory = async (req, res) => {
  try {
    const data = await AccessRequest.findAll({
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'MSNV', 'FullName'],
          include: [
            {
              model: Department,
              as: 'department',
              attributes: ['NameDept'],
              required: false
            }
          ],
          required: false
        },
        {
          model: AccessLog,
          as: 'logs',
          order: [['access_time', 'ASC']],
          required: false
        }
      ]
    });

    return res.json({
      success: true,
      data: data || []
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi lấy toàn bộ lịch sử ra/vào cổng',
      data: []
    });
  }
};
