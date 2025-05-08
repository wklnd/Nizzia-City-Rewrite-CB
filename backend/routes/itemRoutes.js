const express = require('express');
const router = express.Router();
const { getAllItems, useItem, createItem, deleteItem } = require('../controllers/itemController');

// GET all items
router.get('/', getAllItems);

// POST to create item
router.post('/create', createItem);

// POST to use an item
router.post('/use', useItem);

// DELETE an item
router.delete('/:id', deleteItem);

module.exports = router;
