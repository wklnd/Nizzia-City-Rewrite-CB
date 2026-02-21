const mongoose = require('mongoose');

// A Warehouse represents a player's grow facility.
// Each player can own exactly one warehouse at a time (upgrade by buying a better one).
const warehouseSchema = new mongoose.Schema({
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  type: { type: String, required: true },       // warehouse id from config (e.g., 'shed')
  pots: { type: Number, default: 0 },           // number of pots the player has purchased (up to maxPots)
  acquiredAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Warehouse', warehouseSchema);
