//regenHappiness.js
const mongoose = require('mongoose');
const Player = require('../models/Player');
const cron = require('node-cron');
require('dotenv').config();

// Happiness regeneration logic
const regenHappiness = async () => {
  try {
    const res = await Player.updateMany(
      { $expr: { $lt: ['$happiness.happy', '$happiness.happyMax'] } },
      [ { $set: { 'happiness.happy': { $min: [ { $add: ['$happiness.happy', 5] }, '$happiness.happyMax' ] } } } ]
    );
    const matched = res.matchedCount ?? res.n ?? 0;
    const modified = res.modifiedCount ?? res.nModified ?? 0;
    console.log(`Happiness regeneration completed. updated=${modified} matched=${matched}`);
  } catch (error) {
    console.error('Error during happiness regeneration:', error);
  }
};

// Schedule the happiness regeneration to run every 5 minutes
const scheduleRegenHappiness = () => {
  cron.schedule('*/5 * * * *', () => {
    console.log('Running scheduled happiness regeneration...');
    try {
      if (mongoose.connection.readyState !== 1) {
        console.warn('Skipping happiness regen: DB not connected');
        return;
      }
    } catch (_) {}
    regenHappiness();
  });
};

module.exports = scheduleRegenHappiness;