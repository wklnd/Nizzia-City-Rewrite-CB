const mongoose = require('mongoose');

const cartelSchema = new mongoose.Schema({
  ownerId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  name:      { type: String, required: true, minlength: 2, maxlength: 30 },

  // Progression
  reputation:    { type: Number, default: 0 },   // cumulative XP → drives rep level
  repLevel:      { type: Number, default: 0 },    // cached level from REP_LEVELS

  // Economy
  treasury:      { type: Number, default: 0 },    // cartel cash (separate from player wallet)

  // Heat / law enforcement
  heat:          { type: Number, default: 0 },     // 0-100+, triggers busts above threshold
  bustedUntil:   { type: Date, default: null },     // if set, operations frozen

  // Drug inventory  { drugId: quantity }
  inventory: [{
    drugId:   { type: String, required: true },
    quantity: { type: Number, default: 0 },
    quality:  { type: Number, default: 50 },       // avg quality of this stock
  }],

  // Labs  (embedded — max ~5 total)
  labs: [{
    labId:       { type: String, required: true },  // matches LABS config key
    territoryId: { type: String, required: true },  // where the lab is built
    level:       { type: Number, default: 1 },
    producing:   { type: String, default: null },   // drugId currently cooking, or null
    batchStartedAt: { type: Date, default: null },
    batchesCompleted: { type: Number, default: 0 },
  }],

  // Timestamps
  lastTickAt:  { type: Date, default: Date.now },
  createdAt:   { type: Date, default: Date.now },
});

cartelSchema.index({ repLevel: -1 }); // leaderboard

module.exports = mongoose.model('Cartel', cartelSchema);
