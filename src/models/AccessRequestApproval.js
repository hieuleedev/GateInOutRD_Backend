const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');

const AccessRequestApproval = sequelize.define('AccessRequestApproval', {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
  
    request_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false
    },
  
    approver_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false
    },
  
    decision: {
      type: DataTypes.ENUM('PENDING','APPROVED', 'REJECTED'),
      allowNull: true
    },
  
    comment: {
      type: DataTypes.TEXT
    },
  
    approved_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  
  }, {
    tableName: 'access_request_approvals',
    timestamps: false
  });
  
  module.exports = AccessRequestApproval;