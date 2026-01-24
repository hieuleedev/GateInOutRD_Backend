const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.BIGINT.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
  },

  MSNV: {
    type: DataTypes.STRING(255),
  },

  FullName: {
    type: DataTypes.STRING(255),
  },

  password: {
    type: DataTypes.STRING(255),
  },

  // ✅ FIX MAIL
  MailAdress: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'MailAdress', // map đúng tên cột trong DB
  },

  Division: {
    type: DataTypes.STRING(255),
  },

  PositionDetail: {
    type: DataTypes.TEXT,
  },

  IDPosition: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: true,
  },

  IDDepartment: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: true,
  },

  Avatar: {
    type: DataTypes.STRING(255),
  },

  Signature: {
    type: DataTypes.STRING(255),
  },

  Admin: {
    type: DataTypes.TINYINT(1),
    defaultValue: 0,
  },

  // ✅ timestamps đang có trong DB
  created_at: {
    type: DataTypes.DATE,
  },

  updated_at: {
    type: DataTypes.DATE,
  },

}, {
  tableName: 'users',
  timestamps: false,
});

module.exports = User;
