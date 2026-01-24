const express = require('express');
const router = express.Router();
const factoryController = require('../controllers/factory.controller');

// GET all factories
router.get('/', factoryController.getAllFactories);

module.exports = router;
