const stocks = require('../config/stocks');
const StockPrice = require('../models/StockPrice');

// Helpers
function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

// Deterministic pseudo random based on time + seed
// Standard normal via Box-Muller
function randn() {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

async function getLatestPrice(symbol) {
  const last = await StockPrice.findOne({ symbol }).sort({ ts: -1 }).lean();
  if (last) return last;
  // seed with initial price
  const base = stocks[symbol]?.initialPrice || 100;
  const seeded = { symbol, price: base, ts: new Date(Date.now() - 60*1000) };
  await StockPrice.create(seeded);
  return seeded;
}

async function nextPrice(symbol) {
  const cfg = stocks[symbol];
  if (!cfg) throw new Error('Unknown symbol');
  const last = await getLatestPrice(symbol);
  const now = Date.now();
  // Geometric Brownian Motion with annualized parameters
  const mu = typeof cfg.avgYieldPerYear === 'number' ? cfg.avgYieldPerYear : 0.07; // 7% default
  const sigma = typeof cfg.volatility === 'number' ? cfg.volatility : 0.2; // 20% default
  const decimals = Number.isInteger(cfg.decimals) ? cfg.decimals : 2;
  const minutesPerYear = 365 * 24 * 60;
  const dt = 1 / minutesPerYear; // one minute step
  const drift = (mu - 0.5 * sigma * sigma) * dt;
  const diffusion = sigma * Math.sqrt(dt) * randn();
  const next = last.price * Math.exp(drift + diffusion);
  const minTick = Math.pow(10, -decimals);
  const ret = Math.max(minTick, next);
  return { symbol, price: Number(ret.toFixed(decimals)), ts: new Date(now) };
}

async function tickAll() {
  const symbols = Object.keys(stocks);
  const docs = [];
  for (const s of symbols) {
    const nx = await nextPrice(s);
    docs.push(nx);
  }
  if (docs.length) await StockPrice.insertMany(docs);
  // Optional pruning: keep last N entries per symbol to limit growth
  // Not implemented for simplicity
  return docs;
}

async function listStocks() {
  const out = [];
  for (const [symbol, cfg] of Object.entries(stocks)) {
    const last = await getLatestPrice(symbol);
    // compute 24h change
    const decimals = Number.isInteger(cfg.decimals) ? cfg.decimals : 2;
    const since24h = new Date(Date.now() - 24*60*60*1000);
    // Try price from <= 24h ago (closest to 24h ago)
    let prevDoc = await StockPrice.findOne({ symbol, ts: { $lte: since24h } }).sort({ ts: -1 }).lean();
    // Fallback: try ~60 minutes ago to show movement quickly in fresh DBs
    if (!prevDoc) {
      const since60m = new Date(Date.now() - 60*60*1000);
      prevDoc = await StockPrice.findOne({ symbol, ts: { $lte: since60m } }).sort({ ts: -1 }).lean();
    }
    // Fallback: earliest recorded point
    if (!prevDoc) prevDoc = await StockPrice.findOne({ symbol }).sort({ ts: 1 }).lean();
    const prev = prevDoc ? prevDoc.price : last.price;
    const rawChange = last.price - prev;
    const change = Number(rawChange.toFixed(decimals));
    const changePct = prev ? Number(((rawChange/prev)*100).toFixed(2)) : 0;
    out.push({ symbol, name: cfg.name, price: last.price, change, changePct, decimals });
  }
  return out;
}

async function getHistory(symbol, range = '1d') {
  const ranges = { '1d': 24*60, '7d': 7*24*60, '30d': 30*24*60, '90d': 90*24*60 };
  const minutes = ranges[range] || ranges['1d'];
  const since = new Date(Date.now() - minutes*60*1000);
  const rows = await StockPrice.find({ symbol, ts: { $gte: since } }).sort({ ts: 1 }).lean();
  return rows.map(r => ({ ts: r.ts, price: r.price }));
}

module.exports = { getLatestPrice, nextPrice, tickAll, listStocks, getHistory };
