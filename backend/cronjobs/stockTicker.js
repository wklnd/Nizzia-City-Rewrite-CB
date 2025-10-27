const cron = require('node-cron');
const { tickAll } = require('../services/stockService');

function scheduleStockTicker() {
  // every minute
  const task = cron.schedule('* * * * *', async () => {
    console.log('Running scheduled stock ticker cron...');

    try { await tickAll(); } catch (e) { console.error('Stock tick error:', e.message); }
  });
  return task;
}

module.exports = scheduleStockTicker;
