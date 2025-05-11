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
  const players = await Player.find({});
  for (const player of players) {
    const id = Number(player.job.jobId);
    if (isNaN(id)) continue;
    const job = jobSettings.jobs[id];
    if (!job) continue;

    const name = rankNames[player.job.jobRank] || 'Zero';
    const rankKey = `rank${name}`;
    const rank = job[rankKey];
    if (!rank) continue;

    // Debug log
    console.log(
      `[CRON] ${player.name}: +${rank.jobPoints} JP,` +
      ` +${rank.statsGained.manuallabor}/${rank.statsGained.intelligence}/` +
      `${rank.statsGained.endurance} workStats`
    );

    // Apply both
    player.job.jobPoints             += rank.jobPoints;
    player.workStats.manuallabor     += rank.statsGained.manuallabor;
    player.workStats.intelligence    += rank.statsGained.intelligence;
    player.workStats.endurance       += rank.statsGained.endurance;

    await player.save();
  }
};


// Schedule the energy regeneration to run every 10 minutes
const scheduleJob = () => {
  cron.schedule('0 1 * * *', () => {
    console.log('Running job cron job');
    addJobAndWork()
  });
};

module.exports = scheduleJob;