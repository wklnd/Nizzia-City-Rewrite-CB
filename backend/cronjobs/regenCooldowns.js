// regenCooldowns.js
const Player = require('../models/Player');
const cron = require('node-cron');

async function tickCooldowns(deltaSec = 60) {
  try {
    // Decrement active cooldowns without loading all players in memory
    const dec = -Math.abs(Number(deltaSec || 60));
    const res1 = await Player.updateMany({ 'cooldowns.drugCooldown': { $gt: 0 } }, { $inc: { 'cooldowns.drugCooldown': dec } });
    const res2 = await Player.updateMany({ 'cooldowns.boosterCooldown': { $gt: 0 } }, { $inc: { 'cooldowns.boosterCooldown': dec } });
    const res3 = await Player.updateMany({ 'cooldowns.medicalCooldown': { $gt: 0 } }, { $inc: { 'cooldowns.medicalCooldown': dec } });

    // Clamp negatives back to zero
    await Player.updateMany({ 'cooldowns.drugCooldown': { $lt: 0 } }, { $set: { 'cooldowns.drugCooldown': 0 } });
    await Player.updateMany({ 'cooldowns.boosterCooldown': { $lt: 0 } }, { $set: { 'cooldowns.boosterCooldown': 0 } });
    await Player.updateMany({ 'cooldowns.medicalCooldown': { $lt: 0 } }, { $set: { 'cooldowns.medicalCooldown': 0 } });

    const totalMods = (res1.modifiedCount||0) + (res2.modifiedCount||0) + (res3.modifiedCount||0);
    if (totalMods > 0) console.log(`Cooldowns decremented (-${Math.abs(dec)}s) affected docs: ${totalMods}`);
  } catch (err) {
    console.error('tickCooldowns error:', err);
  }
}

function scheduleRegenCooldowns() {
  // Run every minute
  cron.schedule('*/1 * * * *', () => {
    console.log('Running cooldowns tick...');
    tickCooldowns(60);
  });
}

module.exports = scheduleRegenCooldowns;
