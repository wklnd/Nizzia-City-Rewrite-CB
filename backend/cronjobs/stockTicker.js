const cron = require('node-cron');
const { tickAll } = require('../services/stockService');
const ts = () => `[${new Date().toTimeString().slice(0,8)}]`;

function scheduleStockTicker() {
  // every minute
  const task = cron.schedule('* * * * *', async () => {
    console.log(`${ts()} Running scheduled stock ticker cron...`);

    try { await tickAll(); } catch (e) { console.error('Stock tick error:', e.message); }
  });
  return task;
}

module.exports = scheduleStockTicker;
