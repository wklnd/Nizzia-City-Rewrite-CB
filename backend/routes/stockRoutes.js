const express = require('express');
const router = express.Router();
const { list, quote, portfolio, buy, sell } = require('../controllers/stockController');

router.get('/', list);
router.get('/:symbol', quote);
router.get('/portfolio/:userId', portfolio);
router.post('/buy', buy);
router.post('/sell', sell);

module.exports = router;
