// ═══════════════════════════════════════════════════════════════
//  Territory Service — Claim, view, sell drugs, market pricing
// ═══════════════════════════════════════════════════════════════

const Territory    = require('../../models/Territory');
const CartelNPC    = require('../../models/CartelNPC');
const { resolveCartel, addHeat } = require('./cartelService');
const {
  TERRITORIES,
  REGIONS,
  DRUGS,
  HEAT_PER_SALE,
  TERRITORY_UPGRADES,
} = require('../../config/cartel');

// ── Seed territories into DB if they don't exist ──

async function ensureTerritories() {
  for (const [key, cfg] of Object.entries(TERRITORIES)) {
    await Territory.updateOne(
      { territoryId: key },
      { $setOnInsert: { territoryId: key, region: cfg.region, controlledBy: null, controlPower: 0, demandMult: 1.0, heatMod: 0 } },
      { upsert: true }
    );
  }
}

// ── Get world map (all territories with control info) ──

async function getWorldMap() {
  await ensureTerritories();
  const docs = await Territory.find().populate('controlledBy', 'name');

  const regions = {};
  for (const doc of docs) {
    const cfg = TERRITORIES[doc.territoryId] || {};
    const regionId = cfg.region || doc.region;
    if (!regions[regionId]) {
      const regionCfg = REGIONS[regionId];
      regions[regionId] = {
        id: regionId,
        name: regionCfg?.name || regionId,
        territories: [],
      };
    }

    regions[regionId].territories.push({
      id: doc.territoryId,
      name: cfg.name || doc.territoryId,
      description: cfg.description || '',
      demand: cfg.demand || 1.0,
      demandMult: doc.demandMult,
      lawLevel: cfg.lawLevel || 0.5,
      baseHeat: cfg.baseHeat || 5,
      controlledBy: doc.controlledBy ? { _id: doc.controlledBy._id, name: doc.controlledBy.name } : null,
      controlPower: doc.controlPower,
      contested: !!doc.contestedBy,
      upgrades: Object.fromEntries(doc.upgrades || new Map()),
    });
  }

  return Object.values(regions);
}

// ── Claim unclaimed territory ──

async function claimTerritory(userId, territoryId) {
  const cartel = await resolveCartel(userId);
  const cfg = TERRITORIES[territoryId];
  if (!cfg) throw Object.assign(new Error('Unknown territory'), { status: 400 });

  await ensureTerritories();
  const terr = await Territory.findOne({ territoryId });

  if (terr.controlledBy) {
    throw Object.assign(new Error('Territory is already controlled. You must seize it.'), { status: 400 });
  }

  terr.controlledBy = cartel._id;
  terr.controlPower = 10; // base control power
  await terr.save();

  cartel.reputation += 60;
  await cartel.save();

  return { territory: territoryId, name: cfg.name };
}

// ── Sell drugs in a territory ──

async function sellDrugs(userId, territoryId, drugId, quantity) {
  const cartel = await resolveCartel(userId);
  if (cartel.bustedUntil && new Date(cartel.bustedUntil) > new Date()) {
    throw Object.assign(new Error('Operations frozen'), { status: 400 });
  }

  const cfg = TERRITORIES[territoryId];
  if (!cfg) throw Object.assign(new Error('Unknown territory'), { status: 400 });

  const drug = DRUGS[drugId];
  if (!drug) throw Object.assign(new Error('Unknown drug'), { status: 400 });

  quantity = Math.floor(Number(quantity) || 0);
  if (quantity <= 0) throw Object.assign(new Error('Invalid quantity'), { status: 400 });

  // Must control territory
  const terr = await Territory.findOne({ territoryId, controlledBy: cartel._id });
  if (!terr) throw Object.assign(new Error('You don\'t control this territory'), { status: 400 });

  // Check inventory
  const inv = cartel.inventory.find(i => i.drugId === drugId);
  if (!inv || inv.quantity < quantity) {
    throw Object.assign(new Error('Not enough product in stock'), { status: 400 });
  }

  // Count dealers assigned to this territory
  const dealers = await CartelNPC.countDocuments({
    cartelId: cartel._id,
    role: 'dealer',
    assignedTo: territoryId,
    status: 'idle',
  });

  if (dealers <= 0) {
    throw Object.assign(new Error('No dealers assigned to this territory'), { status: 400 });
  }

  // Price calculation:
  // basePrice * territory demand * demandMult * quality factor * dealer bonus
  const qualFactor = 0.5 + (inv.quality / 100); // 0.5 at Q0, 1.5 at Q100
  const dealerBonus = 1 + (dealers - 1) * 0.1;  // +10% per extra dealer
  const price = Math.floor(drug.basePrice * cfg.demand * terr.demandMult * qualFactor * dealerBonus);
  const revenue = price * quantity;

  // Execute sale
  inv.quantity -= quantity;
  if (inv.quantity <= 0) {
    cartel.inventory = cartel.inventory.filter(i => i.drugId !== drugId);
  }

  cartel.treasury += revenue;
  cartel.heat = Math.max(0, cartel.heat + HEAT_PER_SALE * Math.ceil(quantity / 10));
  cartel.reputation += Math.ceil(quantity / 3) * 3;

  cartel.markModified('inventory');
  await cartel.save();

  // Demand drops slightly after a sale (recovers over time)
  terr.demandMult = Math.max(0.5, terr.demandMult - quantity * 0.005);
  await terr.save();

  return {
    drug: drug.name,
    quantity,
    pricePerUnit: price,
    revenue,
    treasury: cartel.treasury,
    heat: cartel.heat,
  };
}

// ── Market tick (called by cron — demand recovery) ──

async function processMarketTick() {
  const territories = await Territory.find();
  for (const terr of territories) {
    // Demand recovery towards 1.0
    if (terr.demandMult < 1.0) {
      terr.demandMult = Math.min(1.0, terr.demandMult + 0.02);
    } else if (terr.demandMult > 1.0) {
      terr.demandMult = Math.max(1.0, terr.demandMult - 0.01);
    }

    // Heat decay on territory
    if (terr.heatMod > 0) {
      terr.heatMod = Math.max(0, terr.heatMod - 1);
    }

    terr.lastUpdatedAt = new Date();
    await terr.save();
  }
  return { territories: territories.length };
}

// ── Territory Upgrades ──

async function upgradeTerritory(userId, territoryId, upgradeId) {
  const cartel = await resolveCartel(userId);
  const cfg = TERRITORY_UPGRADES[upgradeId];
  if (!cfg) throw Object.assign(new Error('Invalid upgrade type'), { status: 400 });

  const terr = await Territory.findOne({ territoryId });
  if (!terr) throw Object.assign(new Error('Territory not found'), { status: 404 });
  if (!terr.controlledBy || terr.controlledBy.toString() !== cartel._id.toString()) {
    throw Object.assign(new Error('You don\'t control this territory'), { status: 400 });
  }

  const currentLevel = terr.upgrades?.get(upgradeId) || 0;
  if (currentLevel >= cfg.maxLevel) {
    throw Object.assign(new Error(`${cfg.name} is already max level (${cfg.maxLevel})`), { status: 400 });
  }

  const cost = Math.floor(cfg.baseCost * Math.pow(cfg.costMult, currentLevel));
  if (cartel.treasury < cost) {
    throw Object.assign(new Error(`Upgrade costs $${cost.toLocaleString()} (treasury: $${cartel.treasury.toLocaleString()})`), { status: 400 });
  }

  cartel.treasury -= cost;
  await cartel.save();

  terr.upgrades.set(upgradeId, currentLevel + 1);
  await terr.save();

  return {
    territory: terr.territoryId,
    upgrade: cfg.name,
    level: currentLevel + 1,
    maxLevel: cfg.maxLevel,
    cost,
    treasury: cartel.treasury,
  };
}

function getUpgradeCatalog() {
  return Object.values(TERRITORY_UPGRADES).map(u => ({
    id: u.id,
    name: u.name,
    emoji: u.emoji,
    description: u.description,
    maxLevel: u.maxLevel,
    baseCost: u.baseCost,
    costMult: u.costMult,
    effect: u.effect,
    effectPerLevel: u.effectPerLevel,
  }));
}

module.exports = {
  ensureTerritories,
  getWorldMap,
  claimTerritory,
  sellDrugs,
  processMarketTick,
  upgradeTerritory,
  getUpgradeCatalog,
};
