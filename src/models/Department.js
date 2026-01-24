const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Department = sequelize.define('Department', {
  id: {
    type: DataTypes.BIGINT.UNSIGNED.UNSIGNED,
    autoIncrement: true,
    primaryKey: true
  },
  NameDept: DataTypes.STRING,
  Group: DataTypes.STRING
}, {
  tableName: 'departments',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Department;
