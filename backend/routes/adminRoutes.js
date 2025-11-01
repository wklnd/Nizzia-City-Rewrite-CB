const express = require('express');
const router = express.Router();
const { attachAuth } = require('../middleware/authUser');
const {
  adjustCurrency,
  adjustExp,
  setLevel,
  adjustResources,
  inventoryAdd,
  inventoryRemove,
  stocksAdd,
  stocksRemove,
  bankForceWithdraw,
  searchPlayers,
  setAllEnergyToMax,
  giveMoneyToAll,
  stocksCrash,
  stocksRocket,
  // moderation
  setPlayerStatus,
  setPlayerTitle,
  setPlayerRole,
  listPlayerTitles,
  setAddiction,
  // cooldowns
  getPlayerCooldowns,
  setPlayerCooldown,
  clearPlayerCooldown,
  resetAllCooldowns,
  // database
  purgeDatabase,
} = require('../controllers/adminController');

// Attach auth info from Authorization header on all admin routes
router.use(attachAuth);

// Player financials & progression
router.patch('/currency', adjustCurrency);
router.patch('/xp', adjustExp);
router.patch('/level', setLevel);
router.patch('/resources', adjustResources);

// Inventory
router.post('/inventory/add', inventoryAdd);
router.post('/inventory/remove', inventoryRemove);

// Stocks
router.post('/stocks/add', stocksAdd);
router.post('/stocks/remove', stocksRemove);
router.post('/stocks/crash', stocksCrash);
router.post('/stocks/rocket', stocksRocket);
// Backfill moved to CLI tool (backend/tools/stocks/backfill.js)

// Bank
router.post('/bank/force-withdraw', bankForceWithdraw);

// Search
router.get('/players/search', searchPlayers);
// Player moderation
router.get('/player/titles', listPlayerTitles);
router.patch('/player/status', setPlayerStatus);
router.patch('/player/title', setPlayerTitle);
router.patch('/player/role', setPlayerRole);
router.patch('/player/addiction', setAddiction);
// Player cooldowns
router.get('/player/cooldowns/:userId', getPlayerCooldowns);
router.post('/player/cooldowns/set', setPlayerCooldown);
router.post('/player/cooldowns/clear', clearPlayerCooldown);
router.post('/cooldowns/reset-all', resetAllCooldowns);

// General bulk actions
router.post('/general/energy-max', setAllEnergyToMax);
router.post('/general/give-money', giveMoneyToAll);

// Database maintenance (danger)
router.post('/database/purge', purgeDatabase);

module.exports = router;
