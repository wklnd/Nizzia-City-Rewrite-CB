//jobCron.js
const Player = require('../models/Player');
const cron = require('node-cron');
require('dotenv').config();

const jobSettings = require('../config/job'); // Import job settings

const rankNames = [
  'Zero','One','Two','Three','Four',
  'Five','Six','Seven','Eight','Nine'
];

const addJobAndWork = async () => {
  let processed = 0, updated = 0;
  const cursor = Player.find({}, 'name job workStats').cursor();
  for await (const player of cursor) {
    const id = Number(player.job.jobId);
    if (isNaN(id)) continue;
    const job = jobSettings.jobs[id];
    if (!job) continue;

    const name = rankNames[player.job.jobRank] || 'Zero';
    const rankKey = `rank${name}`;
    const rank = job[rankKey];
    if (!rank) continue;

    processed++;

    // Apply both
    player.job.jobPoints             += rank.jobPoints;
    player.workStats.manuallabor     += rank.statsGained.manuallabor;
    player.workStats.intelligence    += rank.statsGained.intelligence;
    player.workStats.endurance       += rank.statsGained.endurance;

    try { await player.save(); updated++; } catch(_) {}
  }
  console.log(`[jobCron] processed=${processed} updated=${updated}`);
};


// Schedule the energy regeneration to run every 10 minutes
const scheduleJob = () => {
  cron.schedule('0 1 * * *', () => {
    console.log('Running job cron job');
    addJobAndWork()
  });
};

module.exports = scheduleJob;