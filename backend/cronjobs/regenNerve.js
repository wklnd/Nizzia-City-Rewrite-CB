//regenNerve.js
const mongoose = require('mongoose');
const Player = require('../models/Player');
const cron = require('node-cron');
require('dotenv').config();

// Nerve regeneration logic
const regenNerve = async () => {
  try {
    const res = await Player.updateMany(
      { $expr: { $lt: ['$nerveStats.nerve', '$nerveStats.nerveMax'] } },
      [ { $set: { 'nerveStats.nerve': { $min: [ { $add: ['$nerveStats.nerve', 1] }, '$nerveStats.nerveMax' ] } } } ]
    );
    const matched = res.matchedCount ?? res.n ?? 0;
    const modified = res.modifiedCount ?? res.nModified ?? 0;
    console.log(`Nerve regeneration completed. updated=${modified} matched=${matched}`);
  } catch (error) {
    console.error('Error during nerve regeneration:', error);
  }
};

// Schedule the nerve regeneration to run every 5 minutes
const scheduleRegenNerve = () => {
  cron.schedule('*/5 * * * *', () => {
    console.log('Running scheduled nerve regeneration...');
    try {
      if (mongoose.connection.readyState !== 1) {
        console.warn('Skipping nerve regen: DB not connected');
        return;
      }
    } catch (_) {}
    regenNerve();
  });
};

module.exports = scheduleRegenNerve;