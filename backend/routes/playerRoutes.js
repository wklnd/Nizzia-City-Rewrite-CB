const express = require('express');
const router = express.Router();
const { createPlayer, getPlayerByUser, getPublicProfile, getProfileHistory } = require('../controllers/playerController');

router.post('/create', createPlayer);
router.get('/by-user/:userId', getPlayerByUser);
router.get('/profile/:id', getPublicProfile);
router.get('/profile/:id/history', getProfileHistory);

module.exports = router;
