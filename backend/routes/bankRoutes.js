const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/authUser');
const { rates, listAccounts, deposit, withdraw } = require('../controllers/bankController');

router.get('/rates', rates);
router.get('/accounts', requireAuth, listAccounts);
router.post('/deposit', requireAuth, deposit);
router.post('/withdraw', requireAuth, withdraw);

module.exports = router;
