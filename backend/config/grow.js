// Grow system configuration
// Defines weed strains, warehouses, grow stages, and consumable effects

// ─── Growth stages (every plant goes through these in order) ───────────────
// Duration is in seconds. Each stage must complete before the next begins.
const GROW_STAGES = {
  seedling:    { id: 'seedling',    name: 'Seedling',    order: 0 },
  vegetative:  { id: 'vegetative',  name: 'Vegetative',  order: 1 },
  flowering:   { id: 'flowering',   name: 'Flowering',   order: 2 },
  ready:       { id: 'ready',       name: 'Ready to Harvest', order: 3 },
};

// ─── Weed strains (seeds) ──────────────────────────────────────────────────
// seedCost: price of one seed packet
// dirtCost: how much dirt costs per plant (universal)
// growTime: total seconds from planting to harvest-ready (split equally across 3 active stages)
// yield: { min, max } grams produced on harvest
// sellPrice: NPC sell value per gram
// effect: temporary buff when consumed (duration in seconds)
const STRAINS = {
  schwag: {
    id: 'schwag',
    name: 'Schwag',
    description: 'Low-grade street weed. Fast to grow, barely hits.',
    seedCost: 500,
    growTime: 600,          // 10 minutes total
    yield: { min: 3, max: 6 },
    sellPrice: 80,
    effect: { happy: 5, duration: 300 },
  },
  og_kush: {
    id: 'og_kush',
    name: 'OG Kush',
    description: 'The classic. Solid all-round strain with a decent high.',
    seedCost: 2000,
    growTime: 1800,         // 30 minutes
    yield: { min: 4, max: 8 },
    sellPrice: 200,
    effect: { happy: 15, duration: 600 },
  },
  purple_haze: {
    id: 'purple_haze',
    name: 'Purple Haze',
    description: 'Vibrant purple buds with a euphoric, creative high.',
    seedCost: 5000,
    growTime: 3600,         // 1 hour
    yield: { min: 5, max: 10 },
    sellPrice: 450,
    effect: { happy: 25, energy: 10, duration: 900 },
  },
  white_widow: {
    id: 'white_widow',
    name: 'White Widow',
    description: 'Frosty trichomes and a powerful, balanced effect.',
    seedCost: 10000,
    growTime: 7200,         // 2 hours
    yield: { min: 6, max: 12 },
    sellPrice: 800,
    effect: { happy: 40, nerve: 5, duration: 1200 },
  },
  blue_dream: {
    id: 'blue_dream',
    name: 'Blue Dream',
    description: 'Sweet berry aroma. Calming yet motivating.',
    seedCost: 15000,
    growTime: 10800,        // 3 hours
    yield: { min: 7, max: 14 },
    sellPrice: 1100,
    effect: { happy: 50, energy: 15, duration: 1500 },
  },
  gorilla_glue: {
    id: 'gorilla_glue',
    name: 'Gorilla Glue',
    description: 'Heavy-hitting hybrid. Couch-lock guaranteed.',
    seedCost: 25000,
    growTime: 14400,        // 4 hours
    yield: { min: 8, max: 16 },
    sellPrice: 1600,
    effect: { happy: 70, strength: 5, defense: 5, duration: 1800 },
  },
  nizzia_gold: {
    id: 'nizzia_gold',
    name: 'Nizzia Gold',
    description: 'Nizzia City\'s legendary homegrown. Extremely rare seeds.',
    seedCost: 100000,
    growTime: 28800,        // 8 hours
    yield: { min: 10, max: 20 },
    sellPrice: 3500,
    effect: { happy: 120, energy: 25, nerve: 10, strength: 10, duration: 3600 },
  },
};

// ─── Warehouses ────────────────────────────────────────────────────────────
// Players must buy a warehouse to grow. Each tier grants more pot slots.
const WAREHOUSES = {
  shed: {
    id: 'shed',
    name: 'Garden Shed',
    description: 'A cramped shed in the back alley. Room for a couple of pots.',
    cost: 25000,
    maxPots: 2,
  },
  garage: {
    id: 'garage',
    name: 'Garage Grow-Op',
    description: 'A rented garage with basic ventilation. Getting serious.',
    cost: 150000,
    maxPots: 4,
  },
  basement: {
    id: 'basement',
    name: 'Basement Lab',
    description: 'A hidden basement setup with grow lights and irrigation.',
    cost: 500000,
    maxPots: 6,
  },
  warehouse: {
    id: 'warehouse',
    name: 'Industrial Warehouse',
    description: 'Full-scale operation. Climate control, security, the works.',
    cost: 2000000,
    maxPots: 10,
  },
  bunker: {
    id: 'bunker',
    name: 'Underground Bunker',
    description: 'Off the grid. Maximum capacity for the serious grower.',
    cost: 10000000,
    maxPots: 16,
  },
};

// Universal dirt cost per planting
const DIRT_COST = 100;

// Pot cost (one-time purchase per pot slot)
const POT_COST = 2500;

module.exports = { GROW_STAGES, STRAINS, WAREHOUSES, DIRT_COST, POT_COST };
