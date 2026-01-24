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

const initDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ MySQL connected');

    await sequelize.sync({ alter: true });
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
  Position
};
