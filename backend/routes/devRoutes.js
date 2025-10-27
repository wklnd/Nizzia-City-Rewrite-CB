const express = require('express');
const router = express.Router();
const { addMoney, addEnergy, addNerve } = require('../controllers/devController');

router.post('/add-money', addMoney);
router.post('/add-energy', addEnergy);
router.post('/add-nerve', addNerve);

module.exports = router;
