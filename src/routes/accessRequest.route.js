const express = require('express');
const router = express.Router();

const { createAccessRequest,getAccessRequestsByApprover ,approveRequest, rejectRequest, getAllAccessHistory} = require('../controllers/accessRequest.controller');
const authMiddleware = require('../middlewares/auth.middleware');

router.post(
  '/',
  authMiddleware,
  createAccessRequest
);

router.get(
  '/',
  authMiddleware,
  getAccessRequestsByApprover
);

router.post(
  '/:id/approve',
  authMiddleware,
  approveRequest
);

// từ chối
router.post(
  '/:id/reject',
  authMiddleware,
  rejectRequest
);

router.get('/history/all', authMiddleware, getAllAccessHistory);


module.exports = router;
