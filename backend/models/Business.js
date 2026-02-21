const mongoose = require('mongoose');

const businessSchema = new mongoose.Schema({
  ownerId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  businessId:  { type: String, required: true },              // key from config (e.g. 'bar')
  name:        { type: String, required: true },               // display name (can be customized)
  level:       { type: Number, default: 0, min: 0, max: 5 },  // upgrade tier 0-5
  staff:       { type: Number, default: 0, min: 0 },           // hired employees
  pendingIncome: { type: Number, default: 0 },                 // uncollected $
  pendingTicks:  { type: Number, default: 0 },                 // ticks since last collect
  shutdownUntil: { type: Date, default: null },                // null = operational
  lastTickAt:    { type: Date, default: Date.now },
  acquiredAt:    { type: Date, default: Date.now },
});

// A player can own multiple of the same type, so no unique compound index
businessSchema.index({ ownerId: 1 });

module.exports = mongoose.model('Business', businessSchema);
