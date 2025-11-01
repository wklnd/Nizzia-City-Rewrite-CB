const mongoose = require('mongoose');

const itemMarketSchema = new mongoose.Schema({
    itemId: { type: String, required: true },
    price: { type: Number, required: true },
    amountAvailable: { type: Number, required: true },
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', required: true },
});

module.exports = mongoose.model('ItemMarket', itemMarketSchema);
