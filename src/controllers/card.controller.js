import { Op } from 'sequelize';
import sequelize from '../config/database.js';
import { sendMail } from '../utils/mail.util.js';
import Card from '../models/Card.js';
import Factory from '../models/Factory.js';
import AccessRequest from '../models/AccessRequest.js';
import AccessRequestCompanion from '../models/AccessRequestCompanion.js';
import AccessLog from '../models/AccessLog.js';
import User from '../models/User.js';
import Department from '../models/Department.js';
import { formatVNTime } from '../utils/time.js';
import { pushToUser } from '../utils/push.util.js';
import dayjs from 'dayjs';


import {
  getGroupByUserId,
  getUserApprovePosition,
  getUserCheckManager,
} from '../utils/user.util.js';

export const getAccessCardInfo = async (req, res) => {
  try {
    console.log("user", req.user.id);
    const { card } = req.query;

    if (!card) {
      return res.status(400).json({
        message: 'card_code is required',
      });
    }

    const factory = await Factory.findOne({
      where: { manager_id: req.user.id },
    });

    // 1️⃣ Tìm card
    const cardData = await Card.findOne({
      where: { card_code: card },
    });

    if (!cardData) {
      return res.status(404).json({
        message: 'Card not found',
      });
    }

    // 2️⃣ Tìm AccessRequest hợp lệ
    const accessRequest = await AccessRequest.findOne({
      where: {
        card_id: cardData.id,
        status: {
          [Op.in]: ['APPROVED', 'PENDING', 'REJECTED'],
        },
        planned_out_time: {
          [Op.lte]: sequelize.literal('NOW() + INTERVAL 10 MINUTE'),
        },
        planned_in_time: {
          [Op.gte]: sequelize.literal('NOW() - INTERVAL 10 MINUTE'),
        },
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'MSNV', 'FullName', 'Avatar', 'Division'],
          include: [
            {
              model: Department,
              as: 'department',
              attributes: ['id', 'NameDept'],
            },
          ],
        },
        { model: Factory, as: 'factory' },
        {
          model: AccessRequestCompanion,
          as: 'companions',
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'FullName', 'Avatar'],
            },
          ],
        },
      ],
    });

    // ===============================
    // XỬ LÝ KHI KHÔNG TÌM THẤY REQUEST HỢP LỆ
    // ===============================
    if (!accessRequest) {
      const lastRequest = await AccessRequest.findOne({
        where: { card_id: cardData.id },
        order: [["createdAt", "DESC"]],
        include: [
          {
            model: User,
            as: "user",
            attributes: ["id", "MSNV", "FullName", "Division"],
            include: [
              {
                model: Department,
                as: "department",
                attributes: ["NameDept"],
              },
            ],
          },
          { model: Factory, as: "factory" },
          {
            model: AccessRequestCompanion,
            as: "companions",
            include: [
              {
                model: User,
                as: "user",
                attributes: ["id", "FullName", "Avatar"],
              },
            ],
          },
        ],
      });

      if (!lastRequest) {
        return res.json({
          card: cardData,
          allowed: false,
          message: "Không có yêu cầu ra/vào",
        });
      }

      // Check giới hạn gửi mail
      const MAX_MAIL_SENT = 2;
      const currentCount = lastRequest.mail_sent_count ?? 0;

      if (currentCount >= MAX_MAIL_SENT) {
        return res.json({
          card: cardData,
          allowed: false,
          note: `Sai thời gian đăng ký. Mail đã gửi ${currentCount} lần, không gửi nữa.`,
          access_request: lastRequest,
        });
      }

      // Lấy người duyệt
      const approval = await getUserApprovePosition(lastRequest.user_id);

      if (!approval?.MailAdress) {
        return res.json({
          card: cardData,
          allowed: false,
          note: "Sai thời gian đăng ký nhưng không tìm thấy email người duyệt.",
          access_request: lastRequest,
        });
      }

      const viewLink = `${process.env.WEB_URL}/access-requests/${lastRequest.id}`;

      // Update DB trước (atomic) - tránh spam khi quẹt nhiều lần
      const [affectedRows] = await AccessRequest.update(
        { mail_sent_count: currentCount + 1 },
        {
          where: {
            id: lastRequest.id,
            mail_sent_count: currentCount,
          },
        }
      );

      if (affectedRows === 0) {
        return res.json({
          card: cardData,
          allowed: false,
          note: "Mail đã được gửi trước đó. Không gửi nữa.",
          access_request: lastRequest,
        });
      }

      // Gửi mail
      await sendMail({
        to: approval.MailAdress,
        subject: "[ACCESS] Yêu cầu ra/vào cần duyệt lại",
        html: `
          <p>Chào anh, ${approval.FullName}</p>
    
          <p>
            Yêu cầu ra/vào sau đây đã <b>không hợp lệ</b> do thời gian quẹt thẻ
            <b>không nằm trong khung thời gian đăng ký</b>.
          </p>
    
          <ul>
            <li><b>Nhân viên:</b> ${lastRequest.user.FullName} (${lastRequest.user.MSNV})</li>
            <li><b>Bộ phận:</b> ${lastRequest.user.department?.NameDept || "-"}</li>
            <li><b>Đơn vị tác nghiệp:</b> ${lastRequest.factory?.factory_name || "-"}</li>
            <li><b>Lí do ra cổng:</b> ${lastRequest.reason || "-"}</li>
            <li><b>Thời gian đăng ký:</b>
              ${formatVNTime(lastRequest.planned_out_time)} → ${formatVNTime(lastRequest.planned_in_time)}
            </li>
          </ul>
    
          <p>Vui lòng truy cập hệ thống để <b>duyệt lại yêu cầu</b>.</p>
          <p>Hoặc truy cập trực tiếp: <br/>
            <a href="${viewLink}" target="_blank">${viewLink}</a>
          </p>
    
          <p style="font-size:13px;color:#6b7280;">
          Đây là hệ thống quản lý ra vào cổng tự động.<br/>
          Vui lòng không phản hồi lại Email này.
        </p>
        `,
      });

      return res.json({
        card: cardData,
        allowed: false,
        note: `Sai thời gian đăng ký. Đã gửi mail cho người duyệt (${currentCount + 1}/${MAX_MAIL_SENT}).`,
        access_request: {
          ...lastRequest.toJSON(),
          mail_sent_count: currentCount + 1,
        },
      });
    }

    // ===============================
    // XỬ LÝ KHI TÌM THẤY REQUEST HỢP LỆ
    // ===============================

    // Kiểm tra status trước khi xử lý log
    if (accessRequest.status === 'REJECTED' || accessRequest.status === 'PENDING') {
      // Tìm action từ logs hiện có (không tạo log mới)
      const logs = await AccessLog.findAll({
        where: { request_id: accessRequest.id },
        order: [['access_time', 'ASC']],
      });

      const action = logs.length === 0 ? 'OUT' : (logs.length % 2 === 0 ? 'OUT' : 'IN');

      return res.json({
        card: cardData,
        allowed: false,
        action,
        persisted: false,
        access_request: accessRequest,
        message: "Yêu cầu chưa được duyệt hoặc đã bị từ chối",
      });
    }

    // Chỉ xử lý khi status === 'APPROVED'
    const logs = await AccessLog.findAll({
      where: { request_id: accessRequest.id },
      order: [['access_time', 'ASC']],
    });

    // Xác định action dựa trên số lượng logs
    const MAX_LOGS = 4;

    const action = logs.length % 2 === 0 ? 'OUT' : 'IN';
    const shouldCreateLog = logs.length < MAX_LOGS;
    

    // Tạo log nếu cần
    if (shouldCreateLog) {
      await AccessLog.create({
        user_id: accessRequest.user_id,
        card_id: cardData.id,
        request_id: accessRequest.id,
        factory_id: factory.id,
        action,
        gate: 'MAIN_GATE',
        location: factory ? factory.factory_name : "",
        access_time: sequelize.fn('NOW'),
      });
      console.log("accessRequest",accessRequest.factory.manager_id)
      const time = dayjs().format("HH:mm");

      // Gửi notification
      await pushToUser(accessRequest.factory.manager_id, {
        title: "Đăng kí ra vào cổng",      
        body: `Nhân sự ${accessRequest?.user?.FullName} vừa ${action === 'OUT' ? 'ra' : 'vào'} cổng tại ${factory?.factory_name} lúc ${time}, vui lòng quét mã QR để biết thêm chi tiết`,
        data: {
          type: "REQUEST",
          requestId: accessRequest.id,
        },
      });
    }

    return res.json({
      card: cardData,
      allowed: true,
      action,
      persisted: shouldCreateLog,
      access_request: accessRequest,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};