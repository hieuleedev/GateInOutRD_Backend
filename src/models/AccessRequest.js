const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');

const AccessRequest = sequelize.define('AccessRequest', {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
  
    user_id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false
    },

    factory_id: {                 // 👈 thêm field này
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: true
      },

    approval_levels: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1
    },
    current_approval_level: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },

    mail_sent_count: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0
    },

    extra_approval_required: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    
    approved_at: {
        type: DataTypes.DATE,
        allowNull: true
    }, 
      
    card_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true
    },

    private_card_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true
    },
  
    planned_out_time: {
      type: DataTypes.DATE,
      allowNull: true
    },
  
    planned_in_time: {
      type: DataTypes.DATE,
      allowNull: true
    },

    request_type: {
      type: DataTypes.ENUM(
        'MISSION',
        'LATE_ENTRY',
        'TAC_NGHIEP',
        'BAN_GIAO_XE',
        'XUAT_VAT_TU',
        'THU_NGHIEM_XE',
        'DI_TRE',
        'VE_TRE',
        'VE_SOM'
      ),
      allowNull: true
    },
  
    reason: DataTypes.TEXT,
  
    status: {
      type: DataTypes.ENUM('PENDING', 'APPROVED', 'REJECTED'),
      defaultValue: 'PENDING'
    }
  
  }, {
    tableName: 'access_requests',
    timestamps: true
  });
  
  module.exports = AccessRequest;
  