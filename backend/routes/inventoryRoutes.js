const express = require('express');
const router = express.Router();
const { getInventory, buyItem } = require('../controllers/inventoryController');

router.get('/:userId', getInventory);
router.post('/buy', buyItem);

module.exports = router;
