const express = require('express');
const router = express.Router();
const { addMoney, getMoney, removeMoney, spendMoney } = require('../controllers/moneyController');

// 
router.get('/get', getMoney);

router.post('/add', addMoney);

router.post('/remove', removeMoney);

router.post('/spend', spendMoney);

module.exports = router;
