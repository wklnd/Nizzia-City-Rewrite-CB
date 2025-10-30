const Player = require('../models/Player');
const Counter = require('../models/Counter');
const BankAccount = require('../models/Bank');
const { getLatestPrice } = require('../services/stockService');
const PlayerSnapshot = require('../models/PlayerSnapshot');

async function getNextPlayerId() {
  const result = await Counter.findOneAndUpdate(
    { name: 'player' },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return result.seq; // starts at 1 on first call because default 0 then +1
}

// POST /api/player/create
// Body: { name, gender, userId }
// Returns: created player document
async function createPlayer(req, res) {
  try {
    const { name, gender, userId } = req.body;
    if (!name || !gender || !userId) {
      return res.status(400).json({ error: 'name, gender and userId are required' });
    }
    // ensure one player per user (optional rule)
    const existingForUser = await Player.findOne({ user: userId });
    if (existingForUser) {
      return res.status(409).json({ error: 'Player already exists for this user' });
    }

    const nextId = await getNextPlayerId();
    const player = new Player({ user: userId, name, id: nextId, gender });
    await player.save();
    return res.status(201).json(player);
  } catch (err) {
    console.error('Create player error:', err);
    return res.status(500).json({ error: 'Failed to create player' });
  }
}

// GET /api/player/by-user/:userId
async function getPlayerByUser(req, res) {
  try {
    const { userId } = req.params;
    const player = await Player.findOne({ user: userId });
    if (!player) return res.status(404).json({ error: 'Player not found' });
    return res.json(player);
  } catch (err) {
    console.error('Get player by user error:', err);
    return res.status(500).json({ error: 'Failed to fetch player' });
  }
}

module.exports = { createPlayer, getPlayerByUser };
 
// GET /api/player/profile/:id (numeric Player.id)
async function getPublicProfile(req, res) {
  try {
    const pid = Number(req.params.id);
    if (!Number.isFinite(pid)) return res.status(400).json({ error: 'Invalid player id' });
    const p = await Player.findOne({ id: pid }).lean();
    if (!p) return res.status(404).json({ error: 'Player not found' });

    // Bank summary: active locked total and active count
    const bankAgg = await BankAccount.aggregate([
      { $match: { player: p._id, isWithdrawn: false } },
      { $group: { _id: '$player', totalLocked: { $sum: '$depositedAmount' }, activeCount: { $sum: 1 } } }
    ]);
    const bank = bankAgg[0] || { totalLocked: 0, activeCount: 0 };

    // Portfolio valued at latest price
    const holdings = [];
    let portfolioValue = 0;
    for (const h of (p.portfolio || [])){
      const last = await getLatestPrice(h.symbol);
      const currentPrice = Number(last.price || 0);
      const value = Number((currentPrice * Number(h.shares||0)).toFixed(2));
      portfolioValue += value;
      holdings.push({ symbol: h.symbol, shares: h.shares||0, avgPrice: h.avgPrice||0, currentPrice, value });
    }

    const profile = {
      id: p.id,
      name: p.name,
      npc: !!p.npc,
      level: p.level,
      exp: p.exp,
      age: p.age,
      playerTitle: p.playerTitle,
      playerStatus: p.playerStatus,
      playerRole: p.playerRole,
      vitals: {
        health: p.health,
        energy: p.energyStats?.energy || 0,
        energyMax: p.energyStats?.energyMax || 0,
        nerve: p.nerveStats?.nerve || 0,
        nerveMax: p.nerveStats?.nerveMax || 0,
        happy: p.happiness?.happy || 0,
        happyMax: p.happiness?.happyMax || 0,
      },
      battleStats: p.battleStats || {},
      workStats: p.workStats || {},
      finances: {
        money: p.money || 0,
        bankLocked: bank.totalLocked || 0,
        bankActiveAccounts: bank.activeCount || 0,
        portfolioValue: Number(portfolioValue.toFixed(2)),
        netWorth: Number(((p.money||0) + (bank.totalLocked||0) + portfolioValue).toFixed(2)),
        holdings,
      },
    };

    return res.json(profile);
  } catch (err) {
    console.error('Get public profile error:', err);
    return res.status(500).json({ error: 'Failed to fetch profile' });
  }
}

module.exports.getPublicProfile = getPublicProfile;

// GET /api/player/profile/:id/history?days=30
// Returns arrays aligned by ts for charting
async function getProfileHistory(req, res){
  try {
    const pid = Number(req.params.id);
    if (!Number.isFinite(pid)) return res.status(400).json({ error: 'Invalid player id' });
    const p = await Player.findOne({ id: pid }).select('_id').lean();
    if (!p) return res.status(404).json({ error: 'Player not found' });

      const days = Math.max(1, Math.min(90, Number(req.query.days || 30)));
      const since = new Date(Date.now() - days*24*60*60*1000);
      // Aggregate snapshots to hourly resolution
      const agg = await PlayerSnapshot.aggregate([
        { $match: { player: p._id, ts: { $gte: since } } },
        { $sort: { ts: 1 } },
        { $group: {
            _id: { $dateTrunc: { date: '$ts', unit: 'hour' } },
            ts: { $last: '$ts' },
            netWorth: { $last: '$netWorth' },
            battleTotal: { $last: '$battleTotals.total' },
            money: { $last: '$money' },
            bankLocked: { $last: '$bankLocked' },
            portfolioValue: { $last: '$portfolioValue' }
        } },
        { $sort: { ts: 1 } }
      ]);
      const points = agg.map(s => ({
        ts: s.ts,
        netWorth: Number(s.netWorth||0),
        battleTotal: Number(s.battleTotal||0),
        money: Number(s.money||0),
        bankLocked: Number(s.bankLocked||0),
        portfolioValue: Number(s.portfolioValue||0),
      }));
    return res.json({ id: pid, days, points });
  } catch (e) {
    console.error('Get profile history error:', e);
    return res.status(500).json({ error: 'Failed to fetch profile history' });
  }
}

module.exports.getProfileHistory = getProfileHistory;
