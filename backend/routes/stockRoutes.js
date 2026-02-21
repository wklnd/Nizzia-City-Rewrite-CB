const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/authUser');
const { list, quote, portfolio, buy, sell } = require('../controllers/stockController');

router.get('/', list);
router.get('/portfolio', requireAuth, portfolio);
router.get('/:symbol', quote);
router.post('/buy', requireAuth, buy);
router.post('/sell', requireAuth, sell);

module.exports = router;
