// backend/models/Item.js
const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['weapon', 'armor', 'medicine', 'alchool', 'enhancers', 'clothes', 'tools', 'drugs', 'collectibles'], required: true },
  type2: { type: String, enum: ['primaryWeapon', 'secondaryWeapon', 'meleeWeapon', 'head','torso', 'pants', 'shoes', 'legs'] }, // Only for armor, clothes and weapons
  description: { type: String }, // for everything
  effect: { type: mongoose.Schema.Types.Mixed }, // e.g. { strength: +10 } // drugs, alcohol, enhancers, medicine
  overdoseEffect : { type: mongoose.Schema.Types.Mixed}, // { happy: -10000 } // drugs and alcohol
  passiveEffect: { type: mongoose.Schema.Types.Mixed }, // e.g. { pickpocket: 0.1 } // only for tools, collectibles 
  damage: { type: Number, default: 0 }, // only for weapons
  armor: { type: Number, default: 0 }, // only for armor
  quality: { type: Number, default: 0 }, // only for armor, weapons
  coverage: { type: Number, default: 100 }, // only for armor
  price: { type: Number, default: 0 }, // for all items
  sellable: { type: Boolean, default: true }, // for all items
  usable: { type: Boolean, default: false } 
});

module.exports = mongoose.model('Item', itemSchema);