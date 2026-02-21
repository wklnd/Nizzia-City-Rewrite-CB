const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/authUser');
const { getInventory, buyItem, useItemFromInventory } = require('../controllers/inventoryController');

router.get('/mine', requireAuth, getInventory);
router.post('/buy', requireAuth, buyItem);
router.post('/use', requireAuth, useItemFromInventory);

module.exports = router;
