const gymService = require('../services/gymService');
const Player = require('../models/Player'); 
const { GYMS, getGymById } = require('../config/gym');

// Helper: build player by id or userId
async function findPlayerByIdOrUser({ id, userId }){
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
  return player;
}

// Helper: get selected gym for player
function getSelectedGymFor(player){
  const sel = Number(player?.gym?.selectedGymId || 1);
  return getGymById(sel) || getGymById(1);
}

// Helper: check if a gym trains a given stat
function gymTrainsStat(gym, statType){
  if (!gym) return false;
  const g = gym.gains || {};
  const val = g[statType];
  return typeof val === 'number' && val > 0;
}

const calculateStatGain = async (req, res) => {
  try {
    const { userId, id, statType, energyPerTrain: energyPerTrainRaw } = req.body;

    // New flow: compute from player's selected gym
    if (userId || typeof id !== 'undefined'){
      const player = await findPlayerByIdOrUser({ id, userId });
      if (!player) return res.status(404).json({ error: 'Player not found' });
      const gym = getSelectedGymFor(player);
      if (!gymTrainsStat(gym, statType)) {
        return res.status(400).json({ error: `This gym does not train ${statType}.` });
      }
      // Allow player to choose how much energy to spend per train (not locked to gym)
      let energyPerTrain = Math.floor(Number(energyPerTrainRaw ?? 1));
      if (!Number.isFinite(energyPerTrain) || energyPerTrain < 1) energyPerTrain = 1;
      // Do NOT cap to current energy for calculation; user may want to preview hypothetical gains
      const gymDots = Number(gym.gains[statType] || 1);
      const gain = gymService.calculateGain({
        statTotal: player.battleStats[statType] || 0,
        happy: Number(player.happiness?.happy || 0),
        gymDots,
        energyPerTrain,
        perkBonus: 0,
        statType,
        randomValue: 0,
      });
      return res.json({ gain, meta: { gymId: gym.id, gymName: gym.name, gymDots, energyPerTrain } });
    }

    // Backward compatible: old flow using explicit values
    const { statTotal, happy, gymDots, energyPerTrain, perkBonus, statType: oldStatType, randomValue } = req.body;
    const gain = gymService.calculateGain({
      statTotal,
      happy,
      gymDots,
      energyPerTrain,
      perkBonus,
      statType: oldStatType,
      randomValue,
    });
    return res.json({ gain });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const trainPlayer = async (req, res) => {
  try {
    const { id, userId, statType, energyPerTrain: energyPerTrainRaw } = req.body;

    const player = await findPlayerByIdOrUser({ id, userId });
    if (!player) return res.status(404).json({ error: 'Player not found' });

    const gym = getSelectedGymFor(player);
    if (!gymTrainsStat(gym, statType)) {
      return res.status(400).json({ error: `This gym does not train ${statType}.` });
    }

    // Variable energy per train (user-controlled)
    let energyPerTrain = Math.floor(Number(energyPerTrainRaw ?? 1));
    if (!Number.isFinite(energyPerTrain) || energyPerTrain < 1) energyPerTrain = 1;
    // Ensure the player has enough energy to train
    if (player.energyStats.energy < energyPerTrain) {
      return res.status(400).json({ error: 'Not enough energy to train' });
    }

    const gain = gymService.calculateGain({
      statTotal: player.battleStats[statType] || 0,
      happy: Number(player.happiness?.happy || 0),
      gymDots: Number(gym.gains[statType] || 1),
      energyPerTrain,
      perkBonus: 0,
      statType,
      randomValue: 0,
    });

    // Update the player's stats
    player.battleStats[statType] = (player.battleStats[statType] || 0) + parseFloat(gain);

  // Deduct energy used for training and accumulate energy spent
  player.energyStats.energy -= energyPerTrain;
  player.gym = player.gym || {};
  player.gym.energySpent = Number(player.gym.energySpent || 0) + energyPerTrain;

    // Reduce happiness based on energy spent (clamped to 0)
    if (player.happiness && typeof player.happiness.happy === 'number') {
      const happinessCost = Math.max(1, Math.floor(energyPerTrain));
      player.happiness.happy = Math.max(0, player.happiness.happy - happinessCost);
    }

    await player.save();

    res.json({
      message: 'Player trained successfully',
      updatedStats: player.battleStats,
      remainingEnergy: player.energyStats.energy,
      remainingHappiness: player.happiness?.happy,
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
// New endpoints: catalog, unlock, select

const getCatalog = async (req, res) => {
  try {
    const { userId, id } = req.query;
    const player = await findPlayerByIdOrUser({ id, userId });
    if (!player) return res.status(404).json({ error: 'Player not found' });
    const unlocked = (player.gym?.unlocked || [1]).map(Number);
    const selectedGymId = Number(player.gym?.selectedGymId || 1);
    const maxUnlocked = unlocked.length ? Math.max(...unlocked) : 1;
    const energySpent = Number(player.gym?.energySpent || 0);

    const gyms = GYMS.map(g => {
      // Determine required energy for unlocking this gym (previous gym's threshold)
      const prev = getGymById(g.id - 1);
      const requiredEnergy = prev?.estEnergyNext || null;
      const isNext = g.id === maxUnlocked + 1;
      const unlockable = isNext && (!requiredEnergy || energySpent >= requiredEnergy) && (player.money >= g.unlockCost);
      return ({
      id: g.id,
      tier: g.tier,
      name: g.name,
      unlockCost: g.unlockCost,
      energyPerTrain: g.energyPerTrain,
      gains: g.gains,
      estEnergyNext: g.estEnergyNext,
        locked: !unlocked.includes(g.id),
        requiredEnergy,
        energySpent,
        isNext,
        unlockable,
      });
    });
    return res.json({ gyms, selectedGymId, money: player.money, energySpent, maxUnlocked });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const unlockGym = async (req, res) => {
  try {
    const { userId, id, gymId } = req.body;
    const player = await findPlayerByIdOrUser({ id, userId });
    if (!player) return res.status(404).json({ error: 'Player not found' });
    const gym = getGymById(gymId);
    if (!gym) return res.status(400).json({ error: 'Invalid gym id' });
  const unlockedArr = (player.gym?.unlocked || [1]).map(Number);
  const unlocked = new Set(unlockedArr);
  if (unlocked.has(gym.id)) return res.status(400).json({ error: 'Gym already unlocked' });
  // Enforce sequential unlocking
  const maxUnlocked = unlockedArr.length ? Math.max(...unlockedArr) : 1;
  if (gym.id > maxUnlocked + 1) return res.status(400).json({ error: 'Unlock previous gyms first' });
  // Energy gate: require the previous gym's estimated energy spent
  const prev = getGymById(gym.id - 1);
  const requiredEnergy = prev?.estEnergyNext || 0;
  const spent = Number(player.gym?.energySpent || 0);
  if (spent < requiredEnergy) return res.status(400).json({ error: `Not enough training yet. Need ${requiredEnergy} energy spent, you have ${spent}.` });
  // Money gate
  if (player.money < gym.unlockCost) return res.status(400).json({ error: 'Not enough money' });
    // Deduct and unlock
    player.money -= gym.unlockCost;
    unlocked.add(gym.id);
    player.gym = player.gym || {};
    player.gym.unlocked = Array.from(unlocked).sort((a,b)=>a-b);
    // Optionally auto-select the newly unlocked gym
    player.gym.selectedGymId = gym.id;
    await player.save();
    return res.json({ ok: true, selectedGymId: player.gym.selectedGymId, money: player.money, unlocked: player.gym.unlocked });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const selectGym = async (req, res) => {
  try {
    const { userId, id, gymId } = req.body;
    const player = await findPlayerByIdOrUser({ id, userId });
    if (!player) return res.status(404).json({ error: 'Player not found' });
    const gym = getGymById(gymId);
    if (!gym) return res.status(400).json({ error: 'Invalid gym id' });
    const unlocked = new Set((player.gym?.unlocked || [1]).map(Number));
    if (!unlocked.has(gym.id)) return res.status(400).json({ error: 'Gym is locked' });
    player.gym = player.gym || {};
    player.gym.selectedGymId = gym.id;
    await player.save();
    return res.json({ ok: true, selectedGymId: player.gym.selectedGymId });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

module.exports.getCatalog = getCatalog;
module.exports.unlockGym = unlockGym;
module.exports.selectGym = selectGym;