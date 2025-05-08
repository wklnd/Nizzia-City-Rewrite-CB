const express = require('express');
const router = express.Router();
const { calculateStatGain, trainPlayer } = require('../controllers/gymController');

// POST route to calculate stat gain
router.post('/calculate', calculateStatGain);

// POST route to train in the gym
router.post('/train', trainPlayer);


module.exports = router;