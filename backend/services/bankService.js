const BankApr = require('../models/BankApr');

const PERIODS = {
  '1w': { days: 7, min: 0.03, max: 0.07 },
  '2w': { days: 14, min: 0.04, max: 0.09 },
  '1m': { days: 30, min: 0.06, max: 0.12 },
  '3m': { days: 90, min: 0.10, max: 0.18 },
  '6m': { days: 180, min: 0.12, max: 0.24 },
};

function clamp(n, min, max) { return Math.min(max, Math.max(min, n)); }

async function ensureAprDoc() {
  let doc = await BankApr.findOne({ name: 'current' });
  if (!doc) {
    doc = new BankApr({ name: 'current' });
    await doc.save();
  }
  return doc;
}

async function getCurrentRates() {
  const doc = await ensureAprDoc();
  return { rates: doc.rates, updatedAt: doc.updatedAt };
}

// Random walk the APRs within a bounded range. Call from cron.
async function updateRates() {
  const doc = await ensureAprDoc();
  const next = { ...doc.rates };
  for (const key of Object.keys(PERIODS)) {
    const { min, max } = PERIODS[key];
    const cur = Number(next[key] || min);
    // small drift +/- up to 0.3 percentage points per tick
    const delta = (Math.random() - 0.5) * 0.006; // +/- 0.6% APR
    next[key] = Number(clamp(cur + delta, min, max).toFixed(4));
  }
  doc.rates = next;
  doc.updatedAt = new Date();
  await doc.save();
  return { rates: doc.rates, updatedAt: doc.updatedAt };
}

function getEndDate(start, period) {
  const cfg = PERIODS[period];
  if (!cfg) throw new Error('Unknown period');
  const d = new Date(start);
  d.setDate(d.getDate() + cfg.days);
  return d;
}

// Simple interest payout using APR prorated by term days
function calculatePayout(principal, apr, period) {
  const cfg = PERIODS[period];
  if (!cfg) throw new Error('Unknown period');
  const termFraction = cfg.days / 365; // APR is annual
  const interest = principal * apr * termFraction;
  const total = principal + interest;
  return { interest: Number(interest.toFixed(2)), total: Number(total.toFixed(2)) };
}

module.exports = {
  PERIODS,
  getCurrentRates,
  updateRates,
  getEndDate,
  calculatePayout,
};
