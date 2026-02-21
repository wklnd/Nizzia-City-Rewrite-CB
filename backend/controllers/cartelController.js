// ═══════════════════════════════════════════════════════════════
//  Cartel Controller — All endpoints for the Drug Empire system
// ═══════════════════════════════════════════════════════════════

const cartelService     = require('../services/cartel/cartelService');
const npcService        = require('../services/cartel/npcService');
const productionService = require('../services/cartel/productionService');
const territoryService  = require('../services/cartel/territoryService');
const missionService    = require('../services/cartel/missionService');

// ── Core ──

async function create(req, res) {
  try { res.json(await cartelService.createCartel(req.authUserId, req.body.name)); }
  catch (e) { return res.status(400).json({ error: e.message }); }
}

async function overview(req, res) {
  try { res.json(await cartelService.getOverview(req.authUserId)); }
  catch (e) { return res.status(400).json({ error: e.message }); }
}

async function deposit(req, res) {
  try { res.json(await cartelService.deposit(req.authUserId, req.body.amount)); }
  catch (e) { return res.status(400).json({ error: e.message }); }
}

async function withdraw(req, res) {
  try { res.json(await cartelService.withdraw(req.authUserId, req.body.amount)); }
  catch (e) { return res.status(400).json({ error: e.message }); }
}

async function rename(req, res) {
  try { res.json(await cartelService.renameCartel(req.authUserId, req.body.name)); }
  catch (e) { return res.status(400).json({ error: e.message }); }
}

// ── NPCs ──

async function listNPCs(req, res) {
  try { res.json({ npcs: await npcService.listNPCs(req.authUserId, req.query) }); }
  catch (e) { return res.status(400).json({ error: e.message }); }
}

async function hire(req, res) {
  try { res.json(await npcService.hireNPC(req.authUserId, req.body.role)); }
  catch (e) { return res.status(400).json({ error: e.message }); }
}

async function fire(req, res) {
  try { res.json(await npcService.fireNPC(req.authUserId, req.body.npcId)); }
  catch (e) { return res.status(400).json({ error: e.message }); }
}

async function assign(req, res) {
  try { res.json(await npcService.assignNPC(req.authUserId, req.body.npcId, req.body.territoryId)); }
  catch (e) { return res.status(400).json({ error: e.message }); }
}

async function bailOut(req, res) {
  try { res.json(await npcService.bailOut(req.authUserId, req.body.npcId)); }
  catch (e) { return res.status(400).json({ error: e.message }); }
}

async function healNPC(req, res) {
  try { res.json(await npcService.healNPC(req.authUserId, req.body.npcId)); }
  catch (e) { return res.status(400).json({ error: e.message }); }
}

// ── Production ──

async function drugCatalog(req, res) {
  try { res.json({ drugs: productionService.getDrugCatalog(), labs: productionService.getLabCatalog() }); }
  catch (e) { return res.status(400).json({ error: e.message }); }
}

async function buildLab(req, res) {
  try { res.json(await productionService.buildLab(req.authUserId, req.body.labType, req.body.territoryId)); }
  catch (e) { return res.status(400).json({ error: e.message }); }
}

async function upgradeLab(req, res) {
  try { res.json(await productionService.upgradeLab(req.authUserId, req.body.labIndex)); }
  catch (e) { return res.status(400).json({ error: e.message }); }
}

async function destroyLab(req, res) {
  try { res.json(await productionService.destroyLab(req.authUserId, req.body.labIndex)); }
  catch (e) { return res.status(400).json({ error: e.message }); }
}

async function startCook(req, res) {
  try { res.json(await productionService.startProduction(req.authUserId, req.body.labIndex, req.body.drugId)); }
  catch (e) { return res.status(400).json({ error: e.message }); }
}

async function collectBatch(req, res) {
  try { res.json(await productionService.collectBatch(req.authUserId, req.body.labIndex)); }
  catch (e) { return res.status(400).json({ error: e.message }); }
}

async function labStatus(req, res) {
  try {
    const cartel = await cartelService.resolveCartel(req.authUserId);
    res.json({ labs: productionService.labStatus(cartel) });
  } catch (e) { return res.status(400).json({ error: e.message }); }
}

// ── Territory ──

async function worldMap(req, res) {
  try { res.json({ regions: await territoryService.getWorldMap() }); }
  catch (e) { return res.status(400).json({ error: e.message }); }
}

async function claimTerritory(req, res) {
  try { res.json(await territoryService.claimTerritory(req.authUserId, req.body.territoryId)); }
  catch (e) { return res.status(400).json({ error: e.message }); }
}

async function sellDrugs(req, res) {
  try { res.json(await territoryService.sellDrugs(req.authUserId, req.body.territoryId, req.body.drugId, req.body.quantity)); }
  catch (e) { return res.status(400).json({ error: e.message }); }
}

async function upgradeTerr(req, res) {
  try { res.json(await territoryService.upgradeTerritory(req.authUserId, req.body.territoryId, req.body.upgradeId)); }
  catch (e) { return res.status(400).json({ error: e.message }); }
}

async function upgradeCatalog(req, res) {
  try { res.json({ upgrades: territoryService.getUpgradeCatalog() }); }
  catch (e) { return res.status(400).json({ error: e.message }); }
}

// ── Missions ──

async function activeMissions(req, res) {
  try { res.json({ missions: await missionService.getActiveMissions(req.authUserId) }); }
  catch (e) { return res.status(400).json({ error: e.message }); }
}

async function missionHistory(req, res) {
  try { res.json({ missions: await missionService.getMissionHistory(req.authUserId, Number(req.query.limit) || 20) }); }
  catch (e) { return res.status(400).json({ error: e.message }); }
}

async function leaderboard(req, res) {
  try { res.json({ leaderboard: await cartelService.getLeaderboard(Number(req.query.limit) || 20) }); }
  catch (e) { return res.status(400).json({ error: e.message }); }
}

async function startDelivery(req, res) {
  try {
    const { fromTerritory, toTerritory, drugId, quantity, npcIds } = req.body;
    res.json(await missionService.startDelivery(req.authUserId, fromTerritory, toTerritory, drugId, quantity, npcIds));
  } catch (e) { return res.status(400).json({ error: e.message }); }
}

async function startAttack(req, res) {
  try {
    res.json(await missionService.startAttack(req.authUserId, req.body.territoryId, req.body.npcIds));
  } catch (e) { return res.status(400).json({ error: e.message }); }
}

async function startSeize(req, res) {
  try {
    res.json(await missionService.startSeize(req.authUserId, req.body.territoryId, req.body.npcIds));
  } catch (e) { return res.status(400).json({ error: e.message }); }
}

async function startAssassination(req, res) {
  try {
    res.json(await missionService.startAssassination(req.authUserId, req.body.territoryId, req.body.npcIds));
  } catch (e) { return res.status(400).json({ error: e.message }); }
}

async function startCorruption(req, res) {
  try {
    res.json(await missionService.startCorruption(req.authUserId, req.body.territoryId, req.body.npcIds, req.body.bribeAmount));
  } catch (e) { return res.status(400).json({ error: e.message }); }
}

async function startSabotage(req, res) {
  try {
    res.json(await missionService.startSabotage(req.authUserId, req.body.territoryId, req.body.npcIds));
  } catch (e) { return res.status(400).json({ error: e.message }); }
}

async function startSmuggling(req, res) {
  try {
    const { fromTerritory, toTerritory, drugId, quantity, npcIds } = req.body;
    res.json(await missionService.startSmuggling(req.authUserId, fromTerritory, toTerritory, drugId, quantity, npcIds));
  } catch (e) { return res.status(400).json({ error: e.message }); }
}

async function startIntimidation(req, res) {
  try {
    res.json(await missionService.startIntimidation(req.authUserId, req.body.territoryId, req.body.npcIds));
  } catch (e) { return res.status(400).json({ error: e.message }); }
}

module.exports = {
  create, overview, deposit, withdraw, rename,
  listNPCs, hire, fire, assign, bailOut, healNPC,
  drugCatalog, buildLab, upgradeLab, destroyLab, startCook, collectBatch, labStatus,
  worldMap, claimTerritory, sellDrugs, upgradeTerr, upgradeCatalog,
  activeMissions, missionHistory, leaderboard, startDelivery, startAttack, startSeize,
  startAssassination, startCorruption, startSabotage, startSmuggling, startIntimidation,
};
