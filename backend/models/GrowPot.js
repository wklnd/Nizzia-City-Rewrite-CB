const mongoose = require('mongoose');

// A GrowPot represents one active (or empty) pot inside a player's warehouse.
// Each pot can hold one plant at a time and tracks its growth progress.
const growPotSchema = new mongoose.Schema({
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  potIndex: { type: Number, required: true },          // 0-based slot index
  strainId: { type: String, default: null },            // null = empty pot
  stage: { type: String, enum: ['seedling', 'vegetative', 'flowering', 'ready', null], default: null },
  plantedAt: { type: Date, default: null },             // when the seed was planted
  stageStartedAt: { type: Date, default: null },        // when the current stage began
  harvestedAt: { type: Date, default: null },           // when the plant was harvested (for history)
});

// Compound index: one pot per slot per player
growPotSchema.index({ ownerId: 1, potIndex: 1 }, { unique: true });

module.exports = mongoose.model('GrowPot', growPotSchema);
