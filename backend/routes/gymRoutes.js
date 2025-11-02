const express = require('express');
const router = express.Router();
const { calculateStatGain, trainPlayer, addStats, removeStats, getCatalog, unlockGym, selectGym } = require('../controllers/gymController');

// POST route to calculate stat gain
router.post('/calculate', calculateStatGain);

// POST route to train in the gym
router.post('/train', trainPlayer);

router.post('/add', addStats);

router.post('/remove', removeStats);

// New: gyms catalog and progression
router.get('/catalog', getCatalog);
router.post('/unlock', unlockGym);
router.post('/select', selectGym);


module.exports = router;