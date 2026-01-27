const { Op } = require('sequelize');
const sequelize = require('../config/database');

const Card = require('../models/Card');
const AccessRequest = require('../models/AccessRequest');
const AccessRequestCompanion = require('../models/AccessRequestCompanion');
const AccessLog = require('../models/AccessLog');
const User = require('../models/User');
const Department = require('../models/Department');

const { Factory } = require('../models');

exports.getAccessCardInfo = async (req, res) => {
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
          status: 'APPROVED',
          planned_out_time: { [Op.lte]: sequelize.fn('NOW') },
          planned_in_time: { [Op.gte]: sequelize.fn('NOW') },
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
        return res.json({
          card: cardData,
          allowed: false,
          message: 'No valid access request at this time',
        });
      }
  
      // 3️⃣ Lấy access logs
      const logs = await AccessLog.findAll({
        where: { request_id: accessRequest.id },
        order: [['access_time', 'ASC']],
      });
  
      let action = 'OUT';
      let inserted = false;
  
      // 🔢 LOGIC LẺ / CHẴN
      if (logs.length === 0) {
        action = 'OUT';
        inserted = true;
      } 
      else if (logs.length === 1) {
        action = 'IN';
        inserted = true;
      } 
      else {
        // >=2 log → không insert nữa, chỉ toggle
        action = logs.length % 2 === 0 ? 'OUT' : 'IN';
        inserted = false;
      }
  
      // 4️⃣ INSERT CHỈ KHI CHƯA ĐỦ 2 LOG
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
  
      // 5️⃣ RESPONSE – LUÔN CHO ĐI
      return res.json({
        card: cardData,
        allowed: true,
        action,
        persisted: inserted, // frontend biết có ghi DB hay không
        access_request: accessRequest,
      });
  
    } catch (error) {
      console.error(error);
      res.status(500).json({
        message: 'Server error',
      });
    }
  };
  