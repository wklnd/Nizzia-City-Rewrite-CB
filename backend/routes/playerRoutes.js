const express = require('express');
const router = express.Router();
const { createPlayer, getPlayerByUser } = require('../controllers/playerController');

router.post('/create', createPlayer);
router.get('/by-user/:userId', getPlayerByUser);

module.exports = router;
