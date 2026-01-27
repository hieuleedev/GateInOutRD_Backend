const express = require('express');
const router = express.Router();
const cardController = require('../controllers/card.controller');

router.get('/', cardController.getAccessCardInfo);

module.exports = router;
