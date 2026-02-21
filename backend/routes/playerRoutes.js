const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/authUser');
const { createPlayer, getPlayerByUser, getPublicProfile, getProfileHistory } = require('../controllers/playerController');

router.post('/create', requireAuth, createPlayer);
router.get('/me', requireAuth, getPlayerByUser);
router.get('/profile/:id', getPublicProfile);
router.get('/profile/:id/history', getProfileHistory);

module.exports = router;
