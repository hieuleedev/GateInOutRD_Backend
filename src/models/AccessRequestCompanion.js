const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');
const AccessRequestCompanion = sequelize.define('AccessRequestCompanion', {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
  
    request_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false
    },
  
    user_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false
    }
  
  }, {
    tableName: 'access_request_companions',
    timestamps: false
  });
  
  
  module.exports = AccessRequestCompanion;
  