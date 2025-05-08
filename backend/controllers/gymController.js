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
    const { id, happy, gymDots, energyPerTrain, perkBonus, statType, randomValue } = req.body;

    // Fetch the player by the `id` field
    const player = await Player.findOne({ id });
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

module.exports = { calculateStatGain, trainPlayer };