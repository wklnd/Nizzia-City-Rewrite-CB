const express = require('express');
const router = express.Router();
const { attachAuth } = require('../middleware/authUser');
const { wallet, transfer, history } = require('../controllers/moneyController');

router.get('/wallet',  attachAuth, wallet);
router.post('/transfer', attachAuth, transfer);
router.get('/history',  attachAuth, history);

module.exports = router;
