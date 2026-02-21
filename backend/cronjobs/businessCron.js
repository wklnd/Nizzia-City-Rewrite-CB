// businessCron.js — Hourly income tick for player-owned businesses
const mongoose = require('mongoose');
const cron = require('node-cron');
const { processIncomeTick } = require('../services/businessService');
const ts = () => `[${new Date().toTimeString().slice(0,8)}]`;

// Schedule business income processing to run every hour on the hour
const scheduleBusinessIncome = () => {
  cron.schedule('0 * * * *', async () => {
    console.log(`${ts()} Running scheduled business income tick...`);
    try {
      if (mongoose.connection.readyState !== 1) {
        console.warn('Skipping business income tick: DB not connected');
        return;
      }
      const result = await processIncomeTick();
      console.log(`${ts()} Business income tick complete. processed=${result.processed} raided=${result.raided}`);
    } catch (error) {
      console.error('Error during business income tick:', error);
    }
  });
  console.log(`${ts()} Business income cron scheduled (every hour on the hour)`);
};

module.exports = scheduleBusinessIncome;
