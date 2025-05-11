const express = require('express');
const router = express.Router();
const { calculateStatGain, trainPlayer, addStats, removeStats } = require('../controllers/gymController');

// POST route to calculate stat gain
router.post('/calculate', calculateStatGain);

// POST route to train in the gym
router.post('/train', trainPlayer);

router.post('/add', addStats);

router.post('/remove', removeStats);


module.exports = router;