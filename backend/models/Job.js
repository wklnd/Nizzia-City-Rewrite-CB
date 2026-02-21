const mongoose = require('mongoose');

// ── Company (NPC-owned for now) ──
const CompanySchema = new mongoose.Schema({
  name:        { type: String, required: true },
  type:        { type: String, required: true },  // key from COMPANY_TYPES
  ownerId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // null = NPC
  ownerName:   { type: String, default: 'NPC' },
  rating:      { type: Number, default: 1, min: 1, max: 10 },
  employees:   [{ type: mongoose.Schema.Types.ObjectId, ref: 'Player' }],
  isNpc:       { type: Boolean, default: true },
}, { timestamps: true });

const Company = mongoose.model('Company', CompanySchema);

module.exports = { Company };