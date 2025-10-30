const express = require('express');
const router = express.Router();
const { getCatalog, buyProperty, sellProperty, setActiveProperty, buyUpgrade, getHome, payUpkeep } = require('../controllers/realEstateController');

router.get('/catalog', getCatalog);
router.get('/home', getHome);
router.post('/buy', buyProperty);
router.post('/sell', sellProperty);
router.post('/set-active', setActiveProperty);
router.post('/upgrade', buyUpgrade);
router.post('/pay-upkeep', payUpkeep);

module.exports = router;
