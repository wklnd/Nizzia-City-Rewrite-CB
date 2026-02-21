const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/authUser');
const { getCatalog, buyProperty, sellProperty, setActiveProperty, buyUpgrade, getHome, payUpkeep } = require('../controllers/realEstateController');

router.get('/catalog', requireAuth, getCatalog);
router.get('/home', requireAuth, getHome);
router.post('/buy', requireAuth, buyProperty);
router.post('/sell', requireAuth, sellProperty);
router.post('/set-active', requireAuth, setActiveProperty);
router.post('/upgrade', requireAuth, buyUpgrade);
router.post('/pay-upkeep', requireAuth, payUpkeep);

module.exports = router;
