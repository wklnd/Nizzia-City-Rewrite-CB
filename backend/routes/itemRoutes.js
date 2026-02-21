const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/authUser');
const { getAllItems, useItem, createItem, deleteItem, downloadAllItems } = require('../controllers/itemController');

// GET all items
router.get('/', getAllItems);

// POST to create item
router.post('/create', createItem);

// POST to use an item
router.post('/use', requireAuth, useItem);

// DELETE an item
router.delete('/:id', deleteItem);

router.get('/download', async (req, res) => {
  try {
    const fs = require('fs');
    const filePath = 'all_items.json';
    await downloadAllItems();
    res.download(filePath, (err) => {
      if (err) {
        console.error('Error downloading the file:', err);
        return res.status(500).send('Error downloading the file');
      }
      try { fs.unlinkSync(filePath); } catch (_) {}
    });
  } catch (err) {
    console.error('Error generating item download:', err);
    res.status(500).send('Error generating item download');
  }
});

module.exports = router;
