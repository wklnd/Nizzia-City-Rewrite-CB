const mongoose = require('mongoose');

const propertyMarketSchema = new mongoose.Schema({
  propertyId: { type: String, required: true },
  upgrades: { type: Object, default: {} },
  price: { type: Number, required: true },
  sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', required: true },
}, { timestamps: true });

module.exports = mongoose.model('PropertyMarket', propertyMarketSchema);
