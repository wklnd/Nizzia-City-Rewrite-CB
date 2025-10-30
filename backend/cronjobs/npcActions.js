// NPC automated actions: periodic stock trades and bank investments
const cron = require('node-cron');
const Player = require('../models/Player');
const BankAccount = require('../models/Bank');
const stocksCfg = require('../config/stocks');
const { getLatestPrice } = require('../services/stockService');
const { getCurrentRates, getEndDate, calculatePayout } = require('../services/bankService');
const gymService = require('../services/gymService');

function choice(arr){ return arr[Math.floor(Math.random()*arr.length)]; }
function clamp(n, min, max){ return Math.max(min, Math.min(max, n)); }

async function handleStocks(player){
  try {
    const symbols = Object.keys(stocksCfg);
    // Price map for affordability and valuation
    const prices = {};
    for (const s of symbols) {
      try { const p = await getLatestPrice(s); prices[s] = Number(p?.price || 0); } catch { prices[s] = 0; }
    }

    const cash = Number(player.money || 0);
  // Spend more cash to accelerate growth
  const minSpend = 100;
  const hasHoldings = Array.isArray(player.portfolio) && player.portfolio.length > 0;
  // If no holdings, invest aggressively (35–70% of cash). Otherwise 20–40% per tick.
  const budgetFrac = hasHoldings ? (0.20 + Math.random()*0.20) : (0.35 + Math.random()*0.35);
  const budget = Math.max(minSpend, cash * budgetFrac);
    

    // 1) SELL RULES: take profit or stop loss
    if (hasHoldings) {
      // Evaluate each holding's gain percentage
      let bestSell = null; // { idx, symbol, price, qty, proceeds, reason }
  // Prefer selling winners. Rarely cut deep losers.
  const targetGain = 0.03 + Math.random()*0.12; // 3–15% take-profit
  const stopLoss   = 0.25 + Math.random()*0.15; // 25–40% stop-loss (rare)
      for (let i=0; i<player.portfolio.length; i++) {
        const h = player.portfolio[i];
        const price = prices[h.symbol] || 0;
        if (!price || !h.shares) continue;
        const gainPct = h.avgPrice > 0 ? (price - h.avgPrice) / h.avgPrice : 0;
        let shouldSell = false; let reason = '';
        if (gainPct >= targetGain) { shouldSell = true; reason = `take-profit ${(gainPct*100).toFixed(1)}%`; }
        else if (gainPct <= -stopLoss) { shouldSell = true; reason = `stop-loss ${(gainPct*100).toFixed(1)}%`; }
        if (shouldSell) {
          // Sell a larger fraction when profits are bigger
          let frac;
          if (gainPct >= 0.30) frac = 0.70 + Math.random()*0.30; // 70–100%
          else if (gainPct >= 0.10) frac = 0.40 + Math.random()*0.35; // 40–75%
          else frac = 0.30 + Math.random()*0.30; // 30–60%
          const qty = Math.max(1, Math.floor(h.shares * frac));
          const proceeds = Number((qty * price).toFixed(2));
          if (!bestSell || proceeds > bestSell.proceeds) {
            bestSell = { idx:i, symbol:h.symbol, price, qty, proceeds, reason };
          }
        }
      }

      // Rarely cut deep losers to free capital (15% chance if no take-profit candidate)
      if (!bestSell && Math.random() < 0.15) {
        for (let i=0; i<player.portfolio.length; i++) {
          const h = player.portfolio[i];
          const price = prices[h.symbol] || 0;
          if (!price || !h.shares) continue;
          const gainPct = h.avgPrice > 0 ? (price - h.avgPrice) / h.avgPrice : 0;
          if (gainPct <= -stopLoss) {
            const frac = 0.30 + Math.random()*0.30; // 30–60%
            const qty = Math.max(1, Math.floor(h.shares * frac));
            const proceeds = Number((qty * price).toFixed(2));
            bestSell = { idx:i, symbol:h.symbol, price, qty, proceeds, reason: `deep-stop ${(gainPct*100).toFixed(1)}%` };
            break;
          }
        }
      }

      if (bestSell) {
        const h = player.portfolio[bestSell.idx];
        h.shares = Number((h.shares - bestSell.qty).toFixed(8));
        if (h.shares <= 0) player.portfolio.splice(bestSell.idx, 1);
        player.money = Number(((player.money || 0) + bestSell.proceeds).toFixed(2));
        if (typeof player.markModified === 'function') player.markModified('portfolio');
        console.log(`[npc] ${player.name} sell ${bestSell.qty} ${bestSell.symbol} @ $${bestSell.price} (+$${bestSell.proceeds}) via ${bestSell.reason}`);
        return 'sell';
      }
    }

    // 2) BUY RULES: prefer affordable symbols; if none, take cheapest
    const affordable = symbols.filter(s => prices[s] > 0 && prices[s] <= budget);
    const cheapest = symbols.slice().sort((a,b)=> (prices[a]||Infinity) - (prices[b]||Infinity))[0];
    const sym = (affordable.length ? choice(affordable) : cheapest) || choice(symbols);
    const price = prices[sym] || 0;
    if (!price) { console.log(`[npc] ${player.name} skip buy (no price for ${sym})`); return 'skip'; }
    const spend = clamp(budget, 0, cash);
    const shares = Math.max(1, Math.floor(spend / price));
    if (shares <= 0) { console.log(`[npc] ${player.name} skip buy (shares<=0 for ${sym})`); return 'skip'; }
    const cost = Number((shares * price).toFixed(2));
    if ((player.money || 0) < cost) { console.log(`[npc] ${player.name} skip buy (insufficient funds needs $${cost})`); return 'skip'; }

    const idx = (player.portfolio || []).findIndex(h => h.symbol === sym);
    if (idx >= 0) {
      const h = player.portfolio[idx];
      const newShares = Number(h.shares || 0) + shares;
      const newAvg = newShares > 0 ? Number(((h.avgPrice * h.shares + cost) / newShares).toFixed(4)) : price;
      h.shares = newShares; h.avgPrice = newAvg;
    } else {
      player.portfolio = player.portfolio || [];
      player.portfolio.push({ symbol: sym, shares, avgPrice: price });
    }
    player.money = Number(((player.money || 0) - cost).toFixed(2));
    if (typeof player.markModified === 'function') player.markModified('portfolio');
    console.log(`[npc] ${player.name} buy ${shares} ${sym} @ $${price} (spent $${cost})`);
    return 'buy';
  } catch (e) {
    console.error('NPC stocks handler error:', e.message);
    return 'error';
  }
}

async function handleGym(player){
  try {
    // Only train when near max energy, then use ALL energy
    const e = Number(player.energyStats?.energy || 0);
    const eMax = Number(player.energyStats?.energyMax || 0);
    if (e <= 0 || eMax <= 0) return;
    const nearMax = e >= Math.floor(eMax * 0.9); // 90%+ of max counts as "close to max"
    if (!nearMax) return;
    const stats = ['strength','speed','dexterity','defense'];
    const statType = choice(stats);
    // Use all available energy in a single train burst
    const energyPerTrain = e;
    const gain = gymService.calculateGain({
      statTotal: Number(player.battleStats?.[statType] || 0),
      happy: Number(player.happiness?.happy || 0),
      gymDots: 10,
      energyPerTrain,
      perkBonus: 0,
      statType,
      randomValue: Math.floor(Math.random()*101) - 50,
    });
    player.battleStats = player.battleStats || {};
    player.battleStats[statType] = Number(player.battleStats[statType] || 0) + parseFloat(gain);
    player.energyStats.energy = 0;
  } catch (e) {
    console.error('NPC gym handler error:', e.message);
  }
}

async function handleBank(player){
  try {
    // First, withdraw any matured accounts
    const now = new Date();
    const matured = await BankAccount.find({ player: player._id, isWithdrawn: false, endDate: { $lte: now } });
    for (const acct of matured) {
      const { total } = calculatePayout(acct.depositedAmount, acct.interestRate, acct.period);
      acct.isWithdrawn = true;
      await acct.save();
      player.money = Number(((player.money || 0) + total).toFixed(2));
    }

    // With a small probability, open a new deposit if none active
    const active = await BankAccount.findOne({ player: player._id, isWithdrawn: false, endDate: { $gt: now } });
    if (!active && Math.random() < 0.35) {
      const cash = player.money || 0;
      if (cash > 1000) {
        const { rates } = await getCurrentRates();
        const periods = Object.keys(rates);
        const period = choice(periods);
        const apr = Number(rates[period]);
        const maxDeposit = Math.min(2000000000, cash * (0.1 + Math.random() * 0.4)); // 10-50% of cash
        const amount = Math.max(1, Math.floor(maxDeposit));
        if (amount >= 1 && cash >= amount) {
          const acct = new BankAccount({
            player: player._id,
            depositedAmount: amount,
            period,
            interestRate: apr,
            startDate: now,
            endDate: getEndDate(now, period),
          });
          await acct.save();
          player.money = Number((cash - amount).toFixed(2));
        }
      }
    }
  } catch (e) {
    console.error('NPC bank handler error:', e.message);
  }
}

function sampleSubset(arr, fraction){
  const n = arr.length;
  const take = Math.max(0, Math.min(n, Math.floor(n * fraction)));
  // Fisher-Yates partial shuffle
  const a = Array.from(arr);
  for (let i = 0; i < take; i++) {
    const j = i + Math.floor(Math.random() * (n - i));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, take);
}

async function tickNpcActions(){
  const npcs = await Player.find({ npc: true });
  if (!npcs || npcs.length === 0) return;
  console.log(`[npc] found NPCs: ${npcs.length}`);
  // Decide participation rate 20-40% per action for this tick
  const rateStocks = 0.20 + Math.random()*0.20;
  const rateGym    = 0.20 + Math.random()*0.20;
  const rateBank   = 0.10 + Math.random()*0.15; // fewer do bank actions

  const stocksSet = sampleSubset(npcs, rateStocks);
  const gymSet    = sampleSubset(npcs, rateGym);
  const bankSet   = sampleSubset(npcs, rateBank);

  // Track modified players to save once
  const changed = new Set();

  for (const p of bankSet) { await handleBank(p); changed.add(p); }
  let buys=0, sells=0, skips=0;
  for (const p of stocksSet) {
    const r = await handleStocks(p);
    if (r === 'buy') buys++; else if (r === 'sell') sells++; else skips++;
    changed.add(p);
  }
  for (const p of gymSet) { await handleGym(p); changed.add(p); }

  for (const p of changed) {
    try { await p.save(); } catch (e) { console.error('Failed saving NPC:', e.message); }
  }
  console.log(`[npc] tick summary: total=${npcs.length} stocksSet=${stocksSet.length} buys=${buys} sells=${sells} skips=${skips}`);
}

function scheduleNpcActions(){
  // every 10 minutes staggered actions
  cron.schedule('*/1 * * * *', async () => {
    console.log('[cron] NPC actions tick');
    await tickNpcActions();
  });
  // Warm-up tick shortly after start to seed activity
  setTimeout(() => {
    console.log('[cron] NPC warm-up tick');
    tickNpcActions().catch(()=>{});
  }, 5000);
}

module.exports = scheduleNpcActions;
