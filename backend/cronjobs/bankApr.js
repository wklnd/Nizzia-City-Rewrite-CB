const cron = require('node-cron');
const { updateRates } = require('../services/bankService');
const ts = () => `[${new Date().toTimeString().slice(0,8)}]`;

function scheduleBankApr() {
  // Update APRs every 6 hours
  const task = cron.schedule('0 */6 * * *', async () => {
    console.log(`${ts()} Running scheduled bank APR update...`);
    try { await updateRates(); } catch (e) { console.error('Bank APR update error:', e.message); }
  });
  return task;
}

module.exports = scheduleBankApr;
