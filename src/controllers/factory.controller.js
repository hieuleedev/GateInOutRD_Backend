const Factory = require('../models/Factory');

/**
 * GET /api/factories
 * Lấy danh sách tất cả nhà máy
 */
exports.getAllFactories = async (req, res) => {
  try {
    const factories = await Factory.findAll({
      attributes: [
        'id',
        'factory_code',
        'factory_name',
        'address',
        'status',
        'createdAt',
        'updatedAt'
      ],
      order: [['id', 'ASC']]
    });

    return res.json({
      success: true,
      data: factories
    });
  } catch (error) {
    console.error('❌ getAllFactories error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách nhà máy'
    });
  }
};
