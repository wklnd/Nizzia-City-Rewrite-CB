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
    const resAlc = await Player.updateMany({ 'cooldowns.alcoholCooldown': { $gt: 0 } }, { $inc: { 'cooldowns.alcoholCooldown': dec } });

    // Clamp negatives back to zero
    await Player.updateMany({ 'cooldowns.drugCooldown': { $lt: 0 } }, { $set: { 'cooldowns.drugCooldown': 0 } });
    await Player.updateMany({ 'cooldowns.boosterCooldown': { $lt: 0 } }, { $set: { 'cooldowns.boosterCooldown': 0 } });
    await Player.updateMany({ 'cooldowns.medicalCooldown': { $lt: 0 } }, { $set: { 'cooldowns.medicalCooldown': 0 } });
    await Player.updateMany({ 'cooldowns.alcoholCooldown': { $lt: 0 } }, { $set: { 'cooldowns.alcoholCooldown': 0 } });

    // Per-drug granular cooldowns: iterate players with any drug map entries > 0
    const candidates = await Player.find({ 'cooldowns.drugs': { $exists: true, $ne: {} } }, { 'cooldowns.drugs': 1 }).lean();
    const bulk = [];
    for (const p of candidates) {
      const map = p?.cooldowns?.drugs || {};
      let changed = false;
      const out = {};
      for (const [k, v] of Object.entries(map)) {
        const next = Math.max(0, Number(v || 0) + dec);
        if (next !== Number(v || 0)) changed = true;
        out[k] = next;
      }
      if (changed) {
        bulk.push({ updateOne: { filter: { _id: p._id }, update: { $set: { 'cooldowns.drugs': out } } } });
      }
    }
    if (bulk.length) await Player.bulkWrite(bulk);

    const totalMods = (res1.modifiedCount||0) + (res2.modifiedCount||0) + (res3.modifiedCount||0) + (resAlc.modifiedCount||0) + (bulk.length||0);
    if (totalMods > 0) console.log(`Cooldowns decremented (-${Math.abs(dec)}s) affected docs: ${totalMods}`);
  } catch (err) {
    console.error('tickCooldowns error:', err);
  }
}

function scheduleRegenCooldowns() {
  // Run every minute
  cron.schedule('*/1 * * * *', () => {
    console.log('Running cooldowns tick...');
    try {
      const mongoose = require('mongoose');
      if (mongoose.connection.readyState !== 1) {
        console.warn('Skipping cooldown tick: DB not connected');
        return;
      }
    } catch (_) {}
    tickCooldowns(60);
  });
}

module.exports = scheduleRegenCooldowns;
