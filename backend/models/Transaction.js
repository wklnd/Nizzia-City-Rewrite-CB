const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  // The player this transaction belongs to
  player: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', required: true, index: true },

  // Transaction type — broad category
  type: {
    type: String,
    enum: [
      'transfer_in',     // received from another player
      'transfer_out',    // sent to another player
      'crime',           // income from crimes
      'job',             // job paycheck
      'casino_win',      // casino winnings
      'casino_loss',     // casino losses
      'sale',            // sold items/drugs on market
      'purchase',        // bought items/drugs from market
      'bank_deposit',    // deposited into bank
      'bank_withdraw',   // withdrew from bank (includes interest)
      'business',        // business income/expenses
      'cartel',          // cartel income/expenses
      'stock_buy',       // bought stocks
      'stock_sell',      // sold stocks
      'property',        // real estate purchases/upkeep
      'gym',             // gym fees
      'hospital',        // hospital/medical costs
      'other',           // catch-all
    ],
    required: true,
  },

  // Amount (positive = gained money, negative = lost money)
  amount: { type: Number, required: true },

  // Balance AFTER this transaction
  balanceAfter: { type: Number, default: 0 },

  // Human-readable description
  description: { type: String, default: '' },

  // For transfers: the other player involved
  otherPlayer: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', default: null },

  // Optional metadata (crime name, item name, stock symbol, etc.)
  meta: { type: mongoose.Schema.Types.Mixed, default: {} },

}, { timestamps: true });

// Index for efficient queries: player + newest first
transactionSchema.index({ player: 1, createdAt: -1 });

module.exports = mongoose.model('Transaction', transactionSchema);
