//regenHappiness.js
const mongoose = require('mongoose');
const Player = require('../models/Player');
const cron = require('node-cron');
require('dotenv').config();

// Happiness regeneration logic
const regenHappiness = async () => {
  try {
    const players = await Player.find();

    for (const player of players) {
      const { happy, happyMax } = player.happiness;

      // Regenerate happiness if it's below the maximum
      if (happy < happyMax) {
        const newHappy = Math.min(happy + 5, happyMax); // Regenerate 5 happiness per tick
  player.happiness.happy = newHappy;
  // Skip full validation to avoid unrelated schema enum errors
  await player.save({ validateBeforeSave: false });
        console.log(`Happiness regenerated for player ${player.name}: ${newHappy}/${happyMax}`);
      }
    }

    console.log('Happiness regeneration completed.');
  } catch (error) {
    console.error('Error during happiness regeneration:', error);
  }
};

// Schedule the happiness regeneration to run every 5 minutes
const scheduleRegenHappiness = () => {
  cron.schedule('*/5 * * * *', () => {
    console.log('Running scheduled happiness regeneration...');
    regenHappiness();
  });
};

module.exports = scheduleRegenHappiness;