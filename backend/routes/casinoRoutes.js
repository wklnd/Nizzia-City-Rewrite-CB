const express = require('express');
const router = express.Router();
const { spinWheel } = require('../controllers/casinoController');
const { getWheels } = require('../controllers/casinoController');

router.get('/wheels', getWheels);
router.post('/spin', spinWheel);

module.exports = router;