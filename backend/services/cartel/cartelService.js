// ═══════════════════════════════════════════════════════════════
//  Cartel Core Service — Create, fund, status, heat, reputation
// ═══════════════════════════════════════════════════════════════

const Cartel       = require('../../models/Cartel');
const Player       = require('../../models/Player');
const CartelNPC    = require('../../models/CartelNPC');
const Territory    = require('../../models/Territory');
const {
  CARTEL_CREATE_COST,
  CARTEL_MAX_NPCS_BASE,
  CARTEL_MAX_NPCS_PER_REP,
  CARTEL_MAX_LABS_BASE,
  CARTEL_MAX_LABS_PER_REP,
  REP_LEVELS,
  PASSIVE_REP_PER_LAB,
  PASSIVE_REP_PER_TERRITORY,
  PASSIVE_REP_PER_NPC,
  PASSIVE_REP_BASE,
  HEAT_DECAY_PER_HOUR,
  HEAT_BUST_THRESHOLD,
  HEAT_BUST_CHANCE_PER_POINT,
  BUST_PRODUCT_LOSS,
  BUST_MONEY_LOSS,
  BUST_NPC_ARREST_CHANCE,
  BUST_COOLDOWN_HOURS,
  TERRITORIES,
} = require('../../config/cartel');

// ── Helpers ──

async function resolvePlayer(userId) {
  if (!userId) throw Object.assign(new Error('Missing userId'), { status: 400 });
  const player = await Player.findOne({ user: userId });
  if (!player) throw Object.assign(new Error('Player not found'), { status: 404 });
  return player;
}

async function resolveCartel(userId) {
  const cartel = await Cartel.findOne({ ownerId: userId });
  if (!cartel) throw Object.assign(new Error('You don\'t have a cartel'), { status: 404 });
  return cartel;
}

function getRepLevel(rep) {
  let lvl = 0;
  for (const r of REP_LEVELS) {
    if (rep >= r.xpRequired) lvl = r.level;
  }
  return lvl;
}

function getRepInfo(rep) {
  const lvl = getRepLevel(rep);
  const current = REP_LEVELS[lvl] || REP_LEVELS[0];
  const next = REP_LEVELS[lvl + 1] || null;
  return { level: lvl, name: current.name, xp: rep, nextXp: next ? next.xpRequired : null, nextName: next ? next.name : null };
}

function maxNPCs(repLevel) {
  return CARTEL_MAX_NPCS_BASE + repLevel * CARTEL_MAX_NPCS_PER_REP;
}

function maxLabs(repLevel) {
  return CARTEL_MAX_LABS_BASE + repLevel * CARTEL_MAX_LABS_PER_REP;
}

// ── Create cartel ──

async function createCartel(userId, name) {
  const player = await resolvePlayer(userId);
  const existing = await Cartel.findOne({ ownerId: userId });
  if (existing) throw Object.assign(new Error('You already have a cartel'), { status: 400 });

  if (!name || name.trim().length < 2 || name.trim().length > 30) {
    throw Object.assign(new Error('Cartel name must be 2-30 characters'), { status: 400 });
  }
  if (Number(player.money || 0) < CARTEL_CREATE_COST) {
    throw Object.assign(new Error(`Need $${CARTEL_CREATE_COST.toLocaleString()} to establish a cartel`), { status: 400 });
  }

  player.$locals._txMeta = { type: 'cartel', description: 'Created a cartel' };
  player.money = Number(player.money) - CARTEL_CREATE_COST;
  await player.save();

  const cartel = await Cartel.create({
    ownerId: userId,
    name: name.trim(),
    treasury: 0,
    reputation: 0,
    repLevel: 0,
  });

  return { cartel, cost: CARTEL_CREATE_COST };
}

// ── Get cartel overview ──

async function getOverview(userId) {
  const cartel = await resolveCartel(userId);
  const npcCount = await CartelNPC.countDocuments({ cartelId: cartel._id, status: { $ne: 'dead' } });
  const territories = await Territory.find({ controlledBy: cartel._id });

  const repInfo = getRepInfo(cartel.reputation);
  const isBusted = cartel.bustedUntil && new Date(cartel.bustedUntil) > new Date();

  return {
    cartel: {
      _id: cartel._id,
      name: cartel.name,
      treasury: cartel.treasury,
      heat: cartel.heat,
      isBusted,
      bustedUntil: cartel.bustedUntil,
      inventory: cartel.inventory,
      labs: cartel.labs,
      repInfo,
      maxNPCs: maxNPCs(repInfo.level),
      maxLabs: maxLabs(repInfo.level),
      npcCount,
      territoryCount: territories.length,
      territories: territories.map(t => ({
        territoryId: t.territoryId,
        name: TERRITORIES[t.territoryId]?.name || t.territoryId,
        region: TERRITORIES[t.territoryId]?.regionName || t.region,
        controlPower: t.controlPower,
      })),
      createdAt: cartel.createdAt,
    },
  };
}

// ── Deposit / withdraw from treasury ──

async function deposit(userId, amount) {
  const player = await resolvePlayer(userId);
  const cartel = await resolveCartel(userId);
  amount = Math.floor(Number(amount) || 0);
  if (amount <= 0) throw Object.assign(new Error('Invalid amount'), { status: 400 });
  if (Number(player.money || 0) < amount) throw Object.assign(new Error('Not enough cash'), { status: 400 });

  player.$locals._txMeta = { type: 'cartel', description: 'Cartel treasury deposit' };
  player.money = Number(player.money) - amount;
  cartel.treasury += amount;
  await Promise.all([player.save(), cartel.save()]);

  return { treasury: cartel.treasury, playerMoney: player.money };
}

async function withdraw(userId, amount) {
  const player = await resolvePlayer(userId);
  const cartel = await resolveCartel(userId);
  amount = Math.floor(Number(amount) || 0);
  if (amount <= 0) throw Object.assign(new Error('Invalid amount'), { status: 400 });
  if (cartel.treasury < amount) throw Object.assign(new Error('Not enough in treasury'), { status: 400 });

  cartel.treasury -= amount;
  player.$locals._txMeta = { type: 'cartel', description: 'Cartel treasury withdrawal' };
  player.money = Number(player.money) + amount;
  await Promise.all([player.save(), cartel.save()]);

  return { treasury: cartel.treasury, playerMoney: player.money };
}

// ── Rename cartel ──

async function renameCartel(userId, newName) {
  const cartel = await resolveCartel(userId);
  if (!newName || newName.trim().length < 2 || newName.trim().length > 30) {
    throw Object.assign(new Error('Name must be 2-30 characters'), { status: 400 });
  }
  cartel.name = newName.trim();
  await cartel.save();
  return { name: cartel.name };
}

// ── Add reputation ──

async function addReputation(cartel, amount) {
  cartel.reputation += amount;
  const newLevel = getRepLevel(cartel.reputation);
  if (newLevel !== cartel.repLevel) {
    cartel.repLevel = newLevel;
  }
  await cartel.save();
}

// ── Add heat ──

async function addHeat(cartel, amount) {
  cartel.heat = Math.max(0, cartel.heat + amount);
  await cartel.save();
}

// ── Heat tick (called by cron) ──

async function processHeatTick() {
  const cartels = await Cartel.find();
  let busted = 0;

  for (const cartel of cartels) {
    // Skip if already busted
    if (cartel.bustedUntil && new Date(cartel.bustedUntil) > new Date()) {
      continue;
    } else if (cartel.bustedUntil) {
      cartel.bustedUntil = null; // clear expired bust
    }

    // Decay heat
    cartel.heat = Math.max(0, cartel.heat - HEAT_DECAY_PER_HOUR);

    // Passive rep: earn reputation every hour for running an empire
    const npcCount = await CartelNPC.countDocuments({ cartelId: cartel._id, status: { $ne: 'dead' } });
    const terrCount = await Territory.countDocuments({ controlledBy: cartel._id });
    const labCount = cartel.labs?.length || 0;
    const passiveRep = PASSIVE_REP_BASE
      + labCount  * PASSIVE_REP_PER_LAB
      + terrCount * PASSIVE_REP_PER_TERRITORY
      + npcCount  * PASSIVE_REP_PER_NPC;
    cartel.reputation += passiveRep;
    const newLevel = getRepLevel(cartel.reputation);
    if (newLevel !== cartel.repLevel) cartel.repLevel = newLevel;

    // Check for bust
    if (cartel.heat > HEAT_BUST_THRESHOLD) {
      const overThreshold = cartel.heat - HEAT_BUST_THRESHOLD;
      const bustChance = overThreshold * HEAT_BUST_CHANCE_PER_POINT;
      if (Math.random() < bustChance) {
        // BUSTED!
        await executeBust(cartel);
        busted++;
      }
    }

    cartel.lastTickAt = new Date();
    await cartel.save();
  }

  return { processed: cartels.length, busted };
}

async function executeBust(cartel) {
  const log = [];

  // Lose product
  for (const inv of cartel.inventory) {
    const lost = Math.floor(inv.quantity * BUST_PRODUCT_LOSS);
    if (lost > 0) {
      inv.quantity -= lost;
      log.push(`Feds seized ${lost} units of ${inv.drugId}. Bagged, tagged, and on the evening news.`);
    }
  }

  // Lose treasury
  const moneyLost = Math.floor(cartel.treasury * BUST_MONEY_LOSS);
  if (moneyLost > 0) {
    cartel.treasury -= moneyLost;
    log.push(`Treasury raided — $${moneyLost.toLocaleString()} confiscated. Asset forfeiture is a beautiful thing… for them.`);
  }

  // NPCs may get arrested
  const npcs = await CartelNPC.find({ cartelId: cartel._id, status: { $in: ['idle', 'on_mission'] } });
  for (const npc of npcs) {
    if (Math.random() < BUST_NPC_ARREST_CHANCE) {
      npc.status = 'arrested';
      npc.arrestedAt = new Date();
      await npc.save();
      log.push(`${npc.name} (${npc.role}) got dragged out in cuffs. Perp walked in front of cameras.`);
    }
  }

  // Freeze operations
  cartel.bustedUntil = new Date(Date.now() + BUST_COOLDOWN_HOURS * 3600000);
  cartel.heat = Math.floor(cartel.heat * 0.5); // heat reduced after bust
  await cartel.save();

  // eslint-disable-next-line no-console
  console.log(`[cartel] BUST: ${cartel.name} — ${log.join(', ')}`);
  return log;
}

// ── Leaderboard ──

async function getLeaderboard(limit = 20) {
  const cartels = await Cartel.find().sort({ reputation: -1 }).limit(limit).lean();
  const results = [];
  for (const c of cartels) {
    const npcCount = await CartelNPC.countDocuments({ cartelId: c._id, status: { $ne: 'dead' } });
    const terrCount = await Territory.countDocuments({ controlledBy: c._id });
    const info = getRepInfo(c.reputation);
    results.push({
      _id: c._id,
      name: c.name,
      reputation: c.reputation,
      repLevel: c.repLevel,
      rankName: info.name,
      treasury: c.treasury,
      heat: c.heat,
      labs: c.labs?.length || 0,
      npcs: npcCount,
      territories: terrCount,
    });
  }
  return results;
}

module.exports = {
  resolvePlayer,
  resolveCartel,
  getRepLevel,
  getRepInfo,
  maxNPCs,
  maxLabs,
  createCartel,
  getOverview,
  deposit,
  withdraw,
  renameCartel,
  addReputation,
  addHeat,
  processHeatTick,
  getLeaderboard,
};
