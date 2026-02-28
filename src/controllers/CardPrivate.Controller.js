import { Op } from 'sequelize';
import sequelize from '../config/database.js';
import { sendMail } from '../utils/mail.util.js';
import Card from '../models/Card.js';
import CardPrivate from '../models/CardPrivate.js';
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
      const { card } = req.query;
  
      if (!card) {
        return res.status(400).json({ message: "card_code is required" });
      }
  
      // 1️⃣ Tìm card
      const cardData = await CardPrivate.findOne({
        where: { card_code: card },
      });
  
      if (!cardData) {
        return res.status(404).json({ message: "Card not found" });
      }
  
      // 2️⃣ Lấy request mới nhất của card
      const accessRequest = await AccessRequest.findOne({
        where: {
          private_card_id: cardData.id,
          request_type: {
            [Op.in]: ["DI_TRE", "VE_TRE", "VE_SOM"],
          },
          status: {
            [Op.in]: ["APPROVED", "PENDING", "REJECTED"],
          },
        },
        include: [
          {
            model: User,
            as: "user",
            include: [
              {
                model: Department,
                as: "department",
              },
            ],
          },
        ],
        order: [["createdAt", "DESC"]],
      });
  
      if (!accessRequest) {
        return res.json({
          card: cardData,
          allowed: false,
          message: "Không có đơn đi trễ / về sớm",
        });
      }
  
      // =====================================================
      // 🚨 CHECK STATUS TRƯỚC
      // =====================================================
  
      if (accessRequest.status === "PENDING") {
        console.log("PENDING")
        return res.json({
          card: cardData,
          allowed: false,
          message: "Đơn chưa được duyệt",
          access_request: accessRequest,
        });
      }
  
      if (accessRequest.status === "REJECTED") {
        console.log("REJECTED")
        return res.json({
          card: cardData,
          allowed: false,
          message: "Đơn đã bị từ chối",
          access_request: accessRequest,
        });
      }
  
      // =====================================================
      // ✅ CHỈ APPROVED MỚI CHO QUÉT
      // =====================================================
  
      // Kiểm tra đã quét chưa
      const existedLog = await AccessLog.findOne({
        where: { request_id: accessRequest.id },
      });
  
      if (existedLog) {
        return res.json({
          card: cardData,
          allowed: true,
          message: "Đơn này đã được quét trước đó",
          access_request: accessRequest,
        });
      }
  
      const action =
        accessRequest.request_type === "DI_TRE" ? "IN" : "OUT";
  
      const time = dayjs().format("HH:mm DD/MM/YYYY");
  
      // Tạo log
      await AccessLog.create({
        user_id: accessRequest.user_id,
        card_id: cardData.id,
        request_id: accessRequest.id,
        factory_id: null,
        action,
        gate: "MAIN_GATE",
        location: "",
        access_time: sequelize.fn("NOW"),
      });
  
      // Gửi mail
      const approval = await getUserApprovePosition(accessRequest.user_id);
  
      if (approval?.MailAdress) {
        await sendMail({
          to: approval.MailAdress,
          subject: "[ATTENDANCE] Thông báo quẹt thẻ",
          html: `
            <p>Chào ${approval.FullName},</p>
            <p>
              Nhân sự <b>${accessRequest.user.FullName}</b> 
              (${accessRequest.user.MSNV})
              đã quẹt thẻ lúc ${time}.
            </p>
          `,
        });
      }
  
      return res.json({
        card: cardData,
        allowed: true,
        action,
        persisted: true,
        access_request: accessRequest,
      });
  
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Server error" });
    }
  };