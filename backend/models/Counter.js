const mongoose = require('mongoose');

// Counter schema to keep track of sequential IDs for player model. 

const counterSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  seq: { type: Number, default: 0 }
});

module.exports = mongoose.model('Counter', counterSchema);
