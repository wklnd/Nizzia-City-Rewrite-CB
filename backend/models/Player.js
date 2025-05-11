const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  id: { type: String, required: true, unique: true },
  gender: { type: String, enum: ["Male", "Female", "Enby"], required: true },
  age: { type: Number, default: 0 }, // Day since registration
  level: { type: Number, default: 1 }, // Player level
  exp: { type: Number, default: 0 }, // Player experience

  money: { type: Number, default: 0 }, // Player money
  points: { type: Number, default: 0 }, // Player points

  energyStats: { 
    energy: { type: Number, default: 100 }, // This is the current value of energy, should be calculated based on items, homes, etc
    energyMax: { type: Number, default: 100 }, // This can increase with items, homes, etc
    energyMaxCap: { type: Number, default: 150 }, // This can't increase.
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
});

module.exports = mongoose.model('Player', playerSchema);