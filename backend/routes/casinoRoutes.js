const express = require('express');
const router = express.Router();
const { spinWheel } = require('../controllers/casinoController');

router.post('/spin', spinWheel);

module.exports = router;