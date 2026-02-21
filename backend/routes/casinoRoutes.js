const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/authUser');
const { spinWheel, getWheels } = require('../controllers/casinoController');

router.get('/wheels', getWheels);
router.post('/spin', requireAuth, spinWheel);

module.exports = router;