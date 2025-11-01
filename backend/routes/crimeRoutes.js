const express = require('express');
const router = express.Router();
const { searchForCash, getLocations } = require('../controllers/crimeController');

// Crimes
router.post('/search-for-cash', searchForCash);
router.get('/locations', getLocations);

module.exports = router;
