const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/authUser');
const { getVault, deposit, withdraw } = require('../controllers/vaultController');

router.get('/', requireAuth, getVault);
router.post('/deposit', requireAuth, deposit);
router.post('/withdraw', requireAuth, withdraw);

module.exports = router;
