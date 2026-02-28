import {
  User,
  Card,
  AccessRequest,
  AccessRequestCompanion,
  AccessRequestApproval,
  Factory,
  Notification,
  AccessLog,
  Department,
  Position,
  CardPrivate
} from '../models/index.js';

import {
  getGroupByUserId,
  getUserLevel1,
  getUserApprovePosition,
  getUserCheckManager
} from '../utils/user.util.js';
import { sendMail } from '../utils/mail.util.js';
import sequelize from '../config/database.js';
import { Op, fn, col, literal } from 'sequelize';
import { pushToUser } from '../utils/push.util.js';



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
  //console.log("req",req)
  if (
    req.body.requestType === 'DI_TRE' ||
    req.body.requestType === 'VE_TRE' ||
    req.body.requestType === 'VE_SOM'
  ) {
    return await createAccessRequestLate(req, res);
  }

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

    const missingFields = [];

    if (!factory_id) missingFields.push("Thiếu đơn vị tác nghiệp");
    if (!checkInTime) missingFields.push("Thiếu Thời gian vào");
    if (!checkOutTime) missingFields.push("Thiếu Thời gian ra");
    if (!reason) missingFields.push("Thiếu lý do ra cổng");
    
    if (missingFields.length > 0) {
      await t.rollback();
    
      return res.status(400).json({
        message: `Thiếu thông tin bắt buộc: ${missingFields.join(", ")}`,
        missingFields,
      });
    }

    // 1️⃣ Lấy user + department
    const user = await User.findByPk(user_id, { transaction: t });
    if (!user?.IDDepartment) {
      await t.rollback();
      return res.status(400).json({ message: 'User chưa có phòng ban' });
    }

    // 2️⃣ Lấy card theo department
// 2️⃣ Lấy danh sách card theo department (phòng có nhiều thẻ)
      const cards = await Card.findAll({
        where: { department_id: user.IDDepartment },
        order: [["id", "ASC"]], // ưu tiên thẻ theo id nhỏ trước
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (!cards || cards.length === 0) {
        await t.rollback();
        return res.status(400).json({ message: "Phòng chưa được cấp thẻ" });
      }

    // Theem moi
      // Parse time
        const newStart = new Date(checkInTime);
        const newEnd = new Date(checkOutTime);
        const now = new Date();
        if (isNaN(newStart.getTime()) || isNaN(newEnd.getTime())) {
          await t.rollback();
          return res.status(400).json({ message: "Thời gian vào/ra không hợp lệ" });
        }
        
        if (newStart >= newEnd) {
          await t.rollback();
          return res.status(400).json({ message: "Giờ ra phải lớn hơn giờ vào" });
        }
        
        if (newEnd < now) {
          await t.rollback();
          return res.status(400).json({
            message: "Giờ ra không được nhỏ hơn thời gian hiện tại",
          });
        }

        // helper format thời gian VN
        const formatDateTimeVN = (date) => {
          const d = new Date(date);
          const pad = (n) => String(n).padStart(2, "0");
          return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(
            d.getHours()
          )}:${pad(d.getMinutes())}`;
        };

        // 3️⃣ Tìm card trống theo khung giờ: thẻ 1 -> thẻ 2 -> thẻ 3
        let selectedCard = null;

        // lưu danh sách các thẻ bị bận (để trả về nếu full)
        const busyCards = [];

        for (const c of cards) {
          const conflict = await AccessRequest.findOne({
            where: {
              card_id: c.id,
              status: { [Op.notIn]: ["REJECTED", "CANCELLED"] },
              [Op.and]: [
                { planned_out_time: { [Op.lt]: newEnd } }, // existing_start < new_end
                { planned_in_time: { [Op.gt]: newStart } }, // existing_end > new_start
              ],
            },
            include: [
              {
                model: User,
                as: "user",
                attributes: ["id", "FullName", "MSNV", "MailAdress"],
              },
            ],
            transaction: t,
            lock: t.LOCK.UPDATE,
          });

          // nếu không trùng -> chọn thẻ này
          if (!conflict) {
            selectedCard = c;
            break;
          }

          const registeredBy = conflict.user
            ? `${conflict.user.FullName} (${conflict.user.MSNV || conflict.user.MailAdress})`
            : "Không xác định";

          busyCards.push({
            card_id: c.id,
            card_code: c.card_code,
            request_id: conflict.id,
            registered_by: registeredBy,
            time_range: {
              from: formatDateTimeVN(conflict.planned_out_time),
              to: formatDateTimeVN(conflict.planned_in_time),
            },
          });
        }

        // Nếu full cả 3 thẻ
        if (!selectedCard) {
          await t.rollback();

          // build message chi tiết
          const requestedFrom = formatDateTimeVN(newStart);
          const requestedTo = formatDateTimeVN(newEnd);

          const details = busyCards
            .map(
              (x, idx) =>
                `Thẻ ${idx + 1} (${x.card_code}) đang được sử dụng bởi ${x.registered_by} | Đơn #${x.request_id} | ${x.time_range.from} -> ${x.time_range.to}`
            )
            .join(" ; ");

          return res.status(400).json({
            message:
              `Khung giờ đăng ký bị trùng (${requestedFrom} -> ${requestedTo}). ` +
              `Cả 3 thẻ của phòng đang được sử dụng. ` +
              `Chi tiết: ${details}. ` +
              `Vui lòng chọn khung giờ khác.`,
            busyCards,
          });
        }



    //
    if (!cards || cards.length === 0) {
      await t.rollback();
      return res.status(400).json({ message: "Phòng chưa được cấp thẻ" });
    }
    

    // 3️⃣ Xác định người duyệt
    const userLevel1 = await getUserLevel1(user_id);
    const manager = await getUserCheckManager(user_id);        // cấp 2
    const approver = await getUserApprovePosition(user_id);    // cấp 3

    // 4️⃣ Tạo AccessRequest
    const request = await AccessRequest.create({
      user_id,
      factory_id: Number(factory_id),
      card_id: selectedCard.id,
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
// 6️⃣ TẠO DANH SÁCH DUYỆT

const approverRows = [];
let level = 1;

// 👇 Nếu user nằm trong nhóm chỉ duyệt 1 cấp
const level1ApprovedIds = [1,2,3];

if (level1ApprovedIds.includes(user_id)) {

  // Chỉ tạo 1 cấp duyệt (user tự duyệt hoặc auto duyệt)
  approverRows.push({
    request_id: request.id,
    approver_id: user_id,
    approval_level: 1,
    decision: 'PENDING'   // hoặc 'APPROVED' nếu muốn auto duyệt luôn
  });

} else {

  // Luồng duyệt bình thường nhiều cấp

  // Cấp 1
  approverRows.push({
    request_id: request.id,
    approver_id: user_id,
    approval_level: level,
    decision: 'PENDING'
  });
  level++;

  // Cấp 2
  if (manager && manager.id !== user_id) {
    approverRows.push({
      request_id: request.id,
      approver_id: manager.id,
      approval_level: level,
      decision: null
    });
    level++;
  }

  // Cấp 3
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
  }
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

export const createAccessRequestLate = async (req, res) => {

  const t = await sequelize.transaction();

  try {
    const {
      checkInTime,
      checkOutTime,
      reason,
      requestType
    } = req.body;

    const user_id = req.user.id;

    // ===============================
    // 1️⃣ VALIDATE
    // ===============================

    if (!reason) {
      await t.rollback();
      return res.status(400).json({ message: "Thiếu lý do" });
    }

    if (!['DI_TRE', 'VE_TRE', 'VE_SOM'].includes(requestType)) {
      await t.rollback();
      return res.status(400).json({ message: "Loại đơn không hợp lệ" });
    }
    if (requestType === 'DI_TRE' && !checkOutTime) {
      await t.rollback();
      return res.status(400).json({ message: "Thiếu thời gian vào" });
    }

    if (requestType === 'VE_TRE' && !checkInTime) {
      await t.rollback();
      return res.status(400).json({ message: "Thiếu thời gian ra" });
    }

    if (requestType === 'VE_SOM' && !checkInTime) {
      await t.rollback();
      return res.status(400).json({ message: "Thiếu thời gian ra" });
    }

    // ===============================
    // 2️⃣ LẤY THẺ CÁ NHÂN
    // ===============================

    const privateCard = await CardPrivate.findOne({
      where: { user_id },
      transaction: t,
      lock: t.LOCK.UPDATE
    });

    if (!privateCard) {
      await t.rollback();
      return res.status(400).json({
        message: "Bạn chưa được cấp thẻ cá nhân"
      });
    }

    // ===============================
    // 3️⃣ SET THỜI GIAN ĐÚNG THEO LOẠI
    // ===============================

    const plannedOutTime =
    (requestType === 'VE_TRE' || requestType === 'VE_SOM')
      ? checkInTime
      : null;
  
  const plannedInTime =
    requestType === 'DI_TRE'
      ? checkOutTime
      : null;

    // ===============================
    // 4️⃣ CHECK TRÙNG
    // ===============================

    const conflict = await AccessRequest.findOne({
      where: {
        private_card_id: privateCard.id,
        status: { [Op.notIn]: ["REJECTED", "CANCELLED"] },

        ...(plannedOutTime && {
          planned_out_time: plannedOutTime
        }),

        ...(plannedInTime && {
          planned_in_time: plannedInTime
        })
      },
      transaction: t,
      lock: t.LOCK.UPDATE
    });

    if (conflict) {
      await t.rollback();
      return res.status(400).json({
        message: "Thẻ cá nhân đã được sử dụng trong khung giờ này"
      });
    }

    // ===============================
    // 5️⃣ TẠO REQUEST
    // ===============================

    const request = await AccessRequest.create({
      user_id,
      private_card_id: privateCard.id,
      request_type: requestType,
      planned_out_time: plannedOutTime,
      planned_in_time: plannedInTime,
      reason,
      status: 'PENDING',
      current_approval_level: 0
    }, { transaction: t });

    // ===============================
    // 6️⃣ TẠO CẤP DUYỆT
    // ===============================

    const approverRows = [];
    let level = 1;

    const manager = await getUserCheckManager(user_id);
    const approver = await getUserApprovePosition(user_id);

    const level1ApprovedIds = [1, 2, 3];

    if (level1ApprovedIds.includes(user_id)) {

      approverRows.push({
        request_id: request.id,
        approver_id: user_id,
        approval_level: 1,
        decision: 'PENDING'
      });

    } else {

      // Cấp 1: Người tạo
      approverRows.push({
        request_id: request.id,
        approver_id: user_id,
        approval_level: level,
        decision: 'PENDING'
      });
      level++;

      // Cấp 2: Manager
      if (manager && manager.id !== user_id) {
        approverRows.push({
          request_id: request.id,
          approver_id: manager.id,
          approval_level: level,
          decision: null
        });
        level++;
      }

      // Cấp 3: Approver theo chức vụ
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
      }
    }

    await AccessRequestApproval.bulkCreate(
      approverRows,
      { transaction: t }
    );

    await request.update({
      approval_levels: approverRows.length
    }, { transaction: t });

    // ===============================
    // 7️⃣ COMMIT
    // ===============================

    await t.commit();

    return res.status(201).json({
      message: "Đăng ký đi trễ/về trễ thành công",
      data: {
        request_id: request.id,
        request_type: requestType,
        approval_levels: approverRows.length
      }
    });

  } catch (error) {
    await t.rollback();
    console.error(error);
    return res.status(500).json({ message: "Lỗi server" });
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
              attributes: ['id', 'FullName','Division','MSNV'],
              include: [
                {
                  model: Department,
                  as: 'department',
                  attributes: ['id', 'NameDept']
                }
              ]
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
                  attributes: ['id', 'FullName'],
                 
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
            approver_id: approverId,
            decision: {[Op.in]:['PENDING','APPROVED','REJECTED']}
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
    const approveLink = `${process.env.WEB_URL}/requests`;
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
        title: 'Đăng kí ra vào cổng',
        content: 'Bạn có một yêu cầu ra/vào cổng cần duyệt',
        type: 'REQUEST_CREATED',
        reference_id: requestId
      });

      await pushToUser(nextApproval.approver_id, {
        title: "Yêu cầu cần duyệt",
        body: "Bạn có một yêu cầu ra/vào cổng cần duyệt",
        data: {
          type: "REQUEST_CREATED",
          requestId: requestId,
        },
      });

      const requestDetail = await AccessRequest.findByPk(requestId, {
        include: [
          {
            model: User,
            as: "user",
            attributes: ["id", "FullName", "MSNV", "MailAdress"],
            include: [
              { model: Department, as: "department", attributes: ["id", "NameDept"] },
              { model: Position, as: "position", attributes: ["id", "NamePosition"] },
            ],
          },
          {
            model: Factory,
            as: "factory",
            attributes: ["id", "factory_name"], // tuỳ tên field của Factory
          },
          {
            model: AccessRequestCompanion,
            as: "companions",
            include: [
              {
                model: User,
                as: "user",
                attributes: ["id", "FullName", "MSNV", "MailAdress"],
              },
            ],
          },
        ],
      });
      
      const companionsText =
      requestDetail?.companions?.length > 0
    ? requestDetail.companions
        .map((c, idx) => {
          const u = c.user;
          if (!u) return null;
          return `${idx + 1}. ${u.FullName} (${u.MSNV || u.MailAdress || "N/A"})`;
        })
        .filter(Boolean)
        .join("<br/>")
    : "Không có";


      // 📧 MAIL cho approver kế tiếp
      const nextUser = await User.findByPk(nextApproval.approver_id);
      if (nextUser?.MailAdress) {
        
        const formatVN = (date) => {
          const d = new Date(date);
          const pad = (n) => String(n).padStart(2, "0");
          return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(
            d.getHours()
          )}:${pad(d.getMinutes())}`;
        };
        await sendMail({
          to: nextUser.MailAdress,
          subject: "Yêu cầu xác nhận/phê duyệt ra vào cổng",
          html: `
            <p>Xin chào <b>${nextUser.FullName}</b>,</p>
            <p><b>Bạnn có yêu cầu ra vào cổng cần được xem xét/phê duyệt</b></p>
        
            <table style="width:100%;border-collapse:collapse;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;">
              <tbody>
                <tr>
                  <td style="padding:8px 10px;"><b>Tên nhân sự</b></td>
                  <td style="padding:8px 10px;">${requestDetail?.user?.FullName || ""}</td>
                  <td style="padding:8px 10px;"><b>MSNV</b></td>
                  <td style="padding:8px 10px;">${requestDetail?.user?.MSNV || ""}</td>
                </tr>
                <tr>
                  <td style="padding:8px 10px;"><b>Phòng ban</b></td>
                  <td style="padding:8px 10px;">${requestDetail?.user?.department?.NameDept || ""}</td>
                  <td style="padding:8px 10px;"><b>Chức vụ</b></td>
                  <td style="padding:8px 10px;">${requestDetail?.user?.position?.NamePosition || ""}</td>
                </tr>
                <tr>
                  <td style="padding:8px 10px;"><b>Đơn vị tác nghiệp</b></td>
                  <td style="padding:8px 10px;" colspan="3">${requestDetail?.factory?.factory_name || ""}</td>
                </tr>
                <tr>
                  <td style="padding:8px 10px;"><b>Mục đích</b></td>
                  <td style="padding:8px 10px;" colspan="3">${requestDetail?.reason || ""}</td>
                </tr>
                <tr>
                  <td style="padding:8px 10px;"><b>Thời gian ra</b></td>
                  <td style="padding:8px 10px;">${formatVN(requestDetail?.planned_out_time)}</td>
                  <td style="padding:8px 10px;"><b>Thời gian vào</b></td>
                  <td style="padding:8px 10px;">${formatVN(requestDetail?.planned_in_time)}</td>
                </tr>
                <tr>
                  <td style="padding:8px 10px;"><b>Nhân sự đi cùng</b></td>
                  <td style="padding:8px 10px;" colspan="3">${companionsText}</td>
                </tr>
              </tbody>
            </table>
        
            <p style="margin:16px 0;">
              👉 <a href="${approveLink}" target="_blank"
                style="display:inline-block;padding:10px 16px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;">
                Xem & phê duyệt yêu cầu
              </a>
            </p>
        
            <p style="margin:0;">Link: <a href="${approveLink}" target="_blank">${approveLink}</a></p>
        
            <hr style="margin:18px 0;border:none;border-top:1px solid #e5e7eb;" />
        
            <p style="font-size:13px;color:#6b7280;margin:0;">
              Đây là hệ thống quản lý ra vào cổng tự động.<br/>
              Vui lòng không phản hồi lại Email này.
            </p>
          `,
        });
        
      }

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

      await pushToUser(request.user_id, {
        title: "Đăng kí ra vào cổng",
        body: "Yêu cầu ra/vào cổng của bạn đã được duyệt hoàn tất",
        data: {
          type: "REQUEST_APPROVED",
          requestId: requestId,
        },
      });

      // 📧 MAIL cho người tạo đơn
      const requestUser = await User.findByPk(request.user_id);

      if (requestUser?.MailAdress) {
        const viewLink = `${process.env.WEB_URL}/access-requests/${requestId}`;
      
        await sendMail({
          to: requestUser.MailAdress,
          subject: 'Kết quả phê duyệt ra vào cổng',
          html: `
            <p>Xin chào <b>${requestUser.FullName}</b>,</p>
      
            <p>Đơn đăng ký của bạn đã đươc <b>duyệt hoàn tất</b>.</p>
      
            <p style="margin:16px 0;">
              👉 <a 
                href="${viewLink}" 
                target="_blank"
                style="
                  display:inline-block;
                  padding:10px 16px;
                  background:#ffffff;
                  color:#ffffff;
                  text-decoration:none;
                  border-radius:6px;
                  font-weight:600;
                "
              >
                Xem chi tiết yêu cầu
              </a>
            </p>
      
            <p>Hoặc truy cập trực tiếp: <br/>
              <a href="${viewLink}" target="_blank">${viewLink}</a>
            </p>
      
            <p style="font-size:13px;color:#6b7280;">
            Đây là hệ thống quản lý ra vào cổng tự động.<br/>
            Vui lòng không phản hồi lại Email này.
          </p>
          `
        });
      }
      
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
      comment: reason
    });

    // 4️⃣ Update request → REJECTED
    await AccessRequest.update(
      {
        status: 'REJECTED',
        approved_at: new Date()
      },
      { where: { id: requestId } }
    );

    // 5️⃣ Notify + MAIL người tạo đơn
    const request = await AccessRequest.findByPk(requestId);
    const requestUser = await User.findByPk(request.user_id);

    // 🔔 Notification
    await Notification.create({
      user_id: request.user_id,
      title: 'Yêu cầu bị từ chối',
      content: `Yêu cầu ra/vào cổng của bạn đã bị từ chối. Lý do: ${reason}`,
      type: 'REQUEST_REJECTED',
      reference_id: requestId
    });

    await pushToUser(request.user_id, {
      title: "Đăng kí ra vào cổng",
      body: `Yêu cầu ra/vào cổng của bạn đã được bị từ chối, Lý do: ${reason}`,
      
      data: {
        type: "REQUEST_APPROVED",
        requestId: requestId,
      },
    });

    // 📧 MAIL
    if (requestUser?.MailAdress) {
      const viewLink = `${process.env.WEB_URL}/access-requests/${requestId}`;

      await sendMail({
        to: requestUser.MailAdress,
        subject: 'Kết quả phê duyệt ra vào cổng',
        html: `
          <p>Xin chào <b>${requestUser.FullName}</b>,</p>

          <p>Đơn đăng ký của bạn đã bị <b style="color:#dc2626">từ chối</b>.</p>

          <p><b>Lý do:</b></p>
          <blockquote style="
            border-left:4px solid #dc2626;
            padding-left:12px;
            color:#374151;
            margin:8px 0;
          ">
            ${reason}
          </blockquote>

          <p style="margin:16px 0;">
            👉 <a 
              href="${viewLink}" 
              target="_blank"
              style="
                display:inline-block;
                padding:10px 16px;
                background:#dc2626;
                color:#ffffff;
                text-decoration:none;
                border-radius:6px;
                font-weight:600;
              "
            >
              Xem chi tiết yêu cầu
            </a>
          </p>

          <p>Hoặc truy cập trực tiếp: <br/>
            <a href="${viewLink}" target="_blank">${viewLink}</a>
          </p>

          <p style="font-size:13px;color:#6b7280;">
          Đây là hệ thống quản lý ra vào cổng tự động.<br/>
          Vui lòng không phản hồi lại Email này.
        </p>
        `
      });
    }

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
        },
        {
          model: AccessRequestCompanion,
          as: "companions",
          include: [
            {
              model: User,
              as: "user",
              attributes: ["id", "FullName", "MSNV", "MailAdress"],
            },
          ],
        },
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

export const extraApproveRequest = async (req, res) => {
  try {
    const requestId = Number(req.params.id);
    const approverId = req.user?.id; // lấy từ auth.middleware

    if (!requestId) {
      return res.status(400).json({ message: "requestId không hợp lệ" });
    }
    // Nếu chưa xong thì tăng level
    await AccessRequest.update(
      {
        extra_approval_required: 1, // duyệt bổ sung xong thì reset
      },
      { where: { id: requestId} }
    );

    return res.json({
      message: "Duyệt bổ sung thành công.",
    });
  } catch (err) {
    console.error("extraApproveRequest error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
