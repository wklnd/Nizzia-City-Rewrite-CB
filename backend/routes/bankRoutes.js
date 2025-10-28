const express = require('express');
const router = express.Router();
const { rates, listAccounts, deposit, withdraw } = require('../controllers/bankController');

router.get('/rates', rates);
router.get('/accounts/:userId', listAccounts);
router.post('/deposit', deposit);
router.post('/withdraw', withdraw);

module.exports = router;
