const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: 'mysql',
    logging: false,
    timezone: '+07:00',
    dialectOptions: {
      timezone: '+07:00',  // ✅ Thêm dòng này
      // Nếu dùng MySQL 8+, có thể cần:
      // dateStrings: true,
    }
  }
);

module.exports = sequelize;
