const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const CardPrivate = sequelize.define('CardPrivate', {
  id: {
    type: DataTypes.BIGINT.UNSIGNED,
    autoIncrement: true,
    primaryKey: true
  },

  card_code: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },

  qr_token: {
    type: DataTypes.STRING
  },

  user_id: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: false
  }

}, {
  tableName: 'card_private',
  timestamps: false
});

module.exports = CardPrivate;