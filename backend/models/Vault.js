const mongoose = require('mongoose');

// The schema for vaults. Here the player can store money securely, without the risk of losing it in crimes or other activities.
const vaultSchema = new mongoose.Schema({
  playerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', required: true, unique: true },
  balance: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Vault', vaultSchema);