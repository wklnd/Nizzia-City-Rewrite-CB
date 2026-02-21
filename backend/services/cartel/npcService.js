// ═══════════════════════════════════════════════════════════════
//  NPC Service — Hire, fire, assign, level up, loyalty, payroll
// ═══════════════════════════════════════════════════════════════

const CartelNPC = require('../../models/CartelNPC');
const { resolveCartel, maxNPCs } = require('./cartelService');
const {
  NPC_ROLES,
  NPC_STATS,
  NPC_RARITIES,
  NPC_HIRE_COSTS,
  NPC_FIRST_NAMES,
  NPC_LAST_NAMES,
  NPC_XP_PER_LEVEL,
  NPC_MAX_LEVEL,
  NPC_LOYALTY_DECAY,
  NPC_LOYALTY_GAIN_MISSION,
  NPC_LOYALTY_MAX,
  NPC_BETRAY_THRESHOLD,
} = require('../../config/cartel');

// ── Helpers ──

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function rollRarity() {
  const pool = [];
  for (const r of Object.values(NPC_RARITIES)) {
    for (let i = 0; i < r.weight; i++) pool.push(r.id);
  }
  return pick(pool);
}

function generateNPC(role) {
  const rarity = rollRarity();
  const rar = NPC_RARITIES[rarity];
  const firstName = pick(NPC_FIRST_NAMES);
  const lastName = pick(NPC_LAST_NAMES);
  const roleInfo = NPC_ROLES[role];

  const stats = {};
  for (const stat of NPC_STATS) {
    let val = randInt(rar.statMin, rar.statMax);
    // Boost primary stat for this role
    if (roleInfo && stat === roleInfo.primaryStat) {
      val = Math.min(100, val + randInt(5, 15));
    }
    stats[stat] = val;
  }

  return {
    name: `${firstName} ${lastName}`,
    role,
    rarity,
    stats,
    level: 1,
    xp: 0,
    loyalty: 60 + randInt(0, 30), // 60-90 starting loyalty
  };
}

function xpForLevel(level) {
  return Math.floor(NPC_XP_PER_LEVEL * Math.pow(level, 1.5));
}

function hireCost(role, rarity) {
  const base = NPC_HIRE_COSTS[role] || 5000;
  const rar = NPC_RARITIES[rarity] || NPC_RARITIES.common;
  return Math.floor(base * rar.hireCostMult);
}

function npcSalary(npc) {
  const roleInfo = NPC_ROLES[npc.role];
  if (!roleInfo) return 500;
  return roleInfo.baseSalary + (npc.level - 1) * roleInfo.salaryPerLevel;
}

// ── Public API ──

async function listNPCs(userId, filters = {}) {
  const cartel = await resolveCartel(userId);
  const query = { cartelId: cartel._id };
  if (filters.role) query.role = filters.role;
  if (filters.status) query.status = filters.status;
  else query.status = { $ne: 'dead' }; // default: hide dead

  const npcs = await CartelNPC.find(query).sort({ level: -1 });
  return npcs.map(n => ({
    _id: n._id,
    name: n.name,
    role: n.role,
    rarity: n.rarity,
    stats: n.stats,
    level: n.level,
    xp: n.xp,
    xpNeeded: xpForLevel(n.level + 1),
    loyalty: n.loyalty,
    status: n.status,
    assignedTo: n.assignedTo,
    salary: npcSalary(n),
    salaryOwed: n.salaryOwed,
    recoversAt: n.recoversAt,
    arrestedAt: n.arrestedAt,
    hiredAt: n.hiredAt,
  }));
}

async function hireNPC(userId, role) {
  const cartel = await resolveCartel(userId);
  if (!NPC_ROLES[role]) throw Object.assign(new Error('Invalid role'), { status: 400 });

  const alive = await CartelNPC.countDocuments({ cartelId: cartel._id, status: { $ne: 'dead' } });
  const cap = maxNPCs(cartel.repLevel);
  if (alive >= cap) {
    throw Object.assign(new Error(`NPC cap reached (${alive}/${cap}). Increase rep to unlock more.`), { status: 400 });
  }

  const generated = generateNPC(role);
  const cost = hireCost(role, generated.rarity);

  if (cartel.treasury < cost) {
    throw Object.assign(new Error(`Need $${cost.toLocaleString()} in treasury to hire (rolled ${generated.rarity})`), { status: 400 });
  }

  cartel.treasury -= cost;
  await cartel.save();

  const npc = await CartelNPC.create({
    cartelId: cartel._id,
    ownerId: userId,
    ...generated,
  });

  return { npc, cost, treasury: cartel.treasury };
}

async function fireNPC(userId, npcId) {
  const cartel = await resolveCartel(userId);
  const npc = await CartelNPC.findOne({ _id: npcId, cartelId: cartel._id });
  if (!npc) throw Object.assign(new Error('NPC not found'), { status: 404 });
  if (npc.status === 'on_mission') throw Object.assign(new Error('Cannot fire NPC on active mission'), { status: 400 });

  await CartelNPC.deleteOne({ _id: npc._id });
  return { fired: npc.name };
}

async function assignNPC(userId, npcId, territoryId) {
  const cartel = await resolveCartel(userId);
  const npc = await CartelNPC.findOne({ _id: npcId, cartelId: cartel._id, status: 'idle' });
  if (!npc) throw Object.assign(new Error('NPC not found or not idle'), { status: 400 });

  npc.assignedTo = territoryId || null;
  await npc.save();
  return { npcId: npc._id, assignedTo: npc.assignedTo };
}

async function grantXP(npc, amount) {
  npc.xp += amount;
  let leveled = false;
  while (npc.level < NPC_MAX_LEVEL && npc.xp >= xpForLevel(npc.level + 1)) {
    npc.xp -= xpForLevel(npc.level + 1);
    npc.level += 1;
    // Stat boost on level up
    for (const stat of NPC_STATS) {
      npc.stats[stat] = Math.min(100, (npc.stats[stat] || 10) + randInt(1, 3));
    }
    leveled = true;
  }
  npc.markModified('stats');
  await npc.save();
  return leveled;
}

async function adjustLoyalty(npc, amount) {
  npc.loyalty = Math.max(0, Math.min(NPC_LOYALTY_MAX, npc.loyalty + amount));
  await npc.save();
}

// ── Payroll tick (called by cron — every hour) ──

async function processPayroll() {
  const npcs = await CartelNPC.find({ status: { $nin: ['dead'] } });
  const cartelTreasuries = {}; // cache

  for (const npc of npcs) {
    const key = npc.cartelId.toString();
    if (!cartelTreasuries[key]) {
      const c = await require('../../models/Cartel').findById(npc.cartelId);
      cartelTreasuries[key] = c;
    }
    const cartel = cartelTreasuries[key];
    if (!cartel) continue;

    const salary = npcSalary(npc);
    if (cartel.treasury >= salary) {
      cartel.treasury -= salary;
      npc.salaryOwed = Math.max(0, npc.salaryOwed - salary); // pay down owed
    } else {
      // Can't pay — accumulate debt, loyalty drops
      npc.salaryOwed += salary;
      npc.loyalty = Math.max(0, npc.loyalty - NPC_LOYALTY_DECAY);
    }

    // Recovery check
    if (npc.status === 'injured' && npc.recoversAt && new Date(npc.recoversAt) <= new Date()) {
      npc.status = 'idle';
      npc.recoversAt = null;
    }

    await npc.save();
  }

  // Save all cartel treasury changes
  for (const cartel of Object.values(cartelTreasuries)) {
    if (cartel) await cartel.save();
  }

  return { processed: npcs.length };
}

// ── Betrayal check (called by cron) ──

async function processBetrayals() {
  const disloyal = await CartelNPC.find({
    status: { $in: ['idle', 'on_mission'] },
    loyalty: { $lt: NPC_BETRAY_THRESHOLD },
  });

  let betrayals = 0;
  for (const npc of disloyal) {
    const chance = (NPC_BETRAY_THRESHOLD - npc.loyalty) / 100; // max 20%
    if (Math.random() < chance) {
      // Betrayal! NPC steals drugs or snitches
      const cartel = await require('../../models/Cartel').findById(npc.cartelId);
      if (!cartel) continue;

      if (Math.random() < 0.5) {
        // Steal treasury
        const stolen = Math.min(cartel.treasury, Math.floor(cartel.treasury * 0.1));
        cartel.treasury -= stolen;
        await cartel.save();
        // eslint-disable-next-line no-console
        console.log(`[cartel] BETRAYAL: ${npc.name} stole $${stolen} from ${cartel.name}`);
      } else {
        // Snitch — increase heat
        cartel.heat = Math.min(100, cartel.heat + 15);
        await cartel.save();
        // eslint-disable-next-line no-console
        console.log(`[cartel] BETRAYAL: ${npc.name} snitched on ${cartel.name} (+15 heat)`);
      }

      // NPC flees
      npc.status = 'dead'; // gone forever
      await npc.save();
      betrayals++;
    }
  }

  return { checked: disloyal.length, betrayals };
}

// ── Heal injured NPC ──

async function healNPC(userId, npcId) {
  const cartel = await resolveCartel(userId);
  const npc = await CartelNPC.findOne({ _id: npcId, cartelId: cartel._id, status: 'injured' });
  if (!npc) throw Object.assign(new Error('NPC not found or not injured'), { status: 400 });

  const cost = Math.floor(hireCost(npc.role, npc.rarity) * 0.5); // heal = 50% of hire cost
  if (cartel.treasury < cost) {
    throw Object.assign(new Error(`Treatment costs $${cost.toLocaleString()}`), { status: 400 });
  }

  cartel.treasury -= cost;
  npc.status = 'idle';
  npc.recoversAt = null;
  await Promise.all([cartel.save(), npc.save()]);

  return { npc: npc.name, cost, treasury: cartel.treasury };
}

// ── Bail out arrested NPC ──

async function bailOut(userId, npcId) {
  const cartel = await resolveCartel(userId);
  const npc = await CartelNPC.findOne({ _id: npcId, cartelId: cartel._id, status: 'arrested' });
  if (!npc) throw Object.assign(new Error('NPC not found or not arrested'), { status: 400 });

  const bailCost = hireCost(npc.role, npc.rarity); // bail = hire cost
  if (cartel.treasury < bailCost) {
    throw Object.assign(new Error(`Bail costs $${bailCost.toLocaleString()}`), { status: 400 });
  }

  cartel.treasury -= bailCost;
  npc.status = 'idle';
  npc.arrestedAt = null;
  npc.loyalty = Math.max(0, npc.loyalty - 10); // loyalty hit from being left in jail
  await Promise.all([cartel.save(), npc.save()]);

  return { npc: npc.name, cost: bailCost, treasury: cartel.treasury };
}

module.exports = {
  listNPCs,
  hireNPC,
  fireNPC,
  assignNPC,
  grantXP,
  adjustLoyalty,
  processPayroll,
  processBetrayals,
  healNPC,
  bailOut,
  generateNPC,
  npcSalary,
  hireCost,
};
