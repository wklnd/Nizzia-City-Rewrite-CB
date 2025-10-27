const gymService = require('../services/gymService');
const Player = require('../models/Player'); 

const calculateStatGain = (req, res) => {
  try {
    const { statTotal, happy, gymDots, energyPerTrain, perkBonus, statType, randomValue } = req.body;

    const gain = gymService.calculateGain({
      statTotal,
      happy,
      gymDots,
      energyPerTrain,
      perkBonus,
      statType,
      randomValue,
    });

    res.json({ gain });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const trainPlayer = async (req, res) => {
  try {
    const { id, userId, happy, gymDots, energyPerTrain, perkBonus, statType, randomValue } = req.body;

    // Build a robust query: try numeric id first; if missing or not found, try userId
    let player = null;
    if (typeof id !== 'undefined' && id !== null) {
      const idNum = Number(id);
      if (!Number.isNaN(idNum)) {
        player = await Player.findOne({ id: idNum });
      }
    }
    if (!player && userId) {
      player = await Player.findOne({ user: userId });
    }
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    // Ensure the player has enough energy to train
    if (player.energyStats.energy < energyPerTrain) {
      return res.status(400).json({ error: 'Not enough energy to train' });
    }

    // Calculate the stat gain
    const gain = gymService.calculateGain({
      statTotal: player.battleStats[statType],
      happy,
      gymDots,
      energyPerTrain,
      perkBonus,
      statType,
      randomValue,
    });

    // Update the player's stats
    player.battleStats[statType] += parseFloat(gain);

    // Deduct energy used for training
    player.energyStats.energy -= energyPerTrain;

    // Save the updated player
    await player.save();

    res.json({
      message: 'Player trained successfully',
      updatedStats: player.battleStats,
      remainingEnergy: player.energyStats.energy,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const addStats = async (req, res) => {
  try {
    const { id, userId, statType, amount } = req.body;

    let player = null;
    if (typeof id !== 'undefined' && id !== null) {
      const idNum = Number(id);
      if (!Number.isNaN(idNum)) {
        player = await Player.findOne({ id: idNum });
      }
    }
    if (!player && userId) {
      player = await Player.findOne({ user: userId });
    }
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    // Add the specified amount to the chosen stat
    player.battleStats[statType] = (player.battleStats[statType] || 0) + parseFloat(amount);

    // Save the updated player
    await player.save();

    res.json({
      message: `Added ${amount} to ${statType}`,
      updatedStats: player.battleStats,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};


const removeStats = async (req, res) => {
  try {
    const { id, userId, statType, amount } = req.body;

    let player = null;
    if (typeof id !== 'undefined' && id !== null) {
      const idNum = Number(id);
      if (!Number.isNaN(idNum)) {
        player = await Player.findOne({ id: idNum });
      }
    }
    if (!player && userId) {
      player = await Player.findOne({ user: userId });
    }
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    // Remove the specified amount to the chosen stat
    player.battleStats[statType] = Math.max(0, (player.battleStats[statType] || 0) - parseFloat(amount));
    // Save the updated player
    await player.save();

    res.json({
      message: `Removed ${amount} to ${statType}`,
      updatedStats: player.battleStats,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};  


module.exports = { calculateStatGain, trainPlayer, addStats, removeStats };