const mongoose = require('mongoose');

const petMarketSchema = new mongoose.Schema({
  pet: { type: mongoose.Schema.Types.ObjectId, ref: 'Pets', required: true },
  price: { type: Number, required: true },
  sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', required: true },
}, { timestamps: true });

module.exports = mongoose.model('PetMarket', petMarketSchema);
