const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/authUser');
const { searchForCash, getLocations } = require('../controllers/crimeController');

router.post('/search-for-cash', requireAuth, searchForCash);
router.get('/locations', getLocations);

module.exports = router;
