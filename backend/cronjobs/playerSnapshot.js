// @TODO - Change the snapshot frequency so the database doesn't grow too large too quickly
const cron = require('node-cron');
const Player = require('../models/Player');
const PlayerSnapshot = require('../models/PlayerSnapshot');
const ts = () => `[${new Date().toTimeString().slice(0,8)}]`;
const BankAccount = require('../models/Bank');
const stocksCfg = require('../config/stocks');
const { getLatestPrice } = require('../services/stockService');

function sumBattle(b){
  if (!b) return { strength:0, speed:0, dexterity:0, defense:0, total:0 };
  const strength = Number(b.strength||0);
  const speed = Number(b.speed||0);
  const dexterity = Number(b.dexterity||0);
  const defense = Number(b.defense||0);
  return { strength, speed, dexterity, defense, total: strength+speed+dexterity+defense };
}

async function buildPricesMap(symbols){
  const map = {};
  for (const s of symbols){
    try { const last = await getLatestPrice(s); map[s] = Number(last.price||0); } catch(_) { map[s] = 0; }
  }
  return map;
}

async function takeSnapshot(){
  const players = await Player.find({}).select('money battleStats portfolio').lean();
  if (!players || players.length === 0) return;

  // Collect all symbols to price once
  const symbols = new Set();
  for (const p of players){ for (const h of (p.portfolio||[])) symbols.add(h.symbol); }
  const prices = await buildPricesMap(Array.from(symbols));

  // Bank locked per player
  const bankAgg = await BankAccount.aggregate([
    { $match: { isWithdrawn: false } },
    { $group: { _id: '$player', total: { $sum: '$depositedAmount' } } }
  ]);
  const bankMap = new Map(bankAgg.map(r => [String(r._id), Number(r.total||0)]));

  const docs = [];
  const ts = new Date();
  for (const p of players){
    let portfolioValue = 0;
    for (const h of (p.portfolio||[])){
      const price = prices[h.symbol] || 0;
      portfolioValue += Number(h.shares||0) * price;
    }
    const bankLocked = bankMap.get(String(p._id)) || 0; // lean() drops _id cast, use string
    const money = Number(p.money||0);
    const netWorth = Number((money + portfolioValue + bankLocked).toFixed(2));
    const battleTotals = sumBattle(p.battleStats);
    docs.push({ player: p._id, ts, money, bankLocked, portfolioValue: Number(portfolioValue.toFixed(2)), netWorth, battleTotals });
  }

  if (docs.length) {
    try { await PlayerSnapshot.insertMany(docs, { ordered: false }); }
    catch (e) { /* tolerate duplicate ts edge cases */ }
  }
}

function schedulePlayerSnapshots(){
  // Every hour at minute 0
  cron.schedule('0 * * * *', async () => {
    console.log(`${ts()} [cron] Player snapshots tick (hourly)`);
    await takeSnapshot().catch(e => console.error('Snapshot error:', e.message));
  });
}

module.exports = schedulePlayerSnapshots;
