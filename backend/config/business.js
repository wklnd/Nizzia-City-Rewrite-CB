// ═══════════════════════════════════════════════════
//  BUSINESS CONFIG — Types, Upgrades, Staff, Risk
// ═══════════════════════════════════════════════════

// Risk tiers: each owned business after the first adds +5% raid chance
// Base raid chance per type is defined below

const BUSINESSES = {
  // ── Legit Businesses ──
  laundromat: {
    id: 'laundromat',
    name: 'Laundromat',
    category: 'legit',
    cost: 100000,
    baseIncome: 500,          // $ per income tick (hourly)
    upkeep: 200,              // $ per income tick
    baseRaidChance: 0.00,     // 0% — completely legit
    maxStaff: 3,
    description: 'A humble coin-op laundromat. Clean money from dirty clothes.',
  },
  mechanic: {
    id: 'mechanic',
    name: 'Mechanic Shop',
    category: 'legit',
    cost: 250000,
    baseIncome: 1200,
    upkeep: 450,
    baseRaidChance: 0.00,
    maxStaff: 4,
    description: 'Fix cars, fix problems. Honest work with grease-stained hands.',
  },
  restaurant: {
    id: 'restaurant',
    name: 'Restaurant',
    category: 'legit',
    cost: 500000,
    baseIncome: 2500,
    upkeep: 1000,
    baseRaidChance: 0.00,
    maxStaff: 6,
    description: 'Fine dining or fast food — either way, people gotta eat.',
  },
  gym_biz: {
    id: 'gym_biz',
    name: 'Fitness Center',
    category: 'legit',
    cost: 750000,
    baseIncome: 3200,
    upkeep: 1200,
    baseRaidChance: 0.00,
    maxStaff: 5,
    description: 'Memberships, protein shakes, and questionable supplements.',
  },

  // ── Vice Businesses ──
  bar: {
    id: 'bar',
    name: 'Dive Bar',
    category: 'vice',
    cost: 400000,
    baseIncome: 2000,
    upkeep: 600,
    baseRaidChance: 0.05,     // 5%
    maxStaff: 4,
    description: 'Cheap booze, loud music, and people who mind their own business.',
  },
  nightclub: {
    id: 'nightclub',
    name: 'Nightclub',
    category: 'vice',
    cost: 1500000,
    baseIncome: 6000,
    upkeep: 2500,
    baseRaidChance: 0.08,     // 8%
    maxStaff: 8,
    description: 'VIP tables, bottle service, and the occasional incident.',
  },
  strip_club: {
    id: 'strip_club',
    name: 'Strip Club',
    category: 'vice',
    cost: 2000000,
    baseIncome: 8500,
    upkeep: 3000,
    baseRaidChance: 0.10,     // 10%
    maxStaff: 10,
    description: 'Entertainment for the distinguished criminal entrepreneur.',
  },
  dispensary: {
    id: 'dispensary',
    name: 'Dispensary',
    category: 'vice',
    cost: 3000000,
    baseIncome: 12000,
    upkeep: 4000,
    baseRaidChance: 0.12,     // 12%
    maxStaff: 6,
    description: 'Totally legal. Well, mostly. The paperwork is... around here somewhere.',
  },
  gun_shop: {
    id: 'gun_shop',
    name: 'Gun Shop',
    category: 'vice',
    cost: 5000000,
    baseIncome: 18000,
    upkeep: 6000,
    baseRaidChance: 0.15,     // 15%
    maxStaff: 5,
    description: 'Second amendment enthusiasts and no-questions-asked clientele.',
  },
  casino_biz: {
    id: 'casino_biz',
    name: 'Underground Casino',
    category: 'vice',
    cost: 10000000,
    baseIncome: 35000,
    upkeep: 12000,
    baseRaidChance: 0.20,     // 20%
    maxStaff: 12,
    description: 'High stakes, higher risk. The house always wins — unless they get raided.',
  },
};

// Tiered upgrades: each business can be upgraded 1-5
// Each level multiplies income by (1 + 0.20*level) and reduces raid chance by 2% per level
const UPGRADE_TIERS = {
  1: { name: 'Basic',      cost_mult: 0.25, income_mult: 1.20, raid_reduction: 0.02 },
  2: { name: 'Improved',   cost_mult: 0.50, income_mult: 1.40, raid_reduction: 0.04 },
  3: { name: 'Advanced',   cost_mult: 1.00, income_mult: 1.65, raid_reduction: 0.06 },
  4: { name: 'Premium',    cost_mult: 2.00, income_mult: 1.95, raid_reduction: 0.08 },
  5: { name: 'Elite',      cost_mult: 4.00, income_mult: 2.30, raid_reduction: 0.10 },
};

// Staff: each employee costs a flat salary per tick and boosts income by 8%
const STAFF_SALARY = 250;        // $ per staff member per income tick
const STAFF_INCOME_BOOST = 0.08; // +8% income per staff member

// Risk: each additional business owned adds this to every business's raid chance
const MULTI_BIZ_RAID_PENALTY = 0.05; // +5% per extra biz

// Raid penalty: lose this fraction of pending income on a raid
const RAID_INCOME_LOSS = 1.0;    // lose 100% of pending income
// Raid also has a chance to force a temporary shutdown (in ticks)
const RAID_SHUTDOWN_TICKS = 3;   // 3 hours of no income after raid

// Income tick interval (for reference — actual scheduling is in the cron)
const INCOME_INTERVAL_HOURS = 1;

// Max pending income before player must collect (anti-afk)
const MAX_PENDING_HOURS = 24;

module.exports = {
  BUSINESSES,
  UPGRADE_TIERS,
  STAFF_SALARY,
  STAFF_INCOME_BOOST,
  MULTI_BIZ_RAID_PENALTY,
  RAID_INCOME_LOSS,
  RAID_SHUTDOWN_TICKS,
  INCOME_INTERVAL_HOURS,
  MAX_PENDING_HOURS,
};
