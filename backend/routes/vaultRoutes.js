const express = require('express');
const router = express.Router();
const { getVault, deposit, withdraw } = require('../controllers/vaultController');

router.get('/:userId', getVault);
router.post('/deposit', deposit);
router.post('/withdraw', withdraw);

module.exports = router;
