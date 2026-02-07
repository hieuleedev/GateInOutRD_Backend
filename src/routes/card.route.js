const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth.middleware');
const cardController = require('../controllers/card.controller');
const guardOnly = require('../middlewares/guardOnly')

router.get('/',authMiddleware,guardOnly, cardController.getAccessCardInfo);

module.exports = router;
