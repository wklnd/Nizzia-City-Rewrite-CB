const mongoose = require('mongoose');

// Counter schema to keep track of sequential IDs for player model. 

const propertySchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  cost: { type: Number, required: true },
  upkeep: { type: Number, required: true },
  baseHappyMax: { type: Number, required: true },
  upgradeLimits: { type: Map, of: Number, required: true },
  market: { type: Boolean, default: true }, // whether property is available on market
});

const propertyUpgradeSchema = new mongoose.Schema({
    property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
    upgrades: { type: Map, of: Number, default: {} }, // upgrade id -> current level
    cost: { type: Number, required: true },
    bonus: { type: Object, required: true }, // bonus effects of the upgrade
});

module.exports = {
    Property: mongoose.model('Property', propertySchema),
    PropertyUpgrade: mongoose.model('PropertyUpgrade', propertyUpgradeSchema),
};
