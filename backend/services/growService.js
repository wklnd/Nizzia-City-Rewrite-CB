const { STRAINS, WAREHOUSES, GROW_STAGES, DIRT_COST, POT_COST } = require('../config/grow');
const Warehouse = require('../models/Warehouse');
const GrowPot = require('../models/GrowPot');
const WeedStash = require('../models/WeedStash');
const Player = require('../models/Player');

// ─── Helpers ───────────────────────────────────────────────────────────────

/** Resolve a Player document from userId (numeric id OR Mongo ObjectId string) */
async function resolvePlayer(userId) {
  if (!userId) return null;
  const n = Number(userId);
  let player = null;
  if (!Number.isNaN(n)) player = await Player.findOne({ id: n });
  if (!player) player = await Player.findOne({ user: userId });
  return player;
}

/** Calculate seconds each stage takes for a given strain */
function stageDuration(strain) {
  // 3 active stages (seedling, vegetative, flowering) split the total growTime
  return Math.floor(strain.growTime / 3);
}

/** Determine a pot's current real-time stage & progress */
function computePotState(pot, strainDef) {
  if (!pot.strainId || !pot.plantedAt) {
    return { stage: null, progress: 0, timeLeft: 0, done: false };
  }
  const dur = stageDuration(strainDef);
  const elapsed = Math.floor((Date.now() - new Date(pot.stageStartedAt).getTime()) / 1000);
  const stages = ['seedling', 'vegetative', 'flowering', 'ready'];
  let currentIndex = stages.indexOf(pot.stage);
  if (currentIndex < 0) currentIndex = 0;

  // Advance stages if enough time passed
  let remaining = elapsed;
  while (currentIndex < 3 && remaining >= dur) {
    remaining -= dur;
    currentIndex++;
  }

  const stage = stages[currentIndex];
  const done = currentIndex >= 3;
  const progress = done ? 100 : Math.min(100, Math.floor((remaining / dur) * 100));
  const timeLeft = done ? 0 : Math.max(0, dur - remaining);

  return { stage, progress, timeLeft, done };
}

// ─── Catalog / Info ────────────────────────────────────────────────────────

async function getStrainCatalog() {
  return Object.values(STRAINS).map(s => ({
    id: s.id,
    name: s.name,
    description: s.description,
    seedCost: s.seedCost,
    growTime: s.growTime,
    yield: s.yield,
    sellPrice: s.sellPrice,
    effect: s.effect,
  }));
}

function getWarehouseCatalog() {
  return Object.values(WAREHOUSES).map(w => ({
    id: w.id,
    name: w.name,
    description: w.description,
    cost: w.cost,
    maxPots: w.maxPots,
  }));
}

// ─── Warehouse Management ──────────────────────────────────────────────────

async function getWarehouse(userId) {
  const player = await resolvePlayer(userId);
  if (!player) throw new Error('Player not found');
  const wh = await Warehouse.findOne({ ownerId: player.user }).lean();
  return { warehouse: wh, player };
}

async function buyWarehouse(userId, warehouseId) {
  const player = await resolvePlayer(userId);
  if (!player) throw new Error('Player not found');

  const whDef = WAREHOUSES[warehouseId];
  if (!whDef) throw new Error('Invalid warehouse type');

  const existing = await Warehouse.findOne({ ownerId: player.user });

  if (existing) {
    // Upgrading — must be a higher-tier warehouse
    const currentDef = WAREHOUSES[existing.type];
    if (whDef.cost <= currentDef.cost) throw new Error('You can only upgrade to a higher-tier warehouse');
  }

  if (Number(player.money || 0) < whDef.cost) throw new Error('Not enough money');

  player.$locals._txMeta = { type: 'purchase', description: `Bought warehouse: ${warehouseId}` };
  player.money = Number(player.money || 0) - whDef.cost;
  await player.save();

  if (existing) {
    // Keep existing pots (up to new max), clear any that exceed
    const oldPots = existing.pots;
    existing.type = warehouseId;
    existing.pots = Math.min(oldPots, whDef.maxPots);
    existing.acquiredAt = new Date();
    await existing.save();
    // Remove any pots that exceed new capacity
    await GrowPot.deleteMany({ ownerId: player.user, potIndex: { $gte: whDef.maxPots } });
    return existing.toObject();
  }

  const wh = await Warehouse.create({ ownerId: player.user, type: warehouseId, pots: 0 });
  return wh.toObject();
}

// ─── Pot Management ────────────────────────────────────────────────────────

async function buyPot(userId) {
  const player = await resolvePlayer(userId);
  if (!player) throw new Error('Player not found');

  const wh = await Warehouse.findOne({ ownerId: player.user });
  if (!wh) throw new Error('You need a warehouse first');

  const whDef = WAREHOUSES[wh.type];
  if (wh.pots >= whDef.maxPots) throw new Error(`Warehouse is full (max ${whDef.maxPots} pots)`);

  if (Number(player.money || 0) < POT_COST) throw new Error('Not enough money');

  player.$locals._txMeta = { type: 'purchase', description: 'Bought grow pot' };
  player.money = Number(player.money || 0) - POT_COST;
  await player.save();

  const newIndex = wh.pots;
  wh.pots += 1;
  await wh.save();

  // Create the empty pot document
  await GrowPot.create({ ownerId: player.user, potIndex: newIndex });
  return { potIndex: newIndex, totalPots: wh.pots };
}

// ─── Planting ──────────────────────────────────────────────────────────────

async function plant(userId, potIndex, strainId) {
  const player = await resolvePlayer(userId);
  if (!player) throw new Error('Player not found');

  const strain = STRAINS[strainId];
  if (!strain) throw new Error('Invalid strain');

  const wh = await Warehouse.findOne({ ownerId: player.user });
  if (!wh) throw new Error('You need a warehouse first');
  if (potIndex < 0 || potIndex >= wh.pots) throw new Error('Invalid pot index');

  const pot = await GrowPot.findOne({ ownerId: player.user, potIndex });
  if (!pot) throw new Error('Pot not found');
  if (pot.strainId) throw new Error('This pot already has a plant growing');

  // Cost: seed + dirt
  const totalCost = strain.seedCost + DIRT_COST;
  if (Number(player.money || 0) < totalCost) throw new Error('Not enough money for seed + dirt');

  player.$locals._txMeta = { type: 'purchase', description: `Planted ${strainId}` };
  player.money = Number(player.money || 0) - totalCost;
  await player.save();

  pot.strainId = strainId;
  pot.stage = 'seedling';
  pot.plantedAt = new Date();
  pot.stageStartedAt = new Date();
  pot.harvestedAt = null;
  await pot.save();

  return pot.toObject();
}

// ─── Harvest ───────────────────────────────────────────────────────────────

async function harvest(userId, potIndex) {
  const player = await resolvePlayer(userId);
  if (!player) throw new Error('Player not found');

  const pot = await GrowPot.findOne({ ownerId: player.user, potIndex });
  if (!pot) throw new Error('Pot not found');
  if (!pot.strainId) throw new Error('Nothing planted in this pot');

  const strain = STRAINS[pot.strainId];
  if (!strain) throw new Error('Unknown strain');

  const state = computePotState(pot, strain);
  if (!state.done) throw new Error('Plant is not ready to harvest yet');

  // Calculate yield
  const yieldGrams = Math.floor(Math.random() * (strain.yield.max - strain.yield.min + 1)) + strain.yield.min;

  // Add to stash
  await WeedStash.findOneAndUpdate(
    { ownerId: player.user, strainId: pot.strainId },
    { $inc: { grams: yieldGrams } },
    { upsert: true, new: true }
  );

  // Clear the pot
  pot.strainId = null;
  pot.stage = null;
  pot.plantedAt = null;
  pot.stageStartedAt = null;
  pot.harvestedAt = new Date();
  await pot.save();

  return { strainId: strain.id, strainName: strain.name, grams: yieldGrams };
}

// ─── Stash (View, Sell, Use) ───────────────────────────────────────────────

async function getStash(userId) {
  const player = await resolvePlayer(userId);
  if (!player) throw new Error('Player not found');
  const stash = await WeedStash.find({ ownerId: player.user, grams: { $gt: 0 } }).lean();
  return stash.map(s => ({
    strainId: s.strainId,
    strainName: STRAINS[s.strainId]?.name || s.strainId,
    grams: s.grams,
    sellPricePerGram: STRAINS[s.strainId]?.sellPrice || 0,
    effect: STRAINS[s.strainId]?.effect || null,
  }));
}

async function sellWeed(userId, strainId, grams) {
  const player = await resolvePlayer(userId);
  if (!player) throw new Error('Player not found');

  const strain = STRAINS[strainId];
  if (!strain) throw new Error('Invalid strain');
  grams = Math.floor(Number(grams));
  if (!grams || grams < 1) throw new Error('Must sell at least 1 gram');

  const stash = await WeedStash.findOne({ ownerId: player.user, strainId });
  if (!stash || stash.grams < grams) throw new Error('Not enough weed in stash');

  const earnings = grams * strain.sellPrice;
  stash.grams -= grams;
  await stash.save();

  player.$locals._txMeta = { type: 'sale', description: `Sold ${grams}g of ${strainId}` };
  player.money = Number(player.money || 0) + earnings;
  await player.save();

  return { sold: grams, earnings, remaining: stash.grams };
}

async function useWeed(userId, strainId, grams) {
  const player = await resolvePlayer(userId);
  if (!player) throw new Error('Player not found');

  const strain = STRAINS[strainId];
  if (!strain) throw new Error('Invalid strain');
  grams = Math.floor(Number(grams));
  if (!grams || grams < 1) throw new Error('Must use at least 1 gram');

  const stash = await WeedStash.findOne({ ownerId: player.user, strainId });
  if (!stash || stash.grams < grams) throw new Error('Not enough weed in stash');

  stash.grams -= grams;
  await stash.save();

  // Apply effects (scaled by grams used)
  const fx = strain.effect;
  const applied = {};

  if (fx.happy && player.happiness) {
    const boost = fx.happy * grams;
    const maxH = player.happiness.happyMax || 99999;
    player.happiness.happy = Math.min(maxH, Number(player.happiness.happy || 0) + boost);
    applied.happy = boost;
  }
  if (fx.energy && player.energyStats) {
    const boost = fx.energy * grams;
    const maxE = player.energyStats.energyMax || 100;
    player.energyStats.energy = Math.min(maxE, Number(player.energyStats.energy || 0) + boost);
    applied.energy = boost;
  }
  if (fx.nerve && player.nerveStats) {
    const boost = fx.nerve * grams;
    const maxN = player.nerveStats.nerveMax || 20;
    player.nerveStats.nerve = Math.min(maxN, Number(player.nerveStats.nerve || 0) + boost);
    applied.nerve = boost;
  }
  if (fx.strength && player.battleStats) {
    const boost = fx.strength * grams;
    player.battleStats.strength = Number(player.battleStats.strength || 0) + boost;
    applied.strength = boost;
  }
  if (fx.defense && player.battleStats) {
    const boost = fx.defense * grams;
    player.battleStats.defense = Number(player.battleStats.defense || 0) + boost;
    applied.defense = boost;
  }

  // Increase addiction
  player.addiction = Math.min(100, Number(player.addiction || 0) + grams);
  applied.addiction = grams;

  await player.save();

  return { used: grams, strainName: strain.name, effects: applied, remaining: stash.grams };
}

// ─── Get all pots with real-time state ─────────────────────────────────────

async function getPots(userId) {
  const player = await resolvePlayer(userId);
  if (!player) throw new Error('Player not found');

  const pots = await GrowPot.find({ ownerId: player.user }).sort({ potIndex: 1 }).lean();
  return pots.map(pot => {
    const strain = pot.strainId ? STRAINS[pot.strainId] : null;
    const state = strain ? computePotState(pot, strain) : { stage: null, progress: 0, timeLeft: 0, done: false };
    return {
      potIndex: pot.potIndex,
      strainId: pot.strainId,
      strainName: strain?.name || null,
      ...state,
    };
  });
}

module.exports = {
  getStrainCatalog,
  getWarehouseCatalog,
  getWarehouse,
  buyWarehouse,
  buyPot,
  plant,
  harvest,
  getStash,
  sellWeed,
  useWeed,
  getPots,
};
