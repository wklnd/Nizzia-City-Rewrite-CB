const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/authUser');
const { catalog, mine, buy, releasePet, rename, getByPlayerId } = require('../controllers/petController');

router.get('/catalog', catalog);
router.get('/player/:id', getByPlayerId);
router.get('/my', requireAuth, mine);
router.post('/buy', requireAuth, buy);
router.post('/release', requireAuth, releasePet);
router.post('/rename', requireAuth, rename);

module.exports = router;
