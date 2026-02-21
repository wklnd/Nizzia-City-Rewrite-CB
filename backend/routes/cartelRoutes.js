const express = require('express');
const router = express.Router();
const c = require('../controllers/cartelController');
const { requireAuth } = require('../middleware/authUser');

// ── Core ──
router.post('/create',    requireAuth, c.create);
router.get('/overview',   requireAuth, c.overview);
router.post('/deposit',   requireAuth, c.deposit);
router.post('/withdraw',  requireAuth, c.withdraw);
router.post('/rename',    requireAuth, c.rename);

// ── NPCs ──
router.get('/npcs',       requireAuth, c.listNPCs);
router.post('/npcs/hire', requireAuth, c.hire);
router.post('/npcs/fire', requireAuth, c.fire);
router.post('/npcs/assign', requireAuth, c.assign);
router.post('/npcs/bail', requireAuth, c.bailOut);
router.post('/npcs/heal', requireAuth, c.healNPC);

// ── Production ──
router.get('/catalog',         c.drugCatalog);
router.get('/labs',            requireAuth, c.labStatus);
router.post('/labs/build',     requireAuth, c.buildLab);
router.post('/labs/upgrade',   requireAuth, c.upgradeLab);
router.post('/labs/destroy',   requireAuth, c.destroyLab);
router.post('/labs/cook',      requireAuth, c.startCook);
router.post('/labs/collect',   requireAuth, c.collectBatch);

// ── Territory ──
router.get('/map',                   c.worldMap);
router.post('/territory/claim',      requireAuth, c.claimTerritory);
router.post('/territory/sell-drugs', requireAuth, c.sellDrugs);
router.get('/territory/upgrades',    c.upgradeCatalog);
router.post('/territory/upgrade',    requireAuth, c.upgradeTerr);

// ── Missions ──
router.get('/missions',              requireAuth, c.activeMissions);
router.get('/missions/history',      requireAuth, c.missionHistory);
router.get('/leaderboard',           c.leaderboard);
router.post('/missions/delivery',    requireAuth, c.startDelivery);
router.post('/missions/attack',      requireAuth, c.startAttack);
router.post('/missions/seize',       requireAuth, c.startSeize);
router.post('/missions/assassination', requireAuth, c.startAssassination);
router.post('/missions/corruption',  requireAuth, c.startCorruption);
router.post('/missions/sabotage',    requireAuth, c.startSabotage);
router.post('/missions/smuggling',   requireAuth, c.startSmuggling);
router.post('/missions/intimidation', requireAuth, c.startIntimidation);

module.exports = router;
