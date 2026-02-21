const mongoose = require('mongoose');

const cartelMissionSchema = new mongoose.Schema({
  cartelId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Cartel', required: true },
  ownerId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  type:         { type: String, required: true, enum: ['delivery', 'attack', 'seize', 'defend', 'assassination', 'corruption', 'sabotage', 'smuggling', 'intimidation'] },

  // NPCs assigned to this mission
  npcIds:       [{ type: mongoose.Schema.Types.ObjectId, ref: 'CartelNPC' }],

  // Target info
  fromTerritory: { type: String, default: null },    // for deliveries
  toTerritory:   { type: String, default: null },     // destination / target territory
  targetCartel:  { type: mongoose.Schema.Types.ObjectId, ref: 'Cartel', default: null },
  targetNpc:     { type: mongoose.Schema.Types.ObjectId, ref: 'CartelNPC', default: null }, // for assassination

  // Payload (for deliveries)
  payload: [{
    drugId:   { type: String },
    quantity: { type: Number },
  }],

  // Timing
  startedAt:    { type: Date, default: Date.now },
  completesAt:  { type: Date, required: true },
  completedAt:  { type: Date, default: null },

  // Outcome (filled on completion)
  status:       { type: String, default: 'active', enum: ['active', 'completed', 'failed', 'cancelled'] },
  outcome: {
    success:      { type: Boolean, default: null },
    attackPower:  { type: Number, default: 0 },
    defensePower: { type: Number, default: 0 },
    moneyGained:  { type: Number, default: 0 },
    moneyLost:    { type: Number, default: 0 },
    productGained:{ type: Number, default: 0 },
    productLost:  { type: Number, default: 0 },
    casualties:   [{ npcId: mongoose.Schema.Types.ObjectId, result: String }],  // 'dead', 'injured', 'arrested'
    repGained:    { type: Number, default: 0 },
    heatGained:   { type: Number, default: 0 },
    log:          [{ type: String }],  // human-readable event log
  },
});

cartelMissionSchema.index({ cartelId: 1, status: 1 });
cartelMissionSchema.index({ completesAt: 1, status: 1 }); // for cron to find ready missions
cartelMissionSchema.index({ ownerId: 1 });

module.exports = mongoose.model('CartelMission', cartelMissionSchema);
