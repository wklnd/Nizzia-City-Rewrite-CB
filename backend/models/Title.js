const mongoose = require('mongoose');

// Schema for Player Titles.

const titleSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    titleText: { type: String, required: true },
    criteria: { type: Object, required: false }, // criteria to earn the title , should match the Award criteria if applicable.
});

module.exports = mongoose.model('Title', titleSchema);