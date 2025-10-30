const express = require('express');
const router = express.Router();
const { getInventory, buyItem, useItemFromInventory } = require('../controllers/inventoryController');

router.get('/:userId', getInventory);
router.post('/buy', buyItem);
router.post('/use', useItemFromInventory);

module.exports = router;
