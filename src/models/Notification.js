const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Notification = sequelize.define('Notification', {
  id: {
    type: DataTypes.BIGINT.UNSIGNED,
    autoIncrement: true,
    primaryKey: true
  },

  user_id: {                 // 👈 người nhận thông báo
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: false
  },

  title: {
    type: DataTypes.STRING,
    allowNull: false
  },

  content: {
    type: DataTypes.TEXT,
    allowNull: true
  },

  type: {
    type: DataTypes.ENUM(
      'REQUEST_CREATED',
      'REQUEST_APPROVED',
      'REQUEST_REJECTED',
      'ACCESS_LOG'
    ),
    allowNull: true
  },

  reference_id: {           // 👈 id liên quan (request_id, log_id…)
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: true
  },

  is_read: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },

  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }

}, {
  tableName: 'notifications',
  timestamps: false
});

module.exports = Notification;
