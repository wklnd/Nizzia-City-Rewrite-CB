const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/authUser');
const {
  adjustCurrency,
  adjustExp,
  setLevel,
  adjustResources,
  setBattleStats,
  setWorkStats,
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
  setPlayerName,
  listPlayerTitles,
  setAddiction,
  // cooldowns
  getPlayerCooldowns,
  setPlayerCooldown,
  clearPlayerCooldown,
  resetAllCooldowns,
  // cartel
  setCartelRep,
  // database
  purgeDatabase,
} = require('../controllers/adminController');

// All admin routes require authentication
router.use(requireAuth);

// Player financials & progression
router.patch('/currency', adjustCurrency);
router.patch('/xp', adjustExp);
router.patch('/level', setLevel);
router.patch('/resources', adjustResources);
router.patch('/stats/battle', setBattleStats);
router.patch('/stats/work', setWorkStats);

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
router.patch('/player/name', setPlayerName);
router.patch('/player/addiction', setAddiction);
// Player cooldowns
router.get('/player/cooldowns/:userId', getPlayerCooldowns);
router.post('/player/cooldowns/set', setPlayerCooldown);
router.post('/player/cooldowns/clear', clearPlayerCooldown);
router.post('/cooldowns/reset-all', resetAllCooldowns);

// General bulk actions
router.post('/general/energy-max', setAllEnergyToMax);
router.post('/general/give-money', giveMoneyToAll);

// Cartel
router.patch('/cartel/rep', setCartelRep);

// Database maintenance (danger)
router.post('/database/purge', purgeDatabase);

module.exports = router;
