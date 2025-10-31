// Property catalog and upgrades
// Each property defines cost, baseHappyMax, and upgrade limits

const PROPERTIES = {
  trailer: {
    id: 'trailer',
    name: 'Trailer',
    cost: 0,
    upkeep: 250,
    baseHappyMax: 150,
    upgradeCapacity: 3,
    upgradeLimits: { hot_tub: 1, home_theater: 1, garden: 1 },
  },
  apartment: {
    id: 'apartment',
    name: 'City Apartment',
    cost: 250000,
    upkeep: 2500,
    baseHappyMax: 200,
    upgradeCapacity: 3,
    upgradeLimits: { hot_tub: 1, home_theater: 1, garden: 1 },
  },
  house: {
    id: 'house',
    name: 'Suburban House',
    cost: 2500000,
    upkeep: 10000,
    baseHappyMax: 300,
    upgradeCapacity: 3,
    upgradeLimits: { hot_tub: 1, home_theater: 1, garden: 1 },
  },
  villa: {
    id: 'villa',
    name: 'Luxury Villa',
    cost: 50000000,
    upkeep: 50000,
    baseHappyMax: 500,
    upgradeCapacity: 3,
    upgradeLimits: { hot_tub: 1, home_theater: 1, garden: 1 },
  },
  private_island: {
    id: 'private_island',
    name: 'Private Island',
    cost: 500000000,
    upkeep: 100000,
    baseHappyMax: 2000,
    upgradeCapacity: 3,
    upgradeLimits: { hot_tub: 1, home_theater: 1, garden: 1 },
  },
  silo: {
    id: 'silo',
    name: 'Silo',
    cost: 5000000000,
    upkeep: 1000000,
    baseHappyMax: 8000,
    upgradeCapacity: 3,
    upgradeLimits: { hot_tub: 1, home_theater: 1, garden: 1 },
  },
};

// Upgrade definitions shared by properties
// cost(level) and bonus(level) return values for the given next level (1-indexed)
const UPGRADES = {
  hot_tub: {
    id: 'hot_tub',
    name: 'Hot Tub',
    cost: (level) => 250000 * level, // escalating
    bonus: (level) => ({ happyMax: 25 * level }),
  },
  home_theater: {
    id: 'home_theater',
    name: 'Home Theater',
    cost: (level) => 500000 * level,
    bonus: (level) => ({ happyMax: 40 * level }),
  },
  garden: {
    id: 'garden',
    name: 'Zen Garden',
    cost: (level) => 150000 * level,
    bonus: (level) => ({ happyMax: 15 * level }),
  },
  vault: {
    id: 'vault',
    name: 'Secure Vault',
    cost: (level) => 1000000 * level,
    bonus: (level) => ({happyMax: 2500 * level }),
    },
  airstrip: {
    id: 'airstrip',
    name: 'Airstrip',
    cost: (level) => 90000000 * level,
    bonus: (level) => ({happyMax: 5500 * level }),
    },

    
};

module.exports = { PROPERTIES, UPGRADES };
