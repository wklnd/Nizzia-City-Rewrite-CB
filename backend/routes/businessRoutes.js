const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/authUser');
const biz = require('../controllers/businessController');

router.get('/catalog', biz.catalog);
router.get('/my',      requireAuth, biz.myBusinesses);
router.post('/buy',    requireAuth, biz.buy);
router.post('/sell',   requireAuth, biz.sell);
router.post('/upgrade', requireAuth, biz.upgrade);
router.post('/hire',   requireAuth, biz.hire);
router.post('/fire',   requireAuth, biz.fire);
router.post('/collect', requireAuth, biz.collect);
router.post('/collect-all', requireAuth, biz.collectAll);
router.post('/rename', requireAuth, biz.rename);

module.exports = router;
