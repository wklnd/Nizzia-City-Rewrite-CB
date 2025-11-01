const mongoose = require('mongoose');

// Schema to awards available to players.

const awardSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    description: { type: String, required: true },
    criteria: { type: Object, required: true }, // criteria to earn the award
    reward: { type: Object, required: true }, // reward for earning the award
    titleReward: { type: String }, // optional title reward for earning the award
    icon: { type: String, required: true }, // icon representing the award
});

module.exports = mongoose.model('Award', awardSchema);