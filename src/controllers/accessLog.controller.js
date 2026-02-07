const {
    AccessRequest,
    Factory,
    User,
    Card,
    AccessLog,
    AccessRequestCompanion
  } = require('../models');
  
 
  const getAccessLogsByFactory = async (req, res) => {
    try {
      // Lấy factory mà user đang quản lý
      const factory = await Factory.findOne({
        where: { manager_id: req.user.id }
      });
  
      if (!factory) {
        return res.status(404).json({
          success: false,
          message: 'User không quản lý nhà máy nào'
        });
      }
  
      const logs = await AccessLog.findAll({
        where: {
          factory_id: factory.id
        },
        include: [
          // ✅ Factory của AccessLog + manager
          {
            model: Factory,
            as: 'factory',
            attributes: ['id', 'factory_code', 'factory_name'],
            include: [
              {
                model: User,
                as: 'manager',
                attributes: ['id', 'FullName', 'MailAdress', 'PositionDetail']
              }
            ]
          },
  
          // ✅ User quẹt thẻ
          {
            model: User,
            as: 'user',
            attributes: ['id', 'FullName', 'MailAdress', 'PositionDetail']
          },
  
          // ✅ Card
          {
            model: Card,
            as: 'card',
            attributes: ['id', 'card_code']
          },
          
  
          // ✅ AccessRequest + Factory tác nghiệp
          {
            model: AccessRequest,
            as: 'request',
            include: [
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
                    attributes: ['id', 'FullName', 'MailAdress', 'PositionDetail']
                  }
                ]
              }
            ]
          }
        ],
        order: [['access_time', 'DESC']]
      });
  
      return res.status(200).json({
        success: true,
        total: logs.length,
        data: logs
      });
  
    } catch (error) {
      console.error('❌ Get access logs by factory error:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  };
  

  module.exports = {
    getAccessLogsByFactory
  };
  