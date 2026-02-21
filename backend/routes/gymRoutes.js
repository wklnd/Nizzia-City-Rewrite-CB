const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/authUser');
const { calculateStatGain, trainPlayer, addStats, removeStats, getCatalog, unlockGym, selectGym } = require('../controllers/gymController');

// POST route to calculate stat gain
router.post('/calculate', requireAuth, calculateStatGain);

// POST route to train in the gym
router.post('/train', requireAuth, trainPlayer);

router.post('/add', requireAuth, addStats);

router.post('/remove', requireAuth, removeStats);

// New: gyms catalog and progression
router.get('/catalog', requireAuth, getCatalog);
router.post('/unlock', requireAuth, unlockGym);
router.post('/select', requireAuth, selectGym);


module.exports = router;