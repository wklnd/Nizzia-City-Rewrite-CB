const mongoose = require('mongoose');

// Stores the current APRs for bank deposit periods.
// Keep a single document (name = 'current') that we update over time.
const bankAprSchema = new mongoose.Schema({
  name: { type: String, default: 'current', unique: true },
  rates: {
    '1w': { type: Number, default: 0.04 }, // 4% APR
    '2w': { type: Number, default: 0.06 }, // 6% APR
    '1m': { type: Number, default: 0.10 }, // 10% APR
    '3m': { type: Number, default: 0.14 }, // 14% APR
    '6m': { type: Number, default: 0.18 }, // 18% APR
  },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('BankApr', bankAprSchema);
