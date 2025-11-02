const express = require('express');
const router = express.Router();
const { catalog, mine, buy, releasePet, rename } = require('../controllers/petController');

router.get('/catalog', catalog);
router.get('/my', mine);
router.post('/buy', buy);
router.post('/release', releasePet);
router.post('/rename', rename);

module.exports = router;
