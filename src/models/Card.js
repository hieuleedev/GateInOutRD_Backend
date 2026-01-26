const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Card = sequelize.define('Card', {
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
    room: {
      type: DataTypes.STRING // phòng quản lý thẻ
    },
    qr_token: {
      type: DataTypes.STRING // token gắn vào QR
    },
    department_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      
    }
  
  }, {
    tableName: 'cards',
    timestamps: false
  });
  module.exports = Card;
  