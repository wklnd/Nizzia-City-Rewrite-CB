// regenCooldowns.js
const Player = require('../models/Player');
const cron = require('node-cron');

async function tickCooldowns(deltaSec = 60) {
  try {
    const players = await Player.find({}, { cooldowns: 1, name: 1 }).lean();
    const updates = [];
    for (const p of players) {
      const cd = p.cooldowns || {};
      const drug = Math.max(0, Number(cd.drugCooldown || 0) - deltaSec);
      const booster = Math.max(0, Number(cd.boosterCooldown || 0) - deltaSec);
      const medical = Math.max(0, Number(cd.medicalCooldown || 0) - deltaSec);
      // Only update if changed
      if (
        drug !== Number(cd.drugCooldown || 0) ||
        booster !== Number(cd.boosterCooldown || 0) ||
        medical !== Number(cd.medicalCooldown || 0)
      ) {
        updates.push({ _id: p._id, drug, booster, medical });
      }
    }
    // Apply updates in bulk
    const bulk = updates.map(u => ({
      updateOne: {
        filter: { _id: u._id },
        update: {
          $set: {
            'cooldowns.drugCooldown': u.drug,
            'cooldowns.boosterCooldown': u.booster,
            'cooldowns.medicalCooldown': u.medical,
          }
        }
      }
    }));
    if (bulk.length) {
      await Player.bulkWrite(bulk, { ordered: false });
      console.log(`Cooldowns ticked for ${bulk.length} players (-${deltaSec}s)`);
    }
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
