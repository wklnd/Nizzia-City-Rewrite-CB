// ═══════════════════════════════════════════════════════════════
//  Job Configuration — City Jobs, Company Jobs, Education
// ═══════════════════════════════════════════════════════════════

const meta = {
  maxCompanyEmployees: 16,
  maxCompanyRating: 10,
  workCooldownMinutes: 60,       // how often a player can "work"
  dailyPointsPerTick: true,      // points given every work tick
  tickIntervalMs: 3600000,       // 1 hour in ms
  quitPenaltyHours: 24,          // can't rejoin a job for 24h after quitting
  promoteRefundPct: 0,           // no JP refund on promotion
};

// ── Helper: build ranks array from compact definitions ──
// Each rank: { name, pay, jobPoints, pointsForPromotion, requiredStats, statsGained }
function r(name, pay, jp, promo, req, gain) {
  return { name, pay, jobPoints: jp, pointsForPromotion: promo, requiredStats: req, statsGained: gain };
}

// ── CITY JOBS ─────────────────────────────────────────────────
// Permanent NPC-run jobs. 10 ranks each (0-9).

const CITY_JOBS = {
  army: {
    id: 'army',
    name: 'Army',
    description: 'Serve the nation. Brute force meets discipline. Heavy on manual labor and endurance.',
    icon: '🎖️',
    ranks: [
      r('Private',          125,  1,   5, { manuallabor: 2,     intelligence: 2,    endurance: 2 },    { manuallabor: 3,  intelligence: 1, endurance: 2 }),
      r('Corporal',         150,  2,  10, { manuallabor: 50,    intelligence: 15,   endurance: 20 },   { manuallabor: 5,  intelligence: 2, endurance: 3 }),
      r('Sergeant',         180,  3,  15, { manuallabor: 120,   intelligence: 35,   endurance: 50 },   { manuallabor: 8,  intelligence: 3, endurance: 5 }),
      r('Master Sergeant',  220,  4,  20, { manuallabor: 325,   intelligence: 60,   endurance: 115 },  { manuallabor: 12, intelligence: 4, endurance: 7 }),
      r('Warrant Officer',  225,  5,  25, { manuallabor: 700,   intelligence: 160,  endurance: 300 },  { manuallabor: 17, intelligence: 7, endurance: 10 }),
      r('Lieutenant',       325,  6,  30, { manuallabor: 1300,  intelligence: 360,  endurance: 595 },  { manuallabor: 20, intelligence: 9, endurance: 11 }),
      r('Major',            550,  7,  35, { manuallabor: 2550,  intelligence: 490,  endurance: 900 },  { manuallabor: 24, intelligence: 10, endurance: 13 }),
      r('Colonel',          755,  8,  40, { manuallabor: 4150,  intelligence: 600,  endurance: 1100 }, { manuallabor: 28, intelligence: 12, endurance: 15 }),
      r('Brigadier',       1000,  9,  45, { manuallabor: 7500,  intelligence: 1350, endurance: 2530 }, { manuallabor: 33, intelligence: 18, endurance: 15 }),
      r('General',         2500, 10, null, { manuallabor: 10000, intelligence: 2000, endurance: 4000 }, { manuallabor: 40, intelligence: 25, endurance: 20 }),
    ],
    abilities: [
      { name: 'Boot Camp',        description: '+10 Strength per use',                   unlockRank: 0, cost: 25,  effect: { type: 'stat_boost', stat: 'strength', value: 10 } },
      { name: 'Combat Drills',    description: '+20 Strength per use',                   unlockRank: 2, cost: 50,  effect: { type: 'stat_boost', stat: 'strength', value: 20 } },
      { name: 'Weapons Cache',    description: 'Obtain a random weapon',                 unlockRank: 4, cost: 75,  effect: { type: 'grant_item', itemTag: 'weapon' } },
      { name: 'Intel Report',     description: 'View another player\'s battle stats',    unlockRank: 7, cost: 100, effect: { type: 'spy' } },
      { name: 'General\'s Order', description: '+50 Strength and +25 Defense per use',   unlockRank: 9, cost: 200, effect: { type: 'stat_boost', stat: 'strength', value: 50, stat2: 'defense', value2: 25 } },
    ],
  },

  medical: {
    id: 'medical',
    name: 'Medical',
    description: 'Save lives—or learn how bodies break. Intelligence-heavy with endurance demands.',
    icon: '🏥',
    ranks: [
      r('Intern',              100,  1,   5, { manuallabor: 1,    intelligence: 5,    endurance: 2 },    { manuallabor: 1,  intelligence: 4,  endurance: 2 }),
      r('Nurse',               130,  2,  10, { manuallabor: 10,   intelligence: 60,   endurance: 25 },   { manuallabor: 2,  intelligence: 6,  endurance: 3 }),
      r('Paramedic',           170,  3,  15, { manuallabor: 25,   intelligence: 150,  endurance: 60 },   { manuallabor: 3,  intelligence: 9,  endurance: 4 }),
      r('Resident',            215,  4,  20, { manuallabor: 50,   intelligence: 350,  endurance: 120 },  { manuallabor: 4,  intelligence: 12, endurance: 6 }),
      r('Surgeon',             310,  5,  25, { manuallabor: 100,  intelligence: 700,  endurance: 250 },  { manuallabor: 5,  intelligence: 16, endurance: 8 }),
      r('Attending',           450,  6,  30, { manuallabor: 175,  intelligence: 1200, endurance: 450 },  { manuallabor: 6,  intelligence: 20, endurance: 10 }),
      r('Specialist',          650,  7,  35, { manuallabor: 280,  intelligence: 2000, endurance: 700 },  { manuallabor: 8,  intelligence: 24, endurance: 12 }),
      r('Chief Physician',     900,  8,  40, { manuallabor: 400,  intelligence: 3200, endurance: 1000 }, { manuallabor: 10, intelligence: 30, endurance: 14 }),
      r('Medical Director',   1300,  9,  45, { manuallabor: 600,  intelligence: 5500, endurance: 1800 }, { manuallabor: 12, intelligence: 38, endurance: 16 }),
      r('Chief of Medicine',  3000, 10, null, { manuallabor: 900,  intelligence: 9000, endurance: 3500 }, { manuallabor: 15, intelligence: 50, endurance: 20 }),
    ],
    abilities: [
      { name: 'First Aid',       description: 'Heal yourself for 15 HP',                  unlockRank: 0, cost: 20,  effect: { type: 'heal', value: 15 } },
      { name: 'Revive',          description: 'Bring a hospitalized player back early',    unlockRank: 3, cost: 75,  effect: { type: 'revive' } },
      { name: 'Rehab',           description: 'Remove 25 addiction',                       unlockRank: 5, cost: 50,  effect: { type: 'reduce_addiction', value: 25 } },
      { name: 'Organ Harvest',   description: 'Obtain a rare medical item',                unlockRank: 7, cost: 125, effect: { type: 'grant_item', itemTag: 'medical' } },
      { name: 'Miracle Worker',  description: 'Full heal + remove hospitalization',        unlockRank: 9, cost: 250, effect: { type: 'full_heal' } },
    ],
  },

  grocer: {
    id: 'grocer',
    name: 'Grocer',
    description: 'Stack shelves, move product. Pure manual labor with a side of endurance.',
    icon: '🛒',
    ranks: [
      r('Stock Boy',          80,   1,   5, { manuallabor: 0,    intelligence: 0,   endurance: 0 },    { manuallabor: 4,  intelligence: 1, endurance: 2 }),
      r('Shelf Stocker',     100,   2,  10, { manuallabor: 40,   intelligence: 8,   endurance: 20 },   { manuallabor: 6,  intelligence: 1, endurance: 3 }),
      r('Cashier',           125,   2,  15, { manuallabor: 90,   intelligence: 20,  endurance: 50 },   { manuallabor: 8,  intelligence: 2, endurance: 4 }),
      r('Floor Manager',     160,   3,  20, { manuallabor: 200,  intelligence: 45,  endurance: 100 },  { manuallabor: 10, intelligence: 3, endurance: 5 }),
      r('Dept. Head',        200,   4,  25, { manuallabor: 450,  intelligence: 90,  endurance: 220 },  { manuallabor: 13, intelligence: 4, endurance: 7 }),
      r('Asst. Manager',     260,   5,  30, { manuallabor: 900,  intelligence: 180, endurance: 440 },  { manuallabor: 16, intelligence: 5, endurance: 9 }),
      r('Store Manager',     360,   6,  35, { manuallabor: 1700, intelligence: 340, endurance: 800 },  { manuallabor: 20, intelligence: 7, endurance: 11 }),
      r('District Manager',  500,   7,  40, { manuallabor: 3000, intelligence: 600, endurance: 1400 }, { manuallabor: 25, intelligence: 9, endurance: 13 }),
      r('VP Operations',     750,   8,  45, { manuallabor: 5500, intelligence: 1100,endurance: 2600 }, { manuallabor: 30, intelligence: 12, endurance: 16 }),
      r('CEO',              1800,  10, null, { manuallabor: 9000, intelligence: 1800,endurance: 4200 }, { manuallabor: 38, intelligence: 16, endurance: 20 }),
    ],
    abilities: [
      { name: 'Employee Discount', description: 'Buy items 10% cheaper',                unlockRank: 1, cost: 15,  effect: { type: 'item_discount', value: 0.10 } },
      { name: 'Bulk Order',        description: 'Receive 3 random food items',          unlockRank: 3, cost: 40,  effect: { type: 'grant_item', itemTag: 'food', qty: 3 } },
      { name: 'Supply Run',        description: '+15 Energy',                           unlockRank: 5, cost: 60,  effect: { type: 'energy', value: 15 } },
      { name: 'Warehouse Access',  description: 'Receive 5 random items',               unlockRank: 7, cost: 100, effect: { type: 'grant_item', itemTag: 'any', qty: 5 } },
      { name: 'Corner the Market', description: 'Sell items for 15% more for 1 hour',   unlockRank: 9, cost: 200, effect: { type: 'sell_bonus', value: 0.15, duration: 3600 } },
    ],
  },

  casino_staff: {
    id: 'casino_staff',
    name: 'Casino Staff',
    description: 'Work the floor, learn the odds. Intelligence and endurance for the long night shifts.',
    icon: '🎰',
    ranks: [
      r('Janitor',            90,   1,   5, { manuallabor: 2,    intelligence: 3,    endurance: 3 },    { manuallabor: 2,  intelligence: 3, endurance: 3 }),
      r('Valet',             115,   2,  10, { manuallabor: 20,   intelligence: 35,   endurance: 30 },   { manuallabor: 3,  intelligence: 5, endurance: 4 }),
      r('Dealer',            150,   3,  15, { manuallabor: 50,   intelligence: 100,  endurance: 70 },   { manuallabor: 4,  intelligence: 7, endurance: 5 }),
      r('Pit Boss',          200,   4,  20, { manuallabor: 100,  intelligence: 250,  endurance: 150 },  { manuallabor: 5,  intelligence: 10, endurance: 7 }),
      r('Floor Manager',     280,   5,  25, { manuallabor: 200,  intelligence: 550,  endurance: 300 },  { manuallabor: 7,  intelligence: 13, endurance: 9 }),
      r('Surveillance',      400,   6,  30, { manuallabor: 350,  intelligence: 1000, endurance: 550 },  { manuallabor: 8,  intelligence: 17, endurance: 11 }),
      r('Operations Mgr',    580,   7,  35, { manuallabor: 550,  intelligence: 1800, endurance: 900 },  { manuallabor: 10, intelligence: 21, endurance: 13 }),
      r('VP Gaming',         800,   8,  40, { manuallabor: 800,  intelligence: 3000, endurance: 1500 }, { manuallabor: 12, intelligence: 26, endurance: 16 }),
      r('Casino Director',  1100,   9,  45, { manuallabor: 1200, intelligence: 5000, endurance: 2500 }, { manuallabor: 14, intelligence: 32, endurance: 18 }),
      r('Casino Owner',     2800,  10, null, { manuallabor: 1800, intelligence: 8500, endurance: 4000 }, { manuallabor: 18, intelligence: 42, endurance: 22 }),
    ],
    abilities: [
      { name: 'Loaded Dice',     description: '+5% casino win rate for 30 min',           unlockRank: 1, cost: 30,  effect: { type: 'casino_boost', value: 0.05, duration: 1800 } },
      { name: 'Comp Drinks',     description: '+20 Happiness',                            unlockRank: 3, cost: 40,  effect: { type: 'happiness', value: 20 } },
      { name: 'Card Counting',   description: '+10% casino win rate for 1 hour',          unlockRank: 5, cost: 80,  effect: { type: 'casino_boost', value: 0.10, duration: 3600 } },
      { name: 'VIP Comps',       description: '+50 Happiness and +10 Energy',             unlockRank: 7, cost: 120, effect: { type: 'multi_boost', happy: 50, energy: 10 } },
      { name: 'House Edge',      description: 'Free casino spins for 1 hour',             unlockRank: 9, cost: 250, effect: { type: 'free_spins', duration: 3600 } },
    ],
  },

  law: {
    id: 'law',
    name: 'Law Enforcement',
    description: 'Enforce the law. Balanced stats with emphasis on endurance and intelligence.',
    icon: '👮',
    ranks: [
      r('Cadet',             110,  1,   5, { manuallabor: 3,    intelligence: 3,    endurance: 3 },    { manuallabor: 2,  intelligence: 2, endurance: 3 }),
      r('Officer',           140,  2,  10, { manuallabor: 30,   intelligence: 40,   endurance: 35 },   { manuallabor: 3,  intelligence: 4, endurance: 4 }),
      r('Corporal',          175,  3,  15, { manuallabor: 80,   intelligence: 100,  endurance: 85 },   { manuallabor: 5,  intelligence: 6, endurance: 6 }),
      r('Sergeant',          220,  4,  20, { manuallabor: 175,  intelligence: 240,  endurance: 190 },  { manuallabor: 7,  intelligence: 8, endurance: 8 }),
      r('Detective',         300,  5,  25, { manuallabor: 380,  intelligence: 520,  endurance: 400 },  { manuallabor: 9,  intelligence: 11, endurance: 10 }),
      r('Lieutenant',        420,  6,  30, { manuallabor: 700,  intelligence: 1000, endurance: 750 },  { manuallabor: 11, intelligence: 14, endurance: 12 }),
      r('Captain',           600,  7,  35, { manuallabor: 1200, intelligence: 1800, endurance: 1300 }, { manuallabor: 14, intelligence: 18, endurance: 15 }),
      r('Commander',         850,  8,  40, { manuallabor: 2000, intelligence: 3200, endurance: 2200 }, { manuallabor: 17, intelligence: 22, endurance: 18 }),
      r('Deputy Chief',     1200,  9,  45, { manuallabor: 3500, intelligence: 5500, endurance: 3800 }, { manuallabor: 20, intelligence: 28, endurance: 22 }),
      r('Chief of Police',  2800, 10, null, { manuallabor: 6000, intelligence: 9000, endurance: 6500 }, { manuallabor: 25, intelligence: 35, endurance: 28 }),
    ],
    abilities: [
      { name: 'Patrol',          description: 'Reduce your jail time by 30 min',          unlockRank: 0, cost: 20,  effect: { type: 'reduce_jail', value: 1800 } },
      { name: 'Bust',            description: 'Attempt to bust a player out of jail',     unlockRank: 3, cost: 75,  effect: { type: 'bust' } },
      { name: 'Investigate',     description: 'View another player\'s crime history',     unlockRank: 5, cost: 60,  effect: { type: 'spy_crimes' } },
      { name: 'SWAT Raid',       description: 'Receive a random weapon + armor',          unlockRank: 7, cost: 150, effect: { type: 'grant_item', itemTag: 'weapon_armor' } },
      { name: 'Martial Law',     description: '+100 Defense for 1 hour',                  unlockRank: 9, cost: 250, effect: { type: 'temp_stat', stat: 'defense', value: 100, duration: 3600 } },
    ],
  },

  education: {
    id: 'education',
    name: 'Education',
    description: 'Teach the next generation. Pure intelligence gains with solid endurance.',
    icon: '📚',
    ranks: [
      r('Teaching Aide',      85,   1,   5, { manuallabor: 1,   intelligence: 5,     endurance: 2 },    { manuallabor: 1,  intelligence: 5, endurance: 1 }),
      r('Substitute',        110,   2,  10, { manuallabor: 8,   intelligence: 55,    endurance: 18 },   { manuallabor: 1,  intelligence: 7, endurance: 2 }),
      r('Teacher',           140,   3,  15, { manuallabor: 18,  intelligence: 140,   endurance: 45 },   { manuallabor: 2,  intelligence: 10, endurance: 3 }),
      r('Senior Teacher',    180,   3,  20, { manuallabor: 35,  intelligence: 320,   endurance: 90 },   { manuallabor: 2,  intelligence: 13, endurance: 4 }),
      r('Dept. Chair',       230,   4,  25, { manuallabor: 60,  intelligence: 650,   endurance: 180 },  { manuallabor: 3,  intelligence: 17, endurance: 5 }),
      r('Vice Principal',    310,   5,  30, { manuallabor: 100, intelligence: 1100,  endurance: 350 },  { manuallabor: 4,  intelligence: 22, endurance: 7 }),
      r('Principal',         440,   6,  35, { manuallabor: 160, intelligence: 1900,  endurance: 580 },  { manuallabor: 5,  intelligence: 28, endurance: 9 }),
      r('Administrator',     620,   7,  40, { manuallabor: 250, intelligence: 3100,  endurance: 900 },  { manuallabor: 6,  intelligence: 35, endurance: 11 }),
      r('Superintendent',    900,   8,  45, { manuallabor: 380, intelligence: 5200,  endurance: 1500 }, { manuallabor: 8,  intelligence: 44, endurance: 14 }),
      r('Chancellor',       2200,  10, null, { manuallabor: 550, intelligence: 8500,  endurance: 2800 }, { manuallabor: 10, intelligence: 55, endurance: 18 }),
    ],
    abilities: [
      { name: 'Study Session',   description: '+500 experience points',                   unlockRank: 0, cost: 20,  effect: { type: 'exp', value: 500 } },
      { name: 'Tutor',           description: '+5 Intelligence permanent',                unlockRank: 2, cost: 40,  effect: { type: 'perm_stat', stat: 'intelligence', value: 5 } },
      { name: 'Research Grant',  description: '+2000 experience points',                  unlockRank: 5, cost: 80,  effect: { type: 'exp', value: 2000 } },
      { name: 'Scholarship',     description: 'Reduce education course time by 50%',      unlockRank: 7, cost: 120, effect: { type: 'edu_speed', value: 0.5 } },
      { name: 'Tenure',          description: '+10 to all work stats permanent',           unlockRank: 9, cost: 250, effect: { type: 'perm_all_workstats', value: 10 } },
    ],
  },
};

// ── COMPANY JOBS (NPC-owned for now) ──────────────────────────
// These are structurally different: a Company entity exists in the DB.
// Each company type has roles with different stat weightings.

const COMPANY_TYPES = {
  logistics: {
    id: 'logistics',
    name: 'Logistics Company',
    description: 'Shipping and freight. Hard labor, decent pay.',
    icon: '🚛',
    baseSalary: 150,
    salaryPerRating: 30,       // salary += rating * this
    statWeights: { manuallabor: 0.6, intelligence: 0.1, endurance: 0.3 },
    passiveGains: { manuallabor: 2, intelligence: 0, endurance: 1 },
  },
  tech: {
    id: 'tech',
    name: 'Tech Startup',
    description: 'Code, innovate, disrupt. Intelligence-driven with ok pay.',
    icon: '💻',
    baseSalary: 180,
    salaryPerRating: 35,
    statWeights: { manuallabor: 0.05, intelligence: 0.75, endurance: 0.2 },
    passiveGains: { manuallabor: 0, intelligence: 3, endurance: 1 },
  },
  restaurant: {
    id: 'restaurant',
    name: 'Restaurant',
    description: 'Cook, serve, hustle. Balanced stats with tips.',
    icon: '🍽️',
    baseSalary: 120,
    salaryPerRating: 25,
    statWeights: { manuallabor: 0.35, intelligence: 0.25, endurance: 0.4 },
    passiveGains: { manuallabor: 1, intelligence: 1, endurance: 1 },
  },
  security: {
    id: 'security',
    name: 'Security Firm',
    description: 'Guard, patrol, respond. Endurance and strength.',
    icon: '🛡️',
    baseSalary: 160,
    salaryPerRating: 28,
    statWeights: { manuallabor: 0.45, intelligence: 0.15, endurance: 0.4 },
    passiveGains: { manuallabor: 2, intelligence: 0, endurance: 2 },
  },
  pharma: {
    id: 'pharma',
    name: 'Pharmaceutical Corp',
    description: 'Research, develop, profit. Heavy intelligence.',
    icon: '💊',
    baseSalary: 200,
    salaryPerRating: 40,
    statWeights: { manuallabor: 0.1, intelligence: 0.7, endurance: 0.2 },
    passiveGains: { manuallabor: 0, intelligence: 3, endurance: 1 },
  },
};

module.exports = {
  meta,
  CITY_JOBS,
  COMPANY_TYPES,
};
