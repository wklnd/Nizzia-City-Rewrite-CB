const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/authUser');
const {
  strains,
  warehouses,
  myGrow,
  buyWarehouse,
  buyPot,
  plant,
  harvest,
  sell,
  use,
} = require('../controllers/growController');

// Catalogs
router.get('/strains', strains);
router.get('/warehouses', warehouses);

// Player's grow operation
router.get('/my', requireAuth, myGrow);

// Actions
router.post('/buy-warehouse', requireAuth, buyWarehouse);
router.post('/buy-pot', requireAuth, buyPot);
router.post('/plant', requireAuth, plant);
router.post('/harvest', requireAuth, harvest);
router.post('/sell', requireAuth, sell);
router.post('/use', requireAuth, use);

module.exports = router;
