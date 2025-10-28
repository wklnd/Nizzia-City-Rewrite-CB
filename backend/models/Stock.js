const mongoose = require('mongoose');

const stockSchema = new mongoose.Schema({
    symbol: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    description: { type: String, required: true },
    initialPrice: { type: Number, required: true },
    avgYieldPerYear: { type: Number, required: true }, // e.g., 0.10 = 10%/year
    volatility: { type: Number, required: true }, // e.g., 0.30 = 30%/year
    decimals: { type: Number, required: true },
    dividend: {
        type: { type: String, enum: ['money', 'item', 'bonus', 'stock'] }, // what type of dividend
        dividendAmount: { type: Number, required: true }, // amount per share per year
        itemRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Item' }, // if type is item, reference to item
        bonusAmount: { type: Number }, // if type is bonus type of bonus, e.g. extra banking interest
        stockSymbol: { type: String }, // if type is stock, symbol of stock given as dividend
        dividendFrequency: { type: Number, default: 365 }, // how often dividends are paid (in days)
  },
});