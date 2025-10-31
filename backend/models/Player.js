const mongoose = require('mongoose');
const playerTitles = require('../config/playerTitles');

const playerSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  id: { type: Number, required: true, unique: true },
  // Allow common synonyms to avoid validation failures on older records
  gender: { type: String, enum: ["Male", "Female", "Enby"], required: true },
  age: { type: Number, default: 0 }, // Day since registration
  level: { type: Number, default: 1 }, // Player level
  exp: { type: Number, default: 0 }, // Player experience
  npc : { type: Boolean, default: false }, // Is this player an NPC

  crimeExp: { type: Number, default: 0 }, // Experience earned from crimes
  crimesCommitted: { type: Number, default: 0 }, // Total crimes committed
  crimesSuccessful: { type: Number, default: 0 }, // Successful crimes
  crimesCriticalFails: { type: Number, default: 0 }, // Critical fails
  crimesFails: { type: Number, default: 0 }, // Failed crimes

  crimesXpList: [
    {
      crimeId: { type: String, required: true },
      exp: { type: Number, default: 0 }
    }
  ],

  health: { type: Number, default: 100, min: 0, max: 9999 },
  hospitalized: { type: Boolean, default: false },
  hospitalTime: { type: Number, default: 0 }, // seconds remaining
  jailed: { type: Boolean, default: false },
  jailTime: { type: Number, default: 0 }, // seconds remaining

  money: { type: Number, default: 1000 }, // Player money
  points: { type: Number, default: 30 }, // Player points (premium currency)
  merits : { type: Number, default: 0 }, // Player merits (earned currency)

  // Seasonal currencies
  xmasCoins: { type: Number, default: 0 },
  halloweenCoins: { type: Number, default: 0 },
  easterCoins: { type: Number, default: 0 },


  playerStatus: { type: String, enum: ["Active", "Banned", "Suspended", "Abandoned"], default: "Active" },
  playerTitle: { type: String, enum: playerTitles, default: "New gun on the block" },
  playerRole: { type: String, enum: ["Player", "Moderator", "Admin", "Developer"], default: "Player" },



  energyStats: { 
    energy: { type: Number, default: 100 }, // This is the current value of energy, should be calculated based on items, homes, etc
    energyMax: { type: Number, default: 100 }, // This can increase with items, homes, etc
    energyMaxCap: { type: Number, default: 150 }, // This can't increase. Max cap only when the user buys premium
    energyMin: { type: Number, default: 0 }, // Lowest value of energy
  },
  nerveStats: {
    nerve: { type: Number, default: 20 }, // This is the current value of nerve, should be calculated based on items, homes, etc
    nerveMax: { type: Number, default: 20 }, // This can increase with items, homes, etc
    nerveMaxCap: { type: Number, default: 125 }, // This can't increase.
    nerveMin: { type: Number, default: 0 }, // Lowest value of nerve
  },
  happiness:{
    happy: { type: Number, default: 100 }, // This is the current value of happiness, should be calculated based on items, homes, etc
    happyMax: { type: Number, default: 150 }, // This can increase with items, homes, etc
    happyMaxCap: { type: Number, default: 99999 }, // This can't increase.
    happyMin: { type: Number, default: 0 }, // Lowest value of happiness
  },

  battleStats: {
    strength: { type: Number, default: 0 },
    speed: { type: Number, default: 0 },
    dexterity: { type: Number, default: 0 },
    defense: { type: Number, default: 0 },
  },
  workStats: {
    manuallabor: { type: Number, default: 0 },
    intelligence: { type: Number, default: 0 },
    endurance: { type: Number, default: 0 },
    employeEfficiency: { type: Number, default: 0 },
  },
  addiction: {type: Number, default: 0 }, // This is the current value of addiction, increase with drugs

  cooldowns: {
    medicalCooldown: { type: Number, default: 0 }, // This is the current value of medical cooldown, increase with drugs
    drugCooldown: { type: Number, default: 0 }, // This is the current value of drug cooldown, increase with drugs
    boosterCooldown: { type: Number, default: 0 }, // This is the current value of booster cooldown, increase with drugs
  },

  job: {
    jobId: { type: String, default: null }, 
    jobRank: { type: Number, default: 0 }, 
    jobPoints: { type: Number, default: 0 }, 
  },
  
  // Inventory: list of items with quantities
  inventory: [
    {
      item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
      qty: { type: Number, default: 1, min: 0 }
    }
  ],

  // Stock portfolio holdings
  portfolio: [
    {
      symbol: { type: String, required: true },
      shares: { type: Number, default: 0, min: 0 },
      avgPrice: { type: Number, default: 0, min: 0 }
    }
  ],

  // Casino-related state
  casino: {
    // Legacy single timestamp (kept for backward compatibility)
    lastSpinAt: { type: Date, default: null },
    // Per-wheel last spin times; key is wheel id (e.g., 'wheelLame')
    lastSpins: { type: Map, of: Date, default: {} },
  },

  // Real estate: owned properties and current home
  properties: [
    {
      propertyId: { type: String, required: true },
      upgrades: { type: Map, of: Number, default: {} },
      lastUpkeepPaidAt: { type: Date, default: null },
      lastUpkeepAccruedAt: { type: Date, default: null },
      upkeepDue: { type: Number, default: 0 },
      acquiredAt: { type: Date, default: Date.now },
    }
  ],
  home: { type: String, default: 'trailer' },
});

module.exports = mongoose.model('Player', playerSchema);