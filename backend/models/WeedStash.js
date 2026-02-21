const mongoose = require('mongoose');

// Tracks harvested weed in a player's stash (separate from main inventory).
// Each strain gets its own document so players can hold multiple strains.
const weedStashSchema = new mongoose.Schema({
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  strainId: { type: String, required: true },
  grams: { type: Number, default: 0, min: 0 },
});

weedStashSchema.index({ ownerId: 1, strainId: 1 }, { unique: true });

module.exports = mongoose.model('WeedStash', weedStashSchema);
