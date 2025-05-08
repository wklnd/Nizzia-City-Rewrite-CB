//regenEnergy.js
const mongoose = require('mongoose');
const Player = require('../models/Player');
const cron = require('node-cron');
require('dotenv').config();

// Energy regeneration logic
const regenEnergy = async () => {
  try {
    const players = await Player.find();

    for (const player of players) {
      const { energy, energyMax } = player.energyStats;

      // Regenerate energy if it's below the maximum
      if (energy < energyMax) {
        const newEnergy = Math.min(energy + 5, energyMax); // Regenerate 5 energy per tick
        player.energyStats.energy = newEnergy;
        await player.save();
        console.log(`Energy regenerated for player ${player.name}: ${newEnergy}/${energyMax}`);
      }
    }

    console.log('Energy regeneration completed.');
  } catch (error) {
    console.error('Error during energy regeneration:', error);
  }
};

// Schedule the energy regeneration to run every 10 minutes
const scheduleRegenEnergy = () => {
  cron.schedule('*/10 * * * *', () => {
    console.log('Running scheduled energy regeneration...');
    regenEnergy();
  });
};

module.exports = scheduleRegenEnergy;