const mongoose = require('mongoose');

const stockEventSchema = new mongoose.Schema({
  symbol: { type: String, required: true, index: true },
  type: { type: String, enum: ['crash', 'rocket'], required: true },
  baselinePrice: { type: Number, required: true }, // price before event
  createdAt: { type: Date, default: Date.now, index: true },
  resolved: { type: Boolean, default: false, index: true },
});

module.exports = mongoose.model('StockEvent', stockEventSchema);
