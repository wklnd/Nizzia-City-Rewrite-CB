const Player = require('../models/Player');
const BankAccount = require('../models/Bank');
const { getLatestPrice } = require('../services/stockService');

function sumBattle(b){
  if (!b) return 0;
  return Number(b.strength||0)+Number(b.speed||0)+Number(b.dexterity||0)+Number(b.defense||0);
}
function sumWork(w){
  if (!w) return 0;
  return Number(w.manuallabor||0)+Number(w.intelligence||0)+Number(w.endurance||0)+Number(w.employeEfficiency||0);
}

async function getPricesMap(symbols){
  const out = {};
  for (const s of symbols){
    try { const last = await getLatestPrice(s); out[s] = Number(last.price||0); }
    catch(_) { out[s] = 0; }
  }
  return out;
}

async function hallOfFame(req, res){
  try {
  const limit = Math.max(1, Math.min(100, Number(req.query.limit||10)));
  const excludeNpc = String(req.query.excludeNpc||'false').toLowerCase() === 'true' || String(req.query.npc||'').toLowerCase() === 'exclude';
  // Include all players by default so HoF isn't empty on fresh databases
  const playerFilter = excludeNpc ? { npc: { $ne: true } } : {};
  const players = await Player.find(playerFilter).select('user name id money battleStats workStats portfolio npc').lean();

    // Collect all symbols seen in portfolios
    const symbols = new Set();
    for (const p of players){
      for (const h of (p.portfolio||[])) symbols.add(h.symbol);
    }
    const priceMap = await getPricesMap(Array.from(symbols));

    // Bank locked amounts per player
    const bankAgg = await BankAccount.aggregate([
      { $match: { isWithdrawn: false } },
      { $group: { _id: '$player', total: { $sum: '$depositedAmount' } } }
    ]);
    const bankMap = new Map(bankAgg.map(r => [String(r._id), Number(r.total||0)]));

    // Build enriched list
    const enriched = players.map(p => {
      let portfolioValue = 0;
      for (const h of (p.portfolio||[])){
        const price = priceMap[h.symbol] || 0;
        portfolioValue += Number(h.shares||0) * price;
      }
      // Bank aggregated by ObjectId reference; need string compare
      const bankLocked = bankMap.get(String(p._id)) || 0;
      const money = Number(p.money||0);
      const netWorth = Number((money + portfolioValue + bankLocked).toFixed(2));
      const battleTotal = sumBattle(p.battleStats);
      const workTotal = sumWork(p.workStats);
      return {
        _id: p._id,
        id: p.id,
        name: p.name,
        money,
        portfolioValue: Number(portfolioValue.toFixed(2)),
        bankLocked,
        netWorth,
        battleTotal,
        workTotal,
        battle: p.battleStats || {},
        work: p.workStats || {},
      };
    });

    function topBy(key){
      const arr = [...enriched].sort((a,b) => (b[key]||0) - (a[key]||0)).slice(0, limit);
      return arr.map((p, idx) => ({ rank: idx+1, id: p.id, name: p.name, [key]: p[key] }));
    }

    const richest = topBy('netWorth');
    const topBattle = [...enriched].sort((a,b)=>b.battleTotal-a.battleTotal).slice(0,limit)
      .map((p,idx)=>({ rank: idx+1, id:p.id, name:p.name, total:p.battleTotal, battle:p.battle }));
    const topWork = [...enriched].sort((a,b)=>b.workTotal-a.workTotal).slice(0,limit)
      .map((p,idx)=>({ rank: idx+1, id:p.id, name:p.name, total:p.workTotal, work:p.work }));

    res.json({ richest, battle: topBattle, work: topWork, count: players.length });
  } catch (e) {
    console.error('HOF error:', e);
    res.status(500).json({ error: 'Failed to compute Hall of Fame' });
  }
}

module.exports = { hallOfFame };
