import { Op } from 'sequelize';
import sequelize from '../config/database.js';
import { sendMail } from '../utils/mail.util.js';
import Card from '../models/Card.js';
import AccessRequest from '../models/AccessRequest.js';
import AccessRequestCompanion from '../models/AccessRequestCompanion.js';
import AccessLog from '../models/AccessLog.js';
import User from '../models/User.js';
import Department from '../models/Department.js';
import { Factory } from '../models/index.js';

import {
  getGroupByUserId,
  getUserApprovePosition,
  getUserCheckManager,
} from '../utils/user.util.js';

export const getAccessCardInfo = async (req, res) => {
  try {
    const { card } = req.query;

    if (!card) {
      return res.status(400).json({
        message: 'card_code is required',
      });
    }

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
    
    if (!accessRequest) {
        const lastRequest = await AccessRequest.findOne({
          where: { card_id: cardData.id },
          order: [['createdAt', 'DESC']],
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'MSNV', 'FullName', 'Division'],
              include: [
                {
                  model: Department,
                  as: 'department',
                  attributes: ['NameDept'],
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
      
        if (!lastRequest) {
          return res.json({
            card: cardData,
            allowed: false,
            message: 'Không có yêu cầu ra/vào',
          });
        }
      
        // 🔹 Lấy người duyệt
        const approval = await getUserApprovePosition(lastRequest.user_id);
        // giả sử approval.email tồn tại
      
        // 🔹 Gửi mail (KHÔNG UPDATE DB)
        await sendMail({
          to: approval?.MailAdress,
          subject: '[ACCESS] Yêu cầu ra/vào cần duyệt lại',
          html: `
            <p>Chào anh,${approval?.FullName}</p>
      
            <p>Yêu cầu ra/vào sau đây đã bị <b>hết đăng ký</b> khi quẹt thẻ:</p>
      
            <ul>
              <li><b>Nhân viên:</b> ${lastRequest.user.FullName} (${lastRequest.user.MSNV})</li>
              <li><b>Bộ phận:</b> ${lastRequest.user.department?.NameDept || '-'}</li>
              <li><b>Nhà máy:</b> ${lastRequest.factory?.name || '-'}</li>
              <li><b>Thời gian đăng ký:</b>
                ${lastRequest.planned_out_time} → ${lastRequest.planned_in_time}
              </li>
            </ul>
      
            <p>Vui lòng truy cập hệ thống để <b>duyệt lại yêu cầu vào ngày mai</b>.</p>
      
            <p>— Access Control System</p>
          `,
        });
      
        return res.json({
          card: cardData,
          allowed: false,
          note: 'Sai thời gian đăng ký. Đã gửi mail cho người duyệt.',
          access_request: lastRequest,
        });
      }
      

    // 3️⃣ Access logs
    const logs = await AccessLog.findAll({
      where: { request_id: accessRequest.id },
      order: [['access_time', 'ASC']],
    });

    let action = 'OUT';
    let inserted = false;

    if (logs.length === 0) {
      action = 'OUT';
      inserted = true;
    } else if (logs.length === 1) {
      action = 'IN';
      inserted = true;
    } else {
      action = logs.length % 2 === 0 ? 'OUT' : 'IN';
    }

    if (inserted) {
      await AccessLog.create({
        user_id: accessRequest.user_id,
        card_id: cardData.id,
        request_id: accessRequest.id,
        action,
        gate: 'MAIN_GATE',
        location: 'FACTORY',
        access_time: sequelize.fn('NOW'),
      });
    }

    // ⚠️ FIX BUG: dùng === thay vì =
    if (accessRequest.status === 'REJECTED' || accessRequest.status === 'PENDING') {
      return res.json({
        card: cardData,
        allowed: false,
        action,
        persisted: inserted,
        access_request: accessRequest,
      });
    }

    return res.json({
      card: cardData,
      allowed: true,
      action,
      persisted: inserted,
      access_request: accessRequest,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};
