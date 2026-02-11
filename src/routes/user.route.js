const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const guardOnly = require('../middlewares/guardOnly')

// GET: /api/users/my-department
router.get(
  '/my-department',
  authMiddleware,
  userController.getStaffInMyDepartment
);
router.post("/save-fcm-token", authMiddleware, userController.saveFcmToken);
router.put(
  "/change-password",
  authMiddleware,
  userController.changePassword
);
module.exports = router;``
