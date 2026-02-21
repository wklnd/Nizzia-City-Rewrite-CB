const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/authUser');
const { addMoney, addEnergy, addNerve } = require('../controllers/devController');

router.post('/add-money', requireAuth, addMoney);
router.post('/add-energy', requireAuth, addEnergy);
router.post('/add-nerve', requireAuth, addNerve);

module.exports = router;
