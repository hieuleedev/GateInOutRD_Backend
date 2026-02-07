const express = require('express');
const router = express.Router();

const {  getAccessLogsByFactory } = require('../controllers/accessLog.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// GET access logs by factory
router.get(
  '',
  authMiddleware,
  getAccessLogsByFactory
);

module.exports = router;
