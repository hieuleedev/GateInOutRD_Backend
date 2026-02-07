const sequelize = require('../config/database');

// ===== LOAD MODELS =====
const User = require('./User');
const Card = require('./Card');
const Factory = require('./Factory');

const AccessRequest = require('./AccessRequest');
const AccessRequestApproval = require('./AccessRequestApproval');
const AccessRequestCompanion = require('./AccessRequestCompanion');

const AccessLog = require('./AccessLog');
const Department = require('./Department');
const Position = require('./Position');
const Notification = require('./Notification');
const FcmToken = require("./FcmToken");

// ===============================
// ===== KHAI BÁO QUAN HỆ ========
// ===============================

/* ===== AccessRequest ===== */

// Factory


/* ===== Optional (User – Department / Position) ===== */

// Department.hasMany(User, { foreignKey: 'IDDepartment', as: 'users' });
// Position.hasMany(User, { foreignKey: 'IDPosition', as: 'users' });


// ===============================
// ===== INIT DB =================
// ===============================

// RELATIOSHIP
// ===============================
// ===== DEFINE RELATIONSHIPS =====
// ===============================

/* ===== User ===== */
User.belongsTo(Department, {
  foreignKey: 'IDDepartment',
  as: 'department'
});

User.belongsTo(Position, {
  foreignKey: 'IDPosition',
  as: 'position'
});

User.hasMany(AccessRequest, {
  foreignKey: 'user_id',
  as: 'accessRequests'
});

User.hasMany(AccessLog, {
  foreignKey: 'user_id',
  as: 'accessLogs'
});

User.hasMany(AccessRequestApproval, {
  foreignKey: 'approver_id',
  as: 'approvals'
});

/* ===== AccessRequest ===== */
AccessRequest.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

AccessRequest.belongsTo(Factory, {
  foreignKey: 'factory_id',
  as: 'factory'
});

AccessRequest.belongsTo(Card, {
  foreignKey: 'card_id',
  as: 'card'
});

AccessRequest.hasMany(AccessRequestApproval, {
  foreignKey: 'request_id',
  as: 'approvals'
});

AccessRequest.hasMany(AccessRequestCompanion, {
  foreignKey: 'request_id',
  as: 'companions'
});

AccessRequest.hasMany(AccessLog, {
  foreignKey: 'request_id',
  as: 'logs'
});

/* ===== AccessRequestApproval ===== */
AccessRequestApproval.belongsTo(AccessRequest, {
  foreignKey: 'request_id',
  as: 'request'
});

AccessRequestApproval.belongsTo(User, {
  foreignKey: 'approver_id',
  as: 'approver'
});

/* ===== AccessRequestCompanion ===== */
AccessRequestCompanion.belongsTo(AccessRequest, {
  foreignKey: 'request_id',
  as: 'request'
});

AccessRequestCompanion.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

/* ===== AccessLog ===== */
AccessLog.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

AccessLog.belongsTo(Card, {
  foreignKey: 'card_id',
  as: 'card'
});

AccessLog.belongsTo(AccessRequest, {
  foreignKey: 'request_id',
  as: 'request'
});

/* ===== Department ↔ Card ===== */
Department.hasMany(Card, {
  foreignKey: 'department_id',
  as: 'cards'
});

Card.belongsTo(Department, {
  foreignKey: 'department_id',
  as: 'department'
});

User.hasMany(Notification, {
  foreignKey: 'user_id',
  as: 'notifications'
});

// Notification thuộc về 1 User
Notification.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

User.hasMany(FcmToken, {
  foreignKey: "user_id",
  as: "fcmTokens",
});

FcmToken.belongsTo(User, {
  foreignKey: "user_id",
  as: "user",
});

Factory.belongsTo(User, {
  foreignKey: "manager_id",
  as: "manager",
});

User.hasMany(Factory, {
  foreignKey: "manager_id",
  as: "managedFactories",
});

/* ===== AccessLog ===== */
AccessLog.belongsTo(Factory, {
  foreignKey: 'factory_id',
  as: 'factory'
});

/* ===== Factory ===== */
Factory.hasMany(AccessLog, {
  foreignKey: 'factory_id',
  as: 'accessLogs'
});



const initDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ MySQL connected');

    await sequelize.sync({ alter: false });
    console.log('✅ Database synced');
  } catch (err) {
    console.error('❌ DB error:', err);
  }
};

// ===============================
// ===== EXPORT ==================
// ===============================

module.exports = {
  sequelize,
  initDB,

  User,
  Card,
  Factory,
  AccessRequest,
  AccessRequestApproval,
  AccessRequestCompanion,
  AccessLog,
  Department,
  Position,
  Notification,
  FcmToken
};
