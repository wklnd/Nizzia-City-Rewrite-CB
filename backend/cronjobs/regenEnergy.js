//regenEnergy.js
const mongoose = require('mongoose');
const Player = require('../models/Player');
const cron = require('node-cron');
require('dotenv').config();

// Energy regeneration logic
const regenEnergy = async () => {
  try {
    // DB-side capped increment: energy = min(energy + 5, energyMax) for those below max
    const res = await Player.updateMany(
      { $expr: { $lt: ['$energyStats.energy', '$energyStats.energyMax'] } },
      [ { $set: { 'energyStats.energy': { $min: [ { $add: ['$energyStats.energy', 5] }, '$energyStats.energyMax' ] } } } ]
    );
    const matched = res.matchedCount ?? res.n ?? 0;
    const modified = res.modifiedCount ?? res.nModified ?? 0;
    console.log(`Energy regeneration completed. updated=${modified} matched=${matched}`);
  } catch (error) {
    console.error('Error during energy regeneration:', error);
  }
};

// Schedule the energy regeneration to run every 10 minutes
const scheduleRegenEnergy = () => {
  cron.schedule('*/10 * * * *', () => {
    console.log('Running scheduled energy regeneration...');
    try {
      if (mongoose.connection.readyState !== 1) {
        console.warn('Skipping energy regen: DB not connected');
        return;
      }
    } catch (_) {}
    regenEnergy();
  });
};

module.exports = scheduleRegenEnergy;