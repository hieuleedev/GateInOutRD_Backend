const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');

const AccessLog = sequelize.define('AccessLog', {
  id: {
    type: DataTypes.BIGINT.UNSIGNED,
    autoIncrement: true,
    primaryKey: true
  },

  user_id: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: false
  },
  

  card_id: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: false
  },

  request_id: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: true // có thể không đăng ký trước
  },

  action: {
    type: DataTypes.ENUM('IN', 'OUT'),
    allowNull: false
  },

  gate: DataTypes.STRING,

  location: DataTypes.STRING,

  access_time: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }

}, {
  tableName: 'access_logs',
  timestamps: false
});


module.exports = AccessLog;
