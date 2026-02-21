// ═══════════════════════════════════════════════════════════════
//  CARTEL / DRUG EMPIRE CONFIG
//  Standalone system — drugs, territories, NPCs, combat
// ═══════════════════════════════════════════════════════════════

// ── Drug types & production ──────────────────────────────────

const DRUGS = {
  cocaine: {
    id: 'cocaine',
    name: 'Cocaine',
    emoji: '❄️',
    baseProductionTime: 3600,       // seconds per batch
    batchSize: 10,                  // units per batch
    baseCost: 500,                  // raw material cost per batch
    basePrice: 1500,                // street price per unit
    baseQuality: 50,                // 0-100, affected by lab + cook skill
    requiredLab: 'coke_kitchen',
    description: 'Peruvian flake. One taste and they\'re hooked for life. The devil\'s dandruff moves faster than anything else on the street.',
  },
  meth: {
    id: 'meth',
    name: 'Methamphetamine',
    emoji: '💎',
    baseProductionTime: 2400,
    batchSize: 15,
    baseCost: 300,
    basePrice: 900,
    baseQuality: 50,
    requiredLab: 'meth_lab',
    description: 'Crystal blue persuasion. One wrong move in the cook and the whole block goes up. But when it\'s pure? Nothing else comes close.',
  },
  heroin: {
    id: 'heroin',
    name: 'Heroin',
    emoji: '🩸',
    baseProductionTime: 5400,
    batchSize: 8,
    baseCost: 800,
    basePrice: 2200,
    baseQuality: 50,
    requiredLab: 'heroin_den',
    description: 'Black tar nightmare. Cooks slow, kills fast, sells for a fortune. Every junkie in the city will bleed for a fix.',
  },
  mdma: {
    id: 'mdma',
    name: 'MDMA',
    emoji: '💊',
    baseProductionTime: 1800,
    batchSize: 20,
    baseCost: 200,
    basePrice: 600,
    baseQuality: 50,
    requiredLab: 'pill_press',
    description: 'Club candy. Floods the underground scene every weekend. Easy money if you don\'t mind the rave kids ODing in bathroom stalls.',
  },
  pills: {
    id: 'pills',
    name: 'Prescription Pills',
    emoji: '💉',
    baseProductionTime: 1200,
    batchSize: 30,
    baseCost: 100,
    basePrice: 350,
    baseQuality: 60,
    requiredLab: 'pill_press',
    description: 'Pharmacy-grade poison with a clean label. Soccer moms and CEOs pop these like candy. Low heat, steady flow.',
  },
};

// ── Lab types ────────────────────────────────────────────────

const LABS = {
  coke_kitchen: {
    id: 'coke_kitchen',
    name: 'Coke Kitchen',
    cost: 500000,
    upgradeCostMult: 1.8,       // each level costs base * mult^level
    maxLevel: 5,
    productionBonus: 0.15,      // +15% speed per level
    qualityBonus: 8,            // +8 quality per level
    description: 'Stainless steel tables, industrial ventilation, and the sweet chemical stench of processing. One spark and it all goes sideways.',
  },
  meth_lab: {
    id: 'meth_lab',
    name: 'Meth Superlab',
    cost: 300000,
    upgradeCostMult: 1.7,
    maxLevel: 5,
    productionBonus: 0.15,
    qualityBonus: 8,
    description: 'Hazmat suits, boiling flasks, and fumes that\'ll melt your lungs. Heisenberg would be proud. Or jealous.',
  },
  heroin_den: {
    id: 'heroin_den',
    name: 'Heroin Den',
    cost: 750000,
    upgradeCostMult: 2.0,
    maxLevel: 5,
    productionBonus: 0.12,
    qualityBonus: 10,
    description: 'A sweat-soaked basement reeking of vinegar and desperation. Raw opium goes in, liquid misery comes out.',
  },
  pill_press: {
    id: 'pill_press',
    name: 'Pill Press',
    cost: 150000,
    upgradeCostMult: 1.5,
    maxLevel: 5,
    productionBonus: 0.20,
    qualityBonus: 6,
    description: 'Industrial stamping machines churning out counterfeit prescriptions by the thousands. Clean operation, dirty money.',
  },
};

// ── Territories ──────────────────────────────────────────────
// Dynamic control: players fight over territories.
// Each territory has sub-zones. Controlling a territory
// affects drug prices, demand, heat, and income.

const REGIONS = {
  north_america: {
    id: 'north_america',
    name: 'North America',
    territories: {
      los_santos:    { id: 'los_santos',    name: 'Los Santos',    demand: 1.2, lawLevel: 0.7, baseHeat: 5,  description: 'Sun-bleached concrete and blood-stained alleys. The LSPD has a hard-on for narcotics busts, but the money is relentless.' },
      miami:         { id: 'miami',         name: 'Miami',         demand: 1.4, lawLevel: 0.6, baseHeat: 8,  description: 'Neon lights, speedboats, and kilos wrapped in duct tape. The cocaine capital. Every DEA agent in the state has eyes here.' },
      detroit:       { id: 'detroit',       name: 'Detroit',       demand: 1.0, lawLevel: 0.4, baseHeat: 3,  description: 'Abandoned factories and boarded-up houses. The cops gave up years ago. Tweakers roam these streets like the walking dead.' },
      new_york:      { id: 'new_york',      name: 'New York',      demand: 1.5, lawLevel: 0.8, baseHeat: 10, description: 'Eight million potential customers stacked on top of each other. The money is insane but so is the heat — NYPD, FBI, and the feds are always watching.' },
      chicago:       { id: 'chicago',       name: 'Chicago',       demand: 1.1, lawLevel: 0.5, baseHeat: 6,  description: 'The Windy City runs on gang territory and cold-blooded business. Control the South Side and the product moves itself.' },
    },
  },
  latin_america: {
    id: 'latin_america',
    name: 'Latin America',
    territories: {
      medellin:      { id: 'medellin',      name: 'Medellín',      demand: 0.8, lawLevel: 0.3, baseHeat: 2,  description: 'Pablo\'s ghost still haunts these hills. The coca fields stretch for miles and the locals know to keep their mouths shut.' },
      sinaloa:       { id: 'sinaloa',       name: 'Sinaloa',       demand: 0.7, lawLevel: 0.2, baseHeat: 1,  description: 'Cartel country. The mountains swallow anyone who asks questions. Cops don\'t come here — they know better.' },
      rio:           { id: 'rio',           name: 'Rio de Janeiro', demand: 1.0, lawLevel: 0.4, baseHeat: 4,  description: 'Favela maze — a thousand hidden stash houses connected by rooftops and dirt paths. The gangs run these hills like a sovereign nation.' },
      tijuana:       { id: 'tijuana',       name: 'Tijuana',       demand: 0.9, lawLevel: 0.3, baseHeat: 3,  description: 'The border crossing. Tunnels, trucks, and body cavities — product crosses by the ton. Headless bodies turn up when deals go south.' },
    },
  },
  europe: {
    id: 'europe',
    name: 'Europe',
    territories: {
      amsterdam:     { id: 'amsterdam',     name: 'Amsterdam',     demand: 1.3, lawLevel: 0.5, baseHeat: 4,  description: 'Red lights and coffee shops are just the surface. Underneath, the Dutch syndicate moves more MDMA than anyone on the continent.' },
      london:        { id: 'london',        name: 'London',        demand: 1.4, lawLevel: 0.7, baseHeat: 7,  description: 'County lines, acid attacks, and Rolls Royces. The London underworld pays top dollar but Scotland Yard doesn\'t sleep.' },
      marseille:     { id: 'marseille',     name: 'Marseille',     demand: 1.0, lawLevel: 0.4, baseHeat: 3,  description: 'The French Connection never died — it just got smarter. Mediterranean port access and corrupt dock workers make this a smuggler\'s paradise.' },
      berlin:        { id: 'berlin',        name: 'Berlin',        demand: 1.1, lawLevel: 0.5, baseHeat: 5,  description: 'Techno clubs that don\'t close for 72 hours. The party never stops and neither does the demand. Pills vanish into the crowd like water into sand.' },
      visby:        { id: 'visby',         name: 'Visby',         demand: 0.6, lawLevel: 0.2, baseHeat: 1,  description: 'Quiet island town with a dark secret. The Scandinavian elite come here to buy their drugs in peace. Small market, but they pay in large bills and never call the cops.' },
    },
  },
  asia: {
    id: 'asia',
    name: 'Asia',
    territories: {
      bangkok:       { id: 'bangkok',       name: 'Bangkok',       demand: 1.0, lawLevel: 0.6, baseHeat: 6,  description: 'Tuk-tuks, temples, and ten-kilo shipments hidden in shipping containers. Thai police shoot first — if the triads don\'t get you first.' },
      hong_kong:     { id: 'hong_kong',     name: 'Hong Kong',     demand: 1.3, lawLevel: 0.7, baseHeat: 8,  description: 'Skyscraper penthouses and harbor-side handoffs. The triads run an iron grid. Premium prices, but one wrong move and you disappear.' },
      golden_triangle: { id: 'golden_triangle', name: 'Golden Triangle', demand: 0.6, lawLevel: 0.1, baseHeat: 1, description: 'Lawless jungle where warlords cook heroin by the ton. No government, no rules, no witnesses. Just poppy fields and automatic weapons.' },
    },
  },
};

// Flatten for quick lookup
const TERRITORIES = {};
for (const region of Object.values(REGIONS)) {
  for (const [key, terr] of Object.entries(region.territories)) {
    TERRITORIES[key] = { ...terr, region: region.id, regionName: region.name };
  }
}

// ── NPC Roles & Generation ───────────────────────────────────

const NPC_ROLES = {
  dealer: {
    id: 'dealer',
    name: 'Drug Dealer',
    emoji: '🤝',
    baseSalary: 500,             // per hour
    salaryPerLevel: 150,
    primaryStat: 'charisma',     // affects sell speed / prices
    description: 'Corner boys with silver tongues. They talk fiends into paying double and rival dealers into walking away. Charisma is currency.',
  },
  mule: {
    id: 'mule',
    name: 'Mule',
    emoji: '📦',
    baseSalary: 400,
    salaryPerLevel: 120,
    primaryStat: 'stealth',      // affects smuggling success
    description: 'Ghost runners. They swallow balloons, hide keys in car panels, and cross borders without breaking a sweat. If they get caught, they don\'t talk.',
  },
  bodyguard: {
    id: 'bodyguard',
    name: 'Bodyguard',
    emoji: '🛡️',
    baseSalary: 750,
    salaryPerLevel: 200,
    primaryStat: 'combat',       // affects defense power
    description: 'Stone-cold killers who stand between you and a shallow grave. They eat bullets for breakfast and sleep with one eye open.',
  },
  hitman: {
    id: 'hitman',
    name: 'Hitman',
    emoji: '🎯',
    baseSalary: 1000,
    salaryPerLevel: 300,
    primaryStat: 'combat',       // affects attack power
    description: 'The last face your enemies see. Surgical, merciless, expensive. Point them at a problem and the problem stops breathing.',
  },
  enforcer: {
    id: 'enforcer',
    name: 'Enforcer',
    emoji: '🕶️',
    baseSalary: 850,
    salaryPerLevel: 250,
    primaryStat: 'intelligence', // affects bribery, intimidation, scheming
    description: 'Suit-wearing psychopaths who know which judge takes cash and which kneecap to break. Brains and brutality in one package.',
  },
};

// NPC stat names
const NPC_STATS = ['combat', 'stealth', 'charisma', 'intelligence', 'speed'];

// Rarity tiers affect stat rolls on hire
const NPC_RARITIES = {
  common:    { id: 'common',    name: 'Common',    color: '#9ca3af', statMin: 5,  statMax: 15, hireCostMult: 1.0,  weight: 50 },
  uncommon:  { id: 'uncommon',  name: 'Uncommon',  color: '#22c55e', statMin: 10, statMax: 25, hireCostMult: 1.8,  weight: 30 },
  rare:      { id: 'rare',      name: 'Rare',      color: '#3b82f6', statMin: 18, statMax: 40, hireCostMult: 3.5,  weight: 13 },
  epic:      { id: 'epic',      name: 'Epic',      color: '#a855f7', statMin: 30, statMax: 60, hireCostMult: 7.0,  weight: 5  },
  legendary: { id: 'legendary', name: 'Legendary', color: '#f59e0b', statMin: 50, statMax: 85, hireCostMult: 15.0, weight: 2  },
};

// Base hire costs per role
const NPC_HIRE_COSTS = {
  dealer:    5000,
  mule:      4000,
  bodyguard: 8000,
  hitman:    15000,
  enforcer:  12000,
};

// NPC name pools
const NPC_FIRST_NAMES = [
  'Carlos', 'Miguel', 'Diego', 'Alejandro', 'Luis', 'Marco', 'Rafael', 'Javier',
  'Rico', 'Santos', 'Elena', 'Maria', 'Sofia', 'Isabella', 'Rosa', 'Valentina',
  'Tony', 'Vince', 'Danny', 'Big Mike', 'Lil T', 'Snake', 'Ghost', 'Ace',
  'Blade', 'Nova', 'Phoenix', 'Raven', 'Diesel', 'Razor', 'Ivy', 'Scarlet',
  'Viktor', 'Nikolai', 'Yuri', 'Dimitri', 'Kenji', 'Hiro', 'Jin', 'Kwame',
  'Bones', 'Crowbar', 'Nails', 'Trigger', 'Spider', 'Smoke', 'Diablo', 'Lobo',
  'Hector', 'Tuco', 'Gustavo', 'Paco', 'Nacho', 'Lalo', 'Ignacio', 'Emilio',
  'Skinny Pete', 'Badger', 'Combo', 'Psycho', 'Cuco', 'Flaco', 'Gordo', 'Chapo',
  'Mad Dog', 'Creeper', 'Shadow', 'Hawk', 'Angel', 'Demon', 'Sangre', 'Muerte',
  'Silencio', 'Machete', 'Fang', 'Peligro', 'Rata', 'Cuervo', 'Veneno', 'Oso',
];
const NPC_LAST_NAMES = [
  'Escobar', 'Guzm\u00e1n', 'Reyes', 'Morales', 'Vega', 'Cortez', 'Salazar', 'Mendoza',
  'Cruz', 'Delgado', 'Santiago', 'Fuentes', 'Romero', 'Vargas', 'Guerrero', 'Rojas',
  'Montana', 'Corleone', 'Soprano', 'Gambino', 'Capone', 'Luciano', 'Gotti', 'Silva',
  'Volkov', 'Petrov', 'Tanaka', 'Wong', 'Kim', 'Singh', 'O\'Brien', 'Rossi',
  'Salamanca', 'Madrigal', 'Fring', 'Pinkman', 'Carillo', 'Gallardo', 'Ochoa', 'Caro',
  'Quintero', 'Camarena', 'Torres', 'Herrera', 'Villalobos', 'Barrera', 'Diaz', 'Felix',
  'Zeta', 'Padrino', 'Carrasco', 'Leyva', 'Beltran', 'Arellano', 'Amado', 'Valenzuela',
];

// XP required per level: level N needs xpPerLevel * N^1.5
const NPC_XP_PER_LEVEL = 100;
const NPC_MAX_LEVEL = 50;
const NPC_LOYALTY_DECAY = 1;         // loyalty lost per day if salary unpaid
const NPC_LOYALTY_GAIN_MISSION = 3;  // loyalty gained per successful mission
const NPC_LOYALTY_MAX = 100;
const NPC_BETRAY_THRESHOLD = 20;     // below this loyalty, chance of betrayal each tick

// ── Mission / Combat ─────────────────────────────────────────

const MISSION_TYPES = {
  delivery: {
    id: 'delivery',
    name: 'Drug Run',
    emoji: '🚚',
    baseDuration: 3600,          // 1hr base, modified by distance + mule speed
    requiredRole: 'mule',
    minNPCs: 1,
    description: 'Load the trunk, keep your head down, and pray the feds aren\'t running plates tonight.',
  },
  attack: {
    id: 'attack',
    name: 'Hit a Rival',
    emoji: '⚔️',
    baseDuration: 7200,          // 2hr
    requiredRole: 'hitman',
    minNPCs: 1,
    description: 'Roll up on enemy territory with loaded weapons. Take their money, send a message written in blood.',
  },
  seize: {
    id: 'seize',
    name: 'Hostile Takeover',
    emoji: '🏴',
    baseDuration: 14400,         // 4hr
    requiredRole: 'hitman',
    minNPCs: 3,
    description: 'Full-scale war. Bodies will drop, buildings will burn, but when the smoke clears — that territory is yours.',
  },
  defend: {
    id: 'defend',
    name: 'Hold the Line',
    emoji: '🛡️',
    baseDuration: 0,             // passive, always active
    requiredRole: 'bodyguard',
    minNPCs: 1,
    description: 'Station shooters on every corner. Anyone who rolls through uninvited leaves in a body bag.',
  },
  assassination: {
    id: 'assassination',
    name: 'Wet Work',
    emoji: '💀',
    baseDuration: 10800,         // 3hr
    requiredRole: 'hitman',
    minNPCs: 1,
    description: 'One target, one bullet, no witnesses. Erase someone from existence and watch the dominoes fall.',
  },
  corruption: {
    id: 'corruption',
    name: 'Grease the Machine',
    emoji: '🏛️',
    baseDuration: 7200,          // 2hr
    requiredRole: 'enforcer',
    minNPCs: 1,
    description: 'Judges, cops, politicians — everyone has a price. Find it, pay it, and watch your problems vanish from the system.',
  },
  sabotage: {
    id: 'sabotage',
    name: 'Scorched Earth',
    emoji: '💣',
    baseDuration: 5400,          // 1.5hr
    requiredRole: 'hitman',
    minNPCs: 2,
    description: 'Burn their lab to the ground. Destroy their stash. Leave nothing but ashes and a warning.',
  },
  smuggling: {
    id: 'smuggling',
    name: 'Border Run',
    emoji: '🛩️',
    baseDuration: 5400,          // 1.5hr
    requiredRole: 'mule',
    minNPCs: 2,
    description: 'Cross borders with product hidden in places customs won\'t check. Massive payoff if you don\'t end up in a foreign prison.',
  },
  intimidation: {
    id: 'intimidation',
    name: 'Shake Down',
    emoji: '👊',
    baseDuration: 3600,          // 1hr
    requiredRole: 'enforcer',
    minNPCs: 1,
    description: 'Kick in doors, break fingers, collect cash. Remind every shop owner and street vendor who really runs this neighborhood.',
  },
};

// Combat power formula weights
const COMBAT_WEIGHTS = {
  combat:       1.0,
  stealth:      0.3,
  intelligence: 0.2,
  speed:        0.4,
};
// Attacker gets a slight disadvantage (defender bonus)
const DEFENDER_BONUS = 1.15;
// Casualty rate on loss
const CASUALTY_CHANCE_LOSS = 0.30;   // 30% chance each NPC dies on a loss
const CASUALTY_CHANCE_WIN  = 0.08;   // 8% on a win
const INJURY_CHANCE_WIN    = 0.20;   // 20% injured on win
const INJURY_RECOVERY_HOURS = 24;

// ── Cartel progression ───────────────────────────────────────

const CARTEL_CREATE_COST = 250000;    // $250k to establish
const CARTEL_MAX_NPCS_BASE = 5;       // starting NPC cap
const CARTEL_MAX_NPCS_PER_REP = 2;    // +2 cap per reputation level
const CARTEL_MAX_LABS_BASE = 1;
const CARTEL_MAX_LABS_PER_REP = 1;

// Reputation levels (earned through operations)
const REP_LEVELS = [
  { level: 0, name: 'Nobody',             xpRequired: 0 },
  { level: 1, name: 'Corner Boy',         xpRequired: 100 },
  { level: 2, name: 'Street Hustler',     xpRequired: 500 },
  { level: 3, name: 'Shot Caller',        xpRequired: 1500 },
  { level: 4, name: 'Underboss',          xpRequired: 5000 },
  { level: 5, name: 'Drug Lord',          xpRequired: 15000 },
  { level: 6, name: 'Kingpin',            xpRequired: 40000 },
  { level: 7, name: 'Narco God',          xpRequired: 100000 },
  { level: 8, name: 'El Padrino',         xpRequired: 200000 },
  { level: 9, name: 'The One Who Knocks', xpRequired: 500000 },
];

// Passive rep earned per hourly tick (solo-friendly, no PvP needed)
const PASSIVE_REP_PER_LAB       = 5;   // per active lab
const PASSIVE_REP_PER_TERRITORY = 8;   // per controlled territory
const PASSIVE_REP_PER_NPC       = 2;   // per alive NPC
const PASSIVE_REP_BASE          = 3;   // just for having a cartel

// Heat mechanics — law enforcement attention
const HEAT_DECAY_PER_HOUR = 1;         // passive heat decay
const HEAT_PER_PRODUCTION = 2;          // per batch produced
const HEAT_PER_SALE = 1;                // per sale completed
const HEAT_PER_DELIVERY = 3;            // per cross-territory delivery
const HEAT_PER_ATTACK = 10;             // raiding another player
const HEAT_PER_SEIZE = 20;              // seizing territory
const HEAT_PER_ASSASSINATION = 25;      // killing a rival NPC
const HEAT_PER_SABOTAGE = 15;           // sabotaging rival lab
const HEAT_PER_SMUGGLING = 12;          // cross-border smuggling run
const HEAT_PER_INTIMIDATION = 8;        // shaking down a territory
const HEAT_CORRUPTION_REDUCE = 15;      // heat REMOVED by corruption mission
const HEAT_BUST_THRESHOLD = 80;         // above this, chance of getting busted
const HEAT_BUST_CHANCE_PER_POINT = 0.005; // 0.5% per point above threshold

// Bust consequences
const BUST_PRODUCT_LOSS = 0.50;         // lose 50% of stocked product
const BUST_MONEY_LOSS = 0.20;           // lose 20% of cartel treasury
const BUST_NPC_ARREST_CHANCE = 0.25;    // each NPC has 25% chance of arrest
const BUST_COOLDOWN_HOURS = 6;          // cartel operations frozen

// ── Territory Upgrades ───────────────────────────────────────
// Invest in controlled turf for defense, income, and stealth bonuses.

const TERRITORY_UPGRADES = {
  stash_house: {
    id: 'stash_house',
    name: 'Stash House',
    emoji: '🏠',
    description: 'Hidden storage — reduces product loss during busts.',
    maxLevel: 5,
    baseCost: 25000,
    costMult: 1.8,
    effect: 'bust_protection',
    effectPerLevel: 0.08,   // -8% bust product loss per level
  },
  lookout_post: {
    id: 'lookout_post',
    name: 'Lookout Post',
    emoji: '👁️',
    description: 'Eyes on the street — reduces heat gain from sales in this territory.',
    maxLevel: 5,
    baseCost: 20000,
    costMult: 1.7,
    effect: 'heat_reduction',
    effectPerLevel: 0.15,   // -15% heat per sale per level
  },
  safe_house: {
    id: 'safe_house',
    name: 'Safe House',
    emoji: '🛡️',
    description: 'Secure location — boosts defending power and NPC injury recovery.',
    maxLevel: 5,
    baseCost: 40000,
    costMult: 2.0,
    effect: 'defense_bonus',
    effectPerLevel: 0.10,   // +10% defense per level
  },
  distribution_hub: {
    id: 'distribution_hub',
    name: 'Distribution Hub',
    emoji: '📦',
    description: 'Logistics network — increases drug sale prices in this territory.',
    maxLevel: 5,
    baseCost: 50000,
    costMult: 2.0,
    effect: 'sale_bonus',
    effectPerLevel: 0.08,   // +8% sale price per level
  },
  money_laundry: {
    id: 'money_laundry',
    name: 'Money Laundry',
    emoji: '💰',
    description: 'Clean cash operation — generates passive income per hour.',
    maxLevel: 5,
    baseCost: 75000,
    costMult: 2.2,
    effect: 'passive_income',
    effectPerLevel: 500,    // +$500/hr per level
  },
};

module.exports = {
  DRUGS,
  LABS,
  REGIONS,
  TERRITORIES,
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
  MISSION_TYPES,
  COMBAT_WEIGHTS,
  DEFENDER_BONUS,
  CASUALTY_CHANCE_LOSS,
  CASUALTY_CHANCE_WIN,
  INJURY_CHANCE_WIN,
  INJURY_RECOVERY_HOURS,
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
  HEAT_PER_PRODUCTION,
  HEAT_PER_SALE,
  HEAT_PER_DELIVERY,
  HEAT_PER_ATTACK,
  HEAT_PER_SEIZE,
  HEAT_PER_ASSASSINATION,
  HEAT_PER_SABOTAGE,
  HEAT_PER_SMUGGLING,
  HEAT_PER_INTIMIDATION,
  HEAT_CORRUPTION_REDUCE,
  HEAT_BUST_THRESHOLD,
  HEAT_BUST_CHANCE_PER_POINT,
  BUST_PRODUCT_LOSS,
  BUST_MONEY_LOSS,
  BUST_NPC_ARREST_CHANCE,
  BUST_COOLDOWN_HOURS,
  TERRITORY_UPGRADES,
};
