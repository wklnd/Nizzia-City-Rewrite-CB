const mongoose = require('mongoose');

const territorySchema = new mongoose.Schema({
  territoryId:   { type: String, required: true, unique: true },  // matches TERRITORIES config key
  region:        { type: String, required: true },

  // Control — who owns it
  controlledBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'Cartel', default: null },
  controlPower:  { type: Number, default: 0 },         // defending power stationed here

  // Contest — ongoing attacks
  contestedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'Cartel', default: null },
  contestMission:{ type: mongoose.Schema.Types.ObjectId, ref: 'CartelMission', default: null },

  // Dynamic market modifiers (fluctuate over time)
  demandMult:    { type: Number, default: 1.0 },        // multiplied with base demand
  heatMod:       { type: Number, default: 0 },           // additional heat from recent activity

  // Territory upgrades  { upgradeId: level }
  upgrades: {
    type: Map,
    of: Number,
    default: {},
  },

  lastUpdatedAt: { type: Date, default: Date.now },
});

territorySchema.index({ controlledBy: 1 });
territorySchema.index({ region: 1 });

module.exports = mongoose.model('Territory', territorySchema);
