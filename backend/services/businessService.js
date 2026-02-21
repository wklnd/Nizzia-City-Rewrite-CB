const Business = require('../models/Business');
const Player = require('../models/Player');
const {
  BUSINESSES,
  UPGRADE_TIERS,
  STAFF_SALARY,
  STAFF_INCOME_BOOST,
  MULTI_BIZ_RAID_PENALTY,
  RAID_INCOME_LOSS,
  RAID_SHUTDOWN_TICKS,
  MAX_PENDING_HOURS,
} = require('../config/business');

// ── Helpers ──

async function resolvePlayer(userId) {
  if (!userId) throw Object.assign(new Error('Missing userId'), { status: 400 });
  const player = await Player.findOne({ user: userId });
  if (!player) throw Object.assign(new Error('Player not found'), { status: 404 });
  return player;
}

function getBizConfig(businessId) {
  const cfg = BUSINESSES[businessId];
  if (!cfg) throw Object.assign(new Error('Unknown business type'), { status: 400 });
  return cfg;
}

function effectiveIncome(biz, cfg) {
  const tier = UPGRADE_TIERS[biz.level] || { income_mult: 1 };
  const staffBoost = 1 + (biz.staff * STAFF_INCOME_BOOST);
  return Math.floor(cfg.baseIncome * tier.income_mult * staffBoost);
}

function effectiveUpkeep(biz, cfg) {
  return cfg.upkeep + (biz.staff * STAFF_SALARY);
}

function effectiveRaidChance(biz, cfg, totalOwned) {
  const tier = UPGRADE_TIERS[biz.level] || { raid_reduction: 0 };
  const extraPenalty = Math.max(0, totalOwned - 1) * MULTI_BIZ_RAID_PENALTY;
  const chance = cfg.baseRaidChance + extraPenalty - tier.raid_reduction;
  return Math.max(0, Math.min(1, chance));
}

// ── Catalog ──

function getCatalog() {
  return Object.values(BUSINESSES).map(b => ({
    id: b.id,
    name: b.name,
    category: b.category,
    cost: b.cost,
    baseIncome: b.baseIncome,
    upkeep: b.upkeep,
    baseRaidChance: b.baseRaidChance,
    maxStaff: b.maxStaff,
    description: b.description,
  }));
}

// ── My Businesses ──

async function getMyBusinesses(userId) {
  const list = await Business.find({ ownerId: userId }).lean();
  return list.map(b => {
    const cfg = BUSINESSES[b.businessId] || {};
    const income = effectiveIncome(b, cfg);
    const upkeep = effectiveUpkeep(b, cfg);
    const raidChance = effectiveRaidChance(b, cfg, list.length);
    const isShutdown = b.shutdownUntil && new Date(b.shutdownUntil) > new Date();
    return {
      _id: b._id,
      businessId: b.businessId,
      name: b.name,
      category: cfg.category,
      level: b.level,
      staff: b.staff,
      maxStaff: cfg.maxStaff || 0,
      pendingIncome: b.pendingIncome,
      pendingTicks: b.pendingTicks,
      income,
      upkeep,
      netIncome: income - upkeep,
      raidChance: Math.round(raidChance * 100),
      isShutdown,
      shutdownUntil: b.shutdownUntil,
      acquiredAt: b.acquiredAt,
    };
  });
}

// ── Buy ──

async function buyBusiness(userId, businessId) {
  const player = await resolvePlayer(userId);
  const cfg = getBizConfig(businessId);

  if (player.money < cfg.cost) {
    throw Object.assign(new Error(`Not enough money. Need $${cfg.cost.toLocaleString()}`), { status: 400 });
  }

  player.$locals._txMeta = { type: 'business', description: `Purchased business: ${cfg.name}` };
  player.money -= cfg.cost;
  await player.save();

  const biz = await Business.create({
    ownerId: userId,
    businessId: cfg.id,
    name: cfg.name,
    level: 0,
    staff: 0,
    pendingIncome: 0,
    pendingTicks: 0,
  });

  return { business: biz, money: player.money };
}

// ── Sell ──

async function sellBusiness(userId, bizObjectId) {
  const biz = await Business.findOne({ _id: bizObjectId, ownerId: userId });
  if (!biz) throw Object.assign(new Error('Business not found'), { status: 404 });

  const cfg = BUSINESSES[biz.businessId] || {};
  // Sell for 50% of original cost + any pending income
  const sellPrice = Math.floor((cfg.cost || 0) * 0.5) + (biz.pendingIncome || 0);

  const player = await resolvePlayer(userId);
  player.$locals._txMeta = { type: 'business', description: `Sold business: ${cfg.name || biz.name}` };
  player.money += sellPrice;
  await player.save();
  await Business.deleteOne({ _id: bizObjectId });

  return { sellPrice, money: player.money };
}

// ── Upgrade ──

async function upgradeBusiness(userId, bizObjectId) {
  const biz = await Business.findOne({ _id: bizObjectId, ownerId: userId });
  if (!biz) throw Object.assign(new Error('Business not found'), { status: 404 });

  const nextLevel = biz.level + 1;
  const tier = UPGRADE_TIERS[nextLevel];
  if (!tier) throw Object.assign(new Error('Already at max upgrade level'), { status: 400 });

  const cfg = getBizConfig(biz.businessId);
  const cost = Math.floor(cfg.cost * tier.cost_mult);

  const player = await resolvePlayer(userId);
  if (player.money < cost) {
    throw Object.assign(new Error(`Not enough money. Upgrade costs $${cost.toLocaleString()}`), { status: 400 });
  }

  player.$locals._txMeta = { type: 'business', description: `Upgraded business to ${tier.name}` };
  player.money -= cost;
  await player.save();

  biz.level = nextLevel;
  await biz.save();

  return { level: nextLevel, tierName: tier.name, cost, money: player.money };
}

// ── Hire Staff ──

async function hireStaff(userId, bizObjectId, count = 1) {
  const biz = await Business.findOne({ _id: bizObjectId, ownerId: userId });
  if (!biz) throw Object.assign(new Error('Business not found'), { status: 404 });

  const cfg = getBizConfig(biz.businessId);
  const maxStaff = cfg.maxStaff || 0;
  if (biz.staff + count > maxStaff) {
    throw Object.assign(new Error(`Max staff is ${maxStaff}. Currently have ${biz.staff}`), { status: 400 });
  }

  // Hiring cost: 5000 per employee
  const hireCost = 5000 * count;
  const player = await resolvePlayer(userId);
  if (player.money < hireCost) {
    throw Object.assign(new Error(`Hiring costs $${hireCost.toLocaleString()}`), { status: 400 });
  }

  player.$locals._txMeta = { type: 'business', description: `Hired ${count} staff` };
  player.money -= hireCost;
  await player.save();

  biz.staff += count;
  await biz.save();

  return { staff: biz.staff, maxStaff, cost: hireCost, money: player.money };
}

// ── Fire Staff ──

async function fireStaff(userId, bizObjectId, count = 1) {
  const biz = await Business.findOne({ _id: bizObjectId, ownerId: userId });
  if (!biz) throw Object.assign(new Error('Business not found'), { status: 404 });

  if (biz.staff < count) {
    throw Object.assign(new Error(`Only ${biz.staff} staff to fire`), { status: 400 });
  }

  biz.staff -= count;
  await biz.save();

  return { staff: biz.staff };
}

// ── Collect Income ──

async function collectIncome(userId, bizObjectId) {
  const biz = await Business.findOne({ _id: bizObjectId, ownerId: userId });
  if (!biz) throw Object.assign(new Error('Business not found'), { status: 404 });

  if (biz.pendingIncome <= 0) {
    throw Object.assign(new Error('No income to collect'), { status: 400 });
  }

  const amount = biz.pendingIncome;
  const player = await resolvePlayer(userId);
  player.$locals._txMeta = { type: 'business', description: `Business income collected` };
  player.money += amount;
  await player.save();

  biz.pendingIncome = 0;
  biz.pendingTicks = 0;
  await biz.save();

  return { collected: amount, money: player.money };
}

// ── Collect All ──

async function collectAll(userId) {
  const list = await Business.find({ ownerId: userId });
  let total = 0;
  for (const biz of list) {
    if (biz.pendingIncome > 0) {
      total += biz.pendingIncome;
      biz.pendingIncome = 0;
      biz.pendingTicks = 0;
      await biz.save();
    }
  }
  if (total <= 0) throw Object.assign(new Error('No income to collect'), { status: 400 });

  const player = await resolvePlayer(userId);
  player.$locals._txMeta = { type: 'business', description: `Business income collected (all)` };
  player.money += total;
  await player.save();

  return { collected: total, money: player.money };
}

// ── Rename ──

async function renameBusiness(userId, bizObjectId, newName) {
  if (!newName || typeof newName !== 'string' || newName.trim().length < 2 || newName.trim().length > 30) {
    throw Object.assign(new Error('Name must be 2-30 characters'), { status: 400 });
  }
  const biz = await Business.findOne({ _id: bizObjectId, ownerId: userId });
  if (!biz) throw Object.assign(new Error('Business not found'), { status: 404 });

  biz.name = newName.trim();
  await biz.save();

  return { name: biz.name };
}

// ── Tick (called by cron) ──
// Processes one income tick for ALL businesses

async function processIncomeTick() {
  const all = await Business.find();
  const ownerBizCount = {};

  // Count businesses per owner for raid penalty calculation
  for (const biz of all) {
    const key = biz.ownerId.toString();
    ownerBizCount[key] = (ownerBizCount[key] || 0) + 1;
  }

  let processed = 0;
  let raided = 0;

  for (const biz of all) {
    const cfg = BUSINESSES[biz.businessId];
    if (!cfg) continue;

    // Skip if shutdown
    if (biz.shutdownUntil && new Date(biz.shutdownUntil) > new Date()) {
      continue;
    } else if (biz.shutdownUntil) {
      biz.shutdownUntil = null; // clear expired shutdown
    }

    // Cap pending ticks
    if (biz.pendingTicks >= MAX_PENDING_HOURS) {
      continue; // income capped, player needs to collect
    }

    const ownerKey = biz.ownerId.toString();
    const totalOwned = ownerBizCount[ownerKey] || 1;
    const raidChance = effectiveRaidChance(biz, cfg, totalOwned);

    // Roll for raid
    if (raidChance > 0 && Math.random() < raidChance) {
      // RAIDED!
      const lost = Math.floor(biz.pendingIncome * RAID_INCOME_LOSS);
      biz.pendingIncome = Math.max(0, biz.pendingIncome - lost);
      biz.shutdownUntil = new Date(Date.now() + RAID_SHUTDOWN_TICKS * 3600 * 1000);
      raided++;
    } else {
      // Normal income tick
      const income = effectiveIncome(biz, cfg);
      const upkeep = effectiveUpkeep(biz, cfg);
      const net = income - upkeep;
      biz.pendingIncome += Math.max(0, net);
      biz.pendingTicks += 1;
    }

    biz.lastTickAt = new Date();
    await biz.save();
    processed++;
  }

  console.log(`[bizCron] processed=${processed} raided=${raided}`);
  return { processed, raided };
}

module.exports = {
  getCatalog,
  getMyBusinesses,
  buyBusiness,
  sellBusiness,
  upgradeBusiness,
  hireStaff,
  fireStaff,
  collectIncome,
  collectAll,
  renameBusiness,
  processIncomeTick,
};
