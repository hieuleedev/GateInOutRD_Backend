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
      unique: true // mã thẻ / mã QR
    },
    room: {
      type: DataTypes.STRING // phòng quản lý thẻ
    },
    qr_token: {
      type: DataTypes.STRING // token gắn vào QR
    }
  }, {
    tableName: 'cards',
    timestamps: false
  });
  module.exports = Card;
  