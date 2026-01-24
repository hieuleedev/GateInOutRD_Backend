const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Factory = sequelize.define('Factory', {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
  
    factory_code: {
      type: DataTypes.STRING,
      unique: true
    },
  
    factory_name: {
      type: DataTypes.STRING,
      allowNull: false
    },
  
    address: DataTypes.STRING,
  
    status: {
      type: DataTypes.ENUM('ACTIVE', 'INACTIVE'),
      defaultValue: 'ACTIVE'
    }
  
  }, {
    tableName: 'factories',
    timestamps: true
  });
  
  module.exports = Factory;
  
