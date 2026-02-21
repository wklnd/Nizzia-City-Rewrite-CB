// cartelCron.js — Hourly tick: heat decay, busts, payroll, betrayals, missions, market
const mongoose = require('mongoose');
const cron = require('node-cron');
const { processHeatTick }          = require('../services/cartel/cartelService');
const { processPayroll, processBetrayals } = require('../services/cartel/npcService');
const { processMarketTick }        = require('../services/cartel/territoryService');
const { processCompletedMissions } = require('../services/cartel/missionService');
const ts = () => `[${new Date().toTimeString().slice(0,8)}]`;

const scheduleCartelTick = () => {
  // Mission completion — every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    try {
      if (mongoose.connection.readyState !== 1) return;
      const r = await processCompletedMissions();
      if (r.completed) console.log(`${ts()} [cartel] missions resolved: ${r.completed}`);
    } catch (e) { console.error('[cartel] mission tick error:', e.message); }
  });

  // Hourly tick — heat, payroll, betrayals, market
  cron.schedule('5 * * * *', async () => {
    try {
      if (mongoose.connection.readyState !== 1) return;
      const [heat, payroll, betray, market] = await Promise.all([
        processHeatTick(),
        processPayroll(),
        processBetrayals(),
        processMarketTick(),
      ]);
      console.log(`${ts()} [cartel] hourly tick — heat: ${heat.processed} (${heat.busted} busted), payroll: ${payroll.processed}, betrayals: ${betray.betrayals}, markets: ${market.territories}`);
    } catch (e) { console.error('[cartel] hourly tick error:', e.message); }
  });

  console.log(`${ts()} Cartel cron jobs scheduled (missions: */5m, hourly: :05)`);
};

module.exports = scheduleCartelTick;
