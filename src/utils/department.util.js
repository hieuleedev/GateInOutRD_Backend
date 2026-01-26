const { Department } = require('../models');

/**
 * Lấy group của phòng ban theo departmentId
 * @param {number} departmentId
 * @returns {Promise<string|null>}
 */
const getGroupByDepartmentId = async (departmentId) => {
  if (!departmentId) return null;

  const department = await Department.findByPk(departmentId, {
    attributes: ['Group']
  });

  return department ? department.Group : null;
};

/**
 * Lấy full thông tin department (dùng chung)
 * @param {number} departmentId
 * @returns {Promise<Department|null>}
 */
const getDepartmentById = async (departmentId) => {
  if (!departmentId) return null;

  return Department.findByPk(departmentId);
};

module.exports = {
  getGroupByDepartmentId,
  getDepartmentById
};
