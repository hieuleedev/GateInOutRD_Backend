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

    manager_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
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
  
