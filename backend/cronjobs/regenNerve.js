//regenNerve.js
const mongoose = require('mongoose');
const Player = require('../models/Player');
const cron = require('node-cron');
require('dotenv').config();

// Nerve regeneration logic
const regenNerve = async () => {
  try {
    const players = await Player.find();

    for (const player of players) {
      const { nerve, nerveMax } = player.nerveStats;

      // Regenerate nerve if it's below the maximum
      if (nerve < nerveMax) {
        const newNerve = Math.min(nerve + 1, nerveMax); // Regenerate 1 nerve per tick
        player.nerveStats.nerve = newNerve;
        await player.save();
        console.log(`Nerve regenerated for player ${player.name}: ${newNerve}/${nerveMax}`);
      }
    }

    console.log('Nerve regeneration completed.');
  } catch (error) {
    console.error('Error during nerve regeneration:', error);
  }
};

// Schedule the nerve regeneration to run every 5 minutes
const scheduleRegenNerve = () => {
  cron.schedule('*/5 * * * *', () => {
    console.log('Running scheduled nerve regeneration...');
    regenNerve();
  });
};

module.exports = scheduleRegenNerve;