const mongoose = require('mongoose');

const stockPriceSchema = new mongoose.Schema({
  symbol: { type: String, required: true, index: true },
  price: { type: Number, required: true },
  ts: { type: Date, required: true, index: true }
  
});

// TTL index optional: keep 90 days of minute bars if desired (disabled by default)
// stockPriceSchema.index({ ts: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });

module.exports = mongoose.model('StockPrice', stockPriceSchema);
