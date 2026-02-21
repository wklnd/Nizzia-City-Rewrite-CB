const mongoose = require('mongoose');

const cartelNpcSchema = new mongoose.Schema({
  cartelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Cartel', required: true },
  ownerId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // Identity
  name:      { type: String, required: true },
  role:      { type: String, required: true, enum: ['dealer', 'mule', 'bodyguard', 'hitman', 'enforcer'] },
  rarity:    { type: String, default: 'common', enum: ['common', 'uncommon', 'rare', 'epic', 'legendary'] },

  // Stats (0-100 scale)
  stats: {
    combat:       { type: Number, default: 10 },
    stealth:      { type: Number, default: 10 },
    charisma:     { type: Number, default: 10 },
    intelligence: { type: Number, default: 10 },
    speed:        { type: Number, default: 10 },
  },

  // Progression
  level:       { type: Number, default: 1 },
  xp:          { type: Number, default: 0 },
  loyalty:     { type: Number, default: 70 },      // 0-100

  // Assignment
  assignedTo:  { type: String, default: null },     // territoryId or null (HQ)
  missionId:   { type: mongoose.Schema.Types.ObjectId, ref: 'CartelMission', default: null },

  // Status
  status:      { type: String, default: 'idle', enum: ['idle', 'on_mission', 'injured', 'arrested', 'dead'] },
  recoversAt:  { type: Date, default: null },       // for injured status
  arrestedAt:  { type: Date, default: null },        // for arrested status (can bail out)

  // Salary
  salaryOwed:  { type: Number, default: 0 },         // unpaid salary accumulates

  hiredAt:     { type: Date, default: Date.now },
});

cartelNpcSchema.index({ cartelId: 1 });
cartelNpcSchema.index({ ownerId: 1 });
cartelNpcSchema.index({ status: 1 });

module.exports = mongoose.model('CartelNPC', cartelNpcSchema);
