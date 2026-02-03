const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// GET: /api/users/my-department
router.get(
  '/my-department',
  authMiddleware,
  userController.getStaffInMyDepartment
);
router.post("/save-fcm-token", authMiddleware, userController.saveFcmToken);
module.exports = router;
