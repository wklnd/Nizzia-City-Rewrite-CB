const express = require('express');
const router = express.Router();
const { hallOfFame } = require('../controllers/hofController');

// GET /api/hof?limit=10
router.get('/', hallOfFame);

module.exports = router;
