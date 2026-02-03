const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const FcmToken = sequelize.define(
  "FcmToken",
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },

    user_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
    },

    token: {
      type: DataTypes.STRING(500),
      allowNull: false,
      unique: true,
    },

    platform: {
      type: DataTypes.STRING(50), // web/android/ios
      allowNull: true,
    },

    device_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },

    is_active: {
      type: DataTypes.TINYINT(1),
      defaultValue: 1,
    },

    created_at: {
      type: DataTypes.DATE,
    },

    updated_at: {
      type: DataTypes.DATE,
    },
  },
  {
    tableName: "fcm_tokens",
    timestamps: false,
  }
);

module.exports = FcmToken;
