const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth.middleware');
const cardPrivateController = require('../controllers/CardPrivate.Controller');
const guardOnly = require('../middlewares/guardOnly')

router.get('/',authMiddleware,guardOnly, cardPrivateController.getAccessCardInfo);

module.exports = router;
