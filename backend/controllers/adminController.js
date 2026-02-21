const Player = require('../models/Player');
const Item = require('../models/Item');
const BankAccount = require('../models/Bank');
const stocksCfg = require('../config/stocks');
const playerTitles = require('../config/playerTitles');
const { getLatestPrice } = require('../services/stockService');
const { calculatePayout } = require('../services/bankService');
const mongoose = require('mongoose');
const StockPrice = require('../models/StockPrice');
const StockEvent = require('../models/StockEvent');
const Cartel = require('../models/Cartel');
const { REP_LEVELS } = require('../config/cartel');
const { getRepLevel, getRepInfo } = require('../services/cartel/cartelService');

async function getAdminPlayerFromReq(req) {
  const userId = req.authUserId;
  if (!userId) throw new Error('Unauthorized');
  const adminPlayer = await Player.findOne({ user: userId });
  if (!adminPlayer) throw new Error('Admin player not found');
  if (!['Admin', 'Developer'].includes(adminPlayer.playerRole)) throw new Error('Forbidden');
  return adminPlayer;
}

// PATCH /api/admin/currency { adminUserId, targetUserId, moneyDelta, pointsDelta, meritsDelta, xmasCoinsDelta, halloweenCoinsDelta, easterCoinsDelta }
async function adjustCurrency(req, res) {
  try {
  const { targetUserId } = req.body;
  if (!targetUserId) return res.status(400).json({ error: 'targetUserId is required' });
  await getAdminPlayerFromReq(req);
    const player = await Player.findOne({ user: targetUserId });
    if (!player) return res.status(404).json({ error: 'Target player not found' });

    const fields = ['money','points','merits','xmasCoins','halloweenCoins','easterCoins'];
    for (const f of fields) {
      const key = f + 'Delta';
      if (typeof req.body[key] !== 'undefined') {
        player[f] = Number(player[f] || 0) + Number(req.body[key] || 0);
      }
    }
    await player.save();
    return res.json({
      money: player.money,
      points: player.points,
      merits: player.merits,
      xmasCoins: player.xmasCoins,
      halloweenCoins: player.halloweenCoins,
      easterCoins: player.easterCoins,
    });
  } catch (err) {
    if (err.message === 'Unauthorized') return res.status(401).json({ error: 'Unauthorized' });
    if (err.message === 'Forbidden') return res.status(403).json({ error: 'Not authorized' });
    if (err.message.includes('not found')) return res.status(404).json({ error: err.message });
    console.error('ADMIN adjustCurrency error:', err);
    return res.status(500).json({ error: 'Failed to adjust currency' });
  }
}

// PATCH /api/admin/xp { adminUserId, targetUserId, expDelta }
async function adjustExp(req, res) {
  try {
  const { targetUserId, expDelta } = req.body;
  if (!targetUserId || typeof expDelta === 'undefined') return res.status(400).json({ error: 'targetUserId and expDelta are required' });
  await getAdminPlayerFromReq(req);
    const player = await Player.findOne({ user: targetUserId });
    if (!player) return res.status(404).json({ error: 'Target player not found' });
    player.exp = Number(player.exp || 0) + Number(expDelta || 0);
    await player.save();
    return res.json({ exp: player.exp });
  } catch (err) {
    if (err.message === 'Unauthorized') return res.status(401).json({ error: 'Unauthorized' });
    if (err.message === 'Forbidden') return res.status(403).json({ error: 'Not authorized' });
    console.error('ADMIN adjustExp error:', err);
    return res.status(500).json({ error: 'Failed to adjust exp' });
  }
}

// PATCH /api/admin/level { adminUserId, targetUserId, level }
async function setLevel(req, res) {
  try {
  const { targetUserId, level } = req.body;
  if (!targetUserId || !Number.isFinite(Number(level))) return res.status(400).json({ error: 'targetUserId and level are required' });
  await getAdminPlayerFromReq(req);
    const player = await Player.findOne({ user: targetUserId });
    if (!player) return res.status(404).json({ error: 'Target player not found' });
    player.level = Math.max(1, Math.floor(Number(level)));
    await player.save();
    return res.json({ level: player.level });
  } catch (err) {
    if (err.message === 'Unauthorized') return res.status(401).json({ error: 'Unauthorized' });
    if (err.message === 'Forbidden') return res.status(403).json({ error: 'Not authorized' });
    console.error('ADMIN setLevel error:', err);
    return res.status(500).json({ error: 'Failed to set level' });
  }
}

// PATCH /api/admin/resources { adminUserId, targetUserId, energyDelta, nerveDelta, happyDelta }
async function adjustResources(req, res) {
  try {
  const { targetUserId } = req.body;
  if (!targetUserId) return res.status(400).json({ error: 'targetUserId is required' });
  await getAdminPlayerFromReq(req);
    const player = await Player.findOne({ user: targetUserId });
    if (!player) return res.status(404).json({ error: 'Target player not found' });
    const { energyDelta=0, nerveDelta=0, happyDelta=0 } = req.body;
    // Energy
    if (energyDelta) {
      const eMax = player.energyStats?.energyMax ?? 0;
      const e = Math.max(player.energyStats?.energyMin ?? 0, Math.min(eMax, (player.energyStats?.energy ?? 0) + Number(energyDelta)));
      player.energyStats.energy = e;
    }
    if (nerveDelta) {
      const nMax = player.nerveStats?.nerveMax ?? 0;
      const n = Math.max(player.nerveStats?.nerveMin ?? 0, Math.min(nMax, (player.nerveStats?.nerve ?? 0) + Number(nerveDelta)));
      player.nerveStats.nerve = n;
    }
    if (happyDelta) {
      const hMax = player.happiness?.happyMax ?? 0;
      const h = Math.max(player.happiness?.happyMin ?? 0, Math.min(hMax, (player.happiness?.happy ?? 0) + Number(happyDelta)));
      player.happiness.happy = h;
    }
    await player.save();
    return res.json({ energy: player.energyStats.energy, nerve: player.nerveStats.nerve, happy: player.happiness.happy });
  } catch (err) {
    if (err.message === 'Unauthorized') return res.status(401).json({ error: 'Unauthorized' });
    if (err.message === 'Forbidden') return res.status(403).json({ error: 'Not authorized' });
    console.error('ADMIN adjustResources error:', err);
    return res.status(500).json({ error: 'Failed to adjust resources' });
  }
}

// POST /api/admin/inventory/add { adminUserId, targetUserId, itemId, qty }
// POST /api/admin/inventory/remove { adminUserId, targetUserId, itemId, qty }
async function inventoryAdd(req, res) {
  try {
  const { targetUserId, itemId, qty } = req.body;
    const quantity = Math.max(1, Number(qty || 1));
  if (!targetUserId || !itemId) return res.status(400).json({ error: 'targetUserId and itemId are required' });
  await getAdminPlayerFromReq(req);
    const [player, item] = await Promise.all([
      Player.findOne({ user: targetUserId }),
      (async () => {
        // Accept either Mongo _id or custom Item.id
        if (mongoose.Types.ObjectId.isValid(itemId)) {
          const byMongoId = await Item.findById(itemId);
          if (byMongoId) return byMongoId;
        }
        // Fallback: match by custom string id (store as string)
        return await Item.findOne({ id: String(itemId) });
      })()
    ]);
    if (!player) return res.status(404).json({ error: 'Target player not found' });
    if (!item) return res.status(404).json({ error: 'Item not found' });

    const idx = (player.inventory || []).findIndex(e => String(e.item) === String(item._id));
    if (idx >= 0) player.inventory[idx].qty = Number(player.inventory[idx].qty || 0) + quantity;
    else player.inventory.push({ item: item._id, qty: quantity });
    await player.save();
    return res.json({ inventory: player.inventory });
  } catch (err) {
    if (err.message === 'Unauthorized') return res.status(401).json({ error: 'Unauthorized' });
    if (err.message === 'Forbidden') return res.status(403).json({ error: 'Not authorized' });
    console.error('ADMIN inventoryAdd error:', err);
    return res.status(500).json({ error: 'Failed to add to inventory' });
  }
}

async function inventoryRemove(req, res) {
  try {
  const { targetUserId, itemId, qty } = req.body;
    const quantity = Math.max(1, Number(qty || 1));
  if (!targetUserId || !itemId) return res.status(400).json({ error: 'targetUserId and itemId are required' });
  await getAdminPlayerFromReq(req);
    const [player, item] = await Promise.all([
      Player.findOne({ user: targetUserId }),
      (async () => {
        if (mongoose.Types.ObjectId.isValid(itemId)) {
          const byMongoId = await Item.findById(itemId);
          if (byMongoId) return byMongoId;
        }
        return await Item.findOne({ id: String(itemId) });
      })()
    ]);
    if (!player) return res.status(404).json({ error: 'Target player not found' });
    if (!item) return res.status(404).json({ error: 'Item not found' });

    const idx = (player.inventory || []).findIndex(e => String(e.item) === String(item._id));
    if (idx < 0) return res.status(404).json({ error: 'Item not in inventory' });
    player.inventory[idx].qty = Math.max(0, Number(player.inventory[idx].qty || 0) - quantity);
    if (player.inventory[idx].qty <= 0) player.inventory.splice(idx, 1);
    await player.save();
    return res.json({ inventory: player.inventory });
  } catch (err) {
    if (err.message === 'Unauthorized') return res.status(401).json({ error: 'Unauthorized' });
    if (err.message === 'Forbidden') return res.status(403).json({ error: 'Not authorized' });
    console.error('ADMIN inventoryRemove error:', err);
    return res.status(500).json({ error: 'Failed to remove from inventory' });
  }
}

// POST /api/admin/stocks/add { adminUserId, targetUserId, symbol, shares, avgPrice? }
// POST /api/admin/stocks/remove { adminUserId, targetUserId, symbol, shares }
async function stocksAdd(req, res) {
  try {
  const { targetUserId, symbol } = req.body;
    let { shares, avgPrice } = req.body;
    const sym = (symbol || '').toUpperCase();
  if (!targetUserId || !sym) return res.status(400).json({ error: 'targetUserId and symbol are required' });
  await getAdminPlayerFromReq(req);
    if (!stocksCfg[sym]) return res.status(400).json({ error: 'Unknown symbol' });
    const player = await Player.findOne({ user: targetUserId });
    if (!player) return res.status(404).json({ error: 'Target player not found' });
    const qty = Math.max(1, Number(shares || 0));
    if (!avgPrice) {
      const last = await getLatestPrice(sym);
      avgPrice = Number(last.price || 0);
    }
    const idx = (player.portfolio || []).findIndex(h => h.symbol === sym);
    if (idx >= 0) {
      const h = player.portfolio[idx];
      const newShares = Number(h.shares || 0) + qty;
      const newAvg = newShares > 0 ? Number(((h.avgPrice*h.shares + avgPrice*qty)/newShares).toFixed(4)) : avgPrice;
      h.shares = newShares; h.avgPrice = newAvg;
    } else {
      player.portfolio.push({ symbol: sym, shares: qty, avgPrice });
    }
    await player.save();
    return res.json({ portfolio: player.portfolio });
  } catch (err) {
    if (err.message === 'Unauthorized') return res.status(401).json({ error: 'Unauthorized' });
    if (err.message === 'Forbidden') return res.status(403).json({ error: 'Not authorized' });
    console.error('ADMIN stocksAdd error:', err);
    return res.status(500).json({ error: 'Failed to add stocks' });
  }
}

async function stocksRemove(req, res) {
  try {
  const { targetUserId, symbol, shares } = req.body;
    const sym = (symbol || '').toUpperCase();
  if (!targetUserId || !sym) return res.status(400).json({ error: 'targetUserId and symbol are required' });
  await getAdminPlayerFromReq(req);
    const qty = Math.max(1, Number(shares || 0));
    const player = await Player.findOne({ user: targetUserId });
    if (!player) return res.status(404).json({ error: 'Target player not found' });
    const idx = (player.portfolio || []).findIndex(h => h.symbol === sym);
    if (idx < 0) return res.status(404).json({ error: 'No holdings for this symbol' });
    const h = player.portfolio[idx];
    h.shares = Number((Number(h.shares || 0) - qty).toFixed(8));
    if (h.shares <= 0) player.portfolio.splice(idx, 1);
    await player.save();
    return res.json({ portfolio: player.portfolio });
  } catch (err) {
    if (err.message === 'Unauthorized') return res.status(401).json({ error: 'Unauthorized' });
    if (err.message === 'Forbidden') return res.status(403).json({ error: 'Not authorized' });
    console.error('ADMIN stocksRemove error:', err);
    return res.status(500).json({ error: 'Failed to remove stocks' });
  }
}

// POST /api/admin/bank/force-withdraw { adminUserId, targetUserId, accountId }
async function bankForceWithdraw(req, res) {
  try {
  const { targetUserId, accountId } = req.body;
  if (!targetUserId || !accountId) return res.status(400).json({ error: 'targetUserId and accountId are required' });
  await getAdminPlayerFromReq(req);
    const player = await Player.findOne({ user: targetUserId });
    if (!player) return res.status(404).json({ error: 'Target player not found' });
    const acct = await BankAccount.findOne({ _id: accountId, player: player._id });
    if (!acct) return res.status(404).json({ error: 'Account not found' });
    if (acct.isWithdrawn) return res.status(400).json({ error: 'Already withdrawn' });

    const { total, interest } = calculatePayout(acct.depositedAmount, acct.interestRate, acct.period);
    acct.isWithdrawn = true;
    await acct.save();
    player.money = Number(((player.money || 0) + total).toFixed(2));
    await player.save();
    return res.json({ money: player.money, payout: { principal: acct.depositedAmount, interest, total }, account: acct.toObject() });
  } catch (err) {
    if (err.message === 'Unauthorized') return res.status(401).json({ error: 'Unauthorized' });
    if (err.message === 'Forbidden') return res.status(403).json({ error: 'Not authorized' });
    console.error('ADMIN bankForceWithdraw error:', err);
    return res.status(500).json({ error: 'Failed to force withdraw' });
  }
}

// GET /api/admin/players/search?adminUserId=...&q=...&limit=20
async function searchPlayers(req, res) {
  try {
  const { q, limit } = req.query;
    if (!q || !q.trim()) return res.status(400).json({ error: 'q is required' });
  await getAdminPlayerFromReq(req);
    const query = q.trim();

    const or = [];
    // name regex (case-insensitive, contains)
    or.push({ name: { $regex: query, $options: 'i' } });
    // numeric player.id
    const n = Number(query);
    if (Number.isFinite(n)) or.push({ id: n });
    // user ObjectId or player _id
    if (mongoose.Types.ObjectId.isValid(query)) {
      or.push({ user: query });
      or.push({ _id: query });
    }

    const max = Math.min(50, Math.max(1, Number(limit || 20)));
    const players = await Player.find({ $or: or })
      .sort({ id: 1 })
      .limit(max)
      .select({ name: 1, id: 1, user: 1, npc: 1, playerRole: 1 })
      .lean();

    return res.json({ results: players.map(p => ({
      playerId: String(p._id),
      userId: String(p.user),
      id: p.id,
      name: p.name,
      npc: !!p.npc,
      role: p.playerRole,
    })) });
  } catch (err) {
    if (err.message === 'Unauthorized') return res.status(401).json({ error: 'Unauthorized' });
    if (err.message === 'Forbidden') return res.status(403).json({ error: 'Not authorized' });
    console.error('ADMIN searchPlayers error:', err);
    return res.status(500).json({ error: 'Failed to search players' });
  }
}

// POST /api/admin/stocks/crash { adminUserId, symbol? }
async function stocksCrash(req, res) {
  try {
    await getAdminPlayerFromReq(req);
    const onlySymbol = (req.body?.symbol || '').toUpperCase();
    const symbols = onlySymbol && stocksCfg[onlySymbol] ? [onlySymbol] : Object.keys(stocksCfg);
    const results = [];
    for (const s of symbols) {
      const last = await getLatestPrice(s);
      const cfg = stocksCfg[s];
      const decimals = Number.isInteger(cfg.decimals) ? cfg.decimals : 2;
      const pct = 0.4 + Math.random() * 0.5; // 40% to 90%
      const newPrice = Math.max(Math.pow(10, -decimals), Number((last.price * (1 - pct)).toFixed(decimals)));
      await StockPrice.create({ symbol: s, price: newPrice, ts: new Date() });
      // Register crash event with baseline as pre-crash price
      await StockEvent.create({ symbol: s, type: 'crash', baselinePrice: last.price });
      results.push({ symbol: s, from: last.price, to: newPrice, changePct: Number((-(pct*100)).toFixed(2)) });
    }
    return res.json({ results });
  } catch (err) {
    if (err.message === 'Unauthorized') return res.status(401).json({ error: 'Unauthorized' });
    if (err.message === 'Forbidden') return res.status(403).json({ error: 'Not authorized' });
    console.error('ADMIN stocksCrash error:', err);
    return res.status(500).json({ error: 'Failed to apply crash' });
  }
}

// POST /api/admin/stocks/rocket { adminUserId, symbol? }
async function stocksRocket(req, res) {
  try {
    await getAdminPlayerFromReq(req);
    const onlySymbol = (req.body?.symbol || '').toUpperCase();
    const symbols = onlySymbol && stocksCfg[onlySymbol] ? [onlySymbol] : Object.keys(stocksCfg);
    const results = [];
    for (const s of symbols) {
      const last = await getLatestPrice(s);
      const cfg = stocksCfg[s];
      const decimals = Number.isInteger(cfg.decimals) ? cfg.decimals : 2;
      const pct = 0.4 + Math.random() * 0.9; // +40% to +130%
      const newPrice = Math.max(Math.pow(10, -decimals), Number((last.price * (1 + pct)).toFixed(decimals)));
      await StockPrice.create({ symbol: s, price: newPrice, ts: new Date() });
      // Optionally record event; no reversion required by spec
      results.push({ symbol: s, from: last.price, to: newPrice, changePct: Number(((pct*100)).toFixed(2)) });
    }
    return res.json({ results });
  } catch (err) {
    if (err.message === 'Unauthorized') return res.status(401).json({ error: 'Unauthorized' });
    if (err.message === 'Forbidden') return res.status(403).json({ error: 'Not authorized' });
    console.error('ADMIN stocksRocket error:', err);
    return res.status(500).json({ error: 'Failed to apply rocket' });
  }
}


// POST /api/admin/general/energy-max { adminUserId, includeNPC? }
async function setAllEnergyToMax(req, res) {
  try {
    await getAdminPlayerFromReq(req);
    const includeNPC = String(req.body?.includeNPC).toLowerCase() === 'true' || req.body?.includeNPC === true;
    const filter = includeNPC ? {} : { npc: { $ne: true } };
    // Use pipeline update to copy energyMax into energy
    const result = await Player.updateMany(filter, [
      { $set: { 'energyStats.energy': '$energyStats.energyMax' } }
    ]);
    const matched = result.matchedCount ?? result.n ?? 0;
    const modified = result.modifiedCount ?? result.nModified ?? 0;
    return res.json({ matched, modified });
  } catch (err) {
    if (err.message === 'Unauthorized') return res.status(401).json({ error: 'Unauthorized' });
    if (err.message === 'Forbidden') return res.status(403).json({ error: 'Not authorized' });
    console.error('ADMIN setAllEnergyToMax error:', err);
    return res.status(500).json({ error: 'Failed to set energy to max' });
  }
}

// POST /api/admin/general/give-money { adminUserId, amount, includeNPC? }
async function giveMoneyToAll(req, res) {
  try {
    await getAdminPlayerFromReq(req);
    const amount = Number(req.body?.amount);
    if (!Number.isFinite(amount)) return res.status(400).json({ error: 'amount is required' });
    const includeNPC = String(req.body?.includeNPC).toLowerCase() === 'true' || req.body?.includeNPC === true;
    const filter = includeNPC ? {} : { npc: { $ne: true } };
    const result = await Player.updateMany(filter, { $inc: { money: amount } });
    const matched = result.matchedCount ?? result.n ?? 0;
    const modified = result.modifiedCount ?? result.nModified ?? 0;
    return res.json({ matched, modified, amountApplied: amount });
  } catch (err) {
    if (err.message === 'Unauthorized') return res.status(401).json({ error: 'Unauthorized' });
    if (err.message === 'Forbidden') return res.status(403).json({ error: 'Not authorized' });
    console.error('ADMIN giveMoneyToAll error:', err);
    return res.status(500).json({ error: 'Failed to give money to all' });
  }
}

module.exports = {
  adjustCurrency,
  adjustExp,
  setLevel,
  adjustResources,
  setBattleStats,
  setWorkStats,
  setPlayerName,
  inventoryAdd,
  inventoryRemove,
  stocksAdd,
  stocksRemove,
  bankForceWithdraw,
  searchPlayers,
  setAllEnergyToMax,
  giveMoneyToAll,
  stocksCrash,
  stocksRocket,
  // moderation & management
  setPlayerStatus,
  setPlayerTitle,
  setPlayerRole,
  listPlayerTitles,
  setAddiction,
  // cooldowns
  getPlayerCooldowns,
  setPlayerCooldown,
  clearPlayerCooldown,
  resetAllCooldowns,
  // cartel
  setCartelRep,
  // database
  purgeDatabase,
};

// ------------------------------
// Moderation & metadata
// ------------------------------

// PATCH /api/admin/player/name { adminUserId, targetUserId, name }
async function setPlayerName(req, res) {
  try {
    const { targetUserId, name } = req.body;
    if (!targetUserId || !name) return res.status(400).json({ error: 'targetUserId and name are required' });
    await getAdminPlayerFromReq(req);
    const trimmed = String(name).trim();
    if (trimmed.length < 3 || trimmed.length > 32) return res.status(400).json({ error: 'Name must be 3-32 characters' });
    const player = await Player.findOne({ user: targetUserId });
    if (!player) return res.status(404).json({ error: 'Target player not found' });
    player.name = trimmed;
    await player.save();
    return res.json({ name: player.name });
  } catch (err) {
    if (err.message === 'Unauthorized') return res.status(401).json({ error: 'Unauthorized' });
    if (err.message === 'Forbidden') return res.status(403).json({ error: 'Not authorized' });
    console.error('ADMIN setPlayerName error:', err);
    return res.status(500).json({ error: 'Failed to set name' });
  }
}

// PATCH /api/admin/stats/battle { adminUserId, targetUserId, strength?, speed?, dexterity?, defense? }
async function setBattleStats(req, res) {
  try {
    const { targetUserId } = req.body;
    if (!targetUserId) return res.status(400).json({ error: 'targetUserId is required' });
    await getAdminPlayerFromReq(req);
    const player = await Player.findOne({ user: targetUserId });
    if (!player) return res.status(404).json({ error: 'Target player not found' });
    const allowed = ['strength','speed','dexterity','defense'];
    for (const k of allowed) {
      if (typeof req.body[k] !== 'undefined') {
        const v = Math.max(0, Number(req.body[k]));
        player.battleStats[k] = Number.isFinite(v) ? v : player.battleStats[k];
      }
    }
    await player.save();
    return res.json({ battleStats: player.battleStats });
  } catch (err) {
    if (err.message === 'Unauthorized') return res.status(401).json({ error: 'Unauthorized' });
    if (err.message === 'Forbidden') return res.status(403).json({ error: 'Not authorized' });
    console.error('ADMIN setBattleStats error:', err);
    return res.status(500).json({ error: 'Failed to set battle stats' });
  }
}

// PATCH /api/admin/stats/work { adminUserId, targetUserId, manuallabor?, intelligence?, endurance?, employeEfficiency? }
async function setWorkStats(req, res) {
  try {
    const { targetUserId } = req.body;
    if (!targetUserId) return res.status(400).json({ error: 'targetUserId is required' });
    await getAdminPlayerFromReq(req);
    const player = await Player.findOne({ user: targetUserId });
    if (!player) return res.status(404).json({ error: 'Target player not found' });
    const allowed = ['manuallabor','intelligence','endurance','employeEfficiency'];
    for (const k of allowed) {
      if (typeof req.body[k] !== 'undefined') {
        const v = Math.max(0, Number(req.body[k]));
        player.workStats[k] = Number.isFinite(v) ? v : player.workStats[k];
      }
    }
    await player.save();
    return res.json({ workStats: player.workStats });
  } catch (err) {
    if (err.message === 'Unauthorized') return res.status(401).json({ error: 'Unauthorized' });
    if (err.message === 'Forbidden') return res.status(403).json({ error: 'Not authorized' });
    console.error('ADMIN setWorkStats error:', err);
    return res.status(500).json({ error: 'Failed to set work stats' });
  }
}

// PATCH /api/admin/player/status { adminUserId, targetUserId, status }
async function setPlayerStatus(req, res) {
  try {
    const { targetUserId, status } = req.body;
    if (!targetUserId || !status) return res.status(400).json({ error: 'targetUserId and status are required' });
    await getAdminPlayerFromReq(req);
    const allowed = ["Active","Banned","Suspended","Abandoned"];
    if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid status' });
    const player = await Player.findOne({ user: targetUserId });
    if (!player) return res.status(404).json({ error: 'Target player not found' });
    player.playerStatus = status;
    await player.save();
    return res.json({ playerStatus: player.playerStatus });
  } catch (err) {
    if (err.message === 'Unauthorized') return res.status(401).json({ error: 'Unauthorized' });
    if (err.message === 'Forbidden') return res.status(403).json({ error: 'Not authorized' });
    console.error('ADMIN setPlayerStatus error:', err);
    return res.status(500).json({ error: 'Failed to set player status' });
  }
}

// PATCH /api/admin/player/title { adminUserId, targetUserId, title }
async function setPlayerTitle(req, res) {
  try {
    const { targetUserId, title } = req.body;
    if (!targetUserId || !title) return res.status(400).json({ error: 'targetUserId and title are required' });
    await getAdminPlayerFromReq(req);
    if (!playerTitles.includes(title)) return res.status(400).json({ error: 'Invalid title' });
    const player = await Player.findOne({ user: targetUserId });
    if (!player) return res.status(404).json({ error: 'Target player not found' });
    player.playerTitle = title;
    await player.save();
    return res.json({ playerTitle: player.playerTitle });
  } catch (err) {
    if (err.message === 'Unauthorized') return res.status(401).json({ error: 'Unauthorized' });
    if (err.message === 'Forbidden') return res.status(403).json({ error: 'Not authorized' });
    console.error('ADMIN setPlayerTitle error:', err);
    return res.status(500).json({ error: 'Failed to set player title' });
  }
}

// PATCH /api/admin/player/role { adminUserId, targetUserId, role }
async function setPlayerRole(req, res) {
  try {
    const { targetUserId, role } = req.body;
    if (!targetUserId || !role) return res.status(400).json({ error: 'targetUserId and role are required' });
    const adminPlayer = await getAdminPlayerFromReq(req);
    // Only Developers can set role to Developer; Admin can set up to Admin
    const allowedRoles = ["Player","Moderator","Admin","Developer"];
    if (!allowedRoles.includes(role)) return res.status(400).json({ error: 'Invalid role' });
    if (role === 'Developer' && adminPlayer.playerRole !== 'Developer') return res.status(403).json({ error: 'Only Developers can assign Developer role' });
    const player = await Player.findOne({ user: targetUserId });
    if (!player) return res.status(404).json({ error: 'Target player not found' });
    // Prevent non-Developer from changing a Developer
    if (player.playerRole === 'Developer' && adminPlayer.playerRole !== 'Developer') return res.status(403).json({ error: 'Cannot modify Developer role' });
    player.playerRole = role;
    await player.save();
    return res.json({ playerRole: player.playerRole });
  } catch (err) {
    if (err.message === 'Unauthorized') return res.status(401).json({ error: 'Unauthorized' });
    if (err.message === 'Forbidden') return res.status(403).json({ error: 'Not authorized' });
    console.error('ADMIN setPlayerRole error:', err);
    return res.status(500).json({ error: 'Failed to set player role' });
  }
}

// GET /api/admin/player/titles
async function listPlayerTitles(_req, res) {
  try {
    return res.json({ titles: playerTitles });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to list titles' });
  }
}

// PATCH /api/admin/player/addiction { adminUserId, targetUserId, value }
async function setAddiction(req, res) {
  try {
    const { targetUserId, value } = req.body;
    if (!targetUserId || typeof value === 'undefined') return res.status(400).json({ error: 'targetUserId and value are required' });
    await getAdminPlayerFromReq(req);
    const v = Math.max(0, Math.min(99999, Number(value)));
    const player = await Player.findOneAndUpdate({ user: targetUserId }, { $set: { addiction: v } }, { new: true }).lean();
    if (!player) return res.status(404).json({ error: 'Target player not found' });
    return res.json({ addiction: player.addiction || v });
  } catch (err) {
    if (err.message === 'Unauthorized') return res.status(401).json({ error: 'Unauthorized' });
    if (err.message === 'Forbidden') return res.status(403).json({ error: 'Not authorized' });
    console.error('ADMIN setAddiction error:', err);
    return res.status(500).json({ error: 'Failed to set addiction' });
  }
}

// ------------------------------
// Cooldowns
// ------------------------------

// GET /api/admin/player/cooldowns/:userId
async function getPlayerCooldowns(req, res) {
  try {
    await getAdminPlayerFromReq(req);
    const userId = req.params.userId;
    const player = await Player.findOne({ user: userId }).lean();
    if (!player) return res.status(404).json({ error: 'Target player not found' });
    const cd = player.cooldowns || {};
    const summary = {
      drugCooldown: Number(cd.drugCooldown || 0),
      medicalCooldown: Number(cd.medicalCooldown || 0),
      boosterCooldown: Number(cd.boosterCooldown || 0),
      alcoholCooldown: Number(cd.alcoholCooldown || 0),
      drugs: Object.fromEntries(Object.entries((cd.drugs||{})).map(([k,v])=>[k,Number(v||0)])),
    };
    return res.json({ cooldowns: summary });
  } catch (err) {
    if (err.message === 'Unauthorized') return res.status(401).json({ error: 'Unauthorized' });
    if (err.message === 'Forbidden') return res.status(403).json({ error: 'Not authorized' });
    console.error('ADMIN getPlayerCooldowns error:', err);
    return res.status(500).json({ error: 'Failed to get cooldowns' });
  }
}

// POST /api/admin/player/cooldowns/set { adminUserId, targetUserId, category, seconds }
// category in ['drug','medical','booster','alcohol']
async function setPlayerCooldown(req, res) {
  try {
    const { targetUserId, category } = req.body;
    let { seconds } = req.body;
    if (!targetUserId || !category) return res.status(400).json({ error: 'targetUserId and category are required' });
    await getAdminPlayerFromReq(req);
    const catMap = {
      drug: 'cooldowns.drugCooldown',
      medical: 'cooldowns.medicalCooldown',
      booster: 'cooldowns.boosterCooldown',
      alcohol: 'cooldowns.alcoholCooldown',
    };
    const path = catMap[category];
    if (!path) return res.status(400).json({ error: 'Invalid category' });
    seconds = Math.max(0, Number(seconds||0));
    const player = await Player.findOneAndUpdate(
      { user: targetUserId },
      { $set: { [path]: seconds } },
      { new: true }
    ).lean();
    if (!player) return res.status(404).json({ error: 'Target player not found' });
    return res.json({ ok: true, [category+'Cooldown']: seconds });
  } catch (err) {
    if (err.message === 'Unauthorized') return res.status(401).json({ error: 'Unauthorized' });
    if (err.message === 'Forbidden') return res.status(403).json({ error: 'Not authorized' });
    console.error('ADMIN setPlayerCooldown error:', err);
    return res.status(500).json({ error: 'Failed to set cooldown' });
  }
}

// POST /api/admin/player/cooldowns/clear { adminUserId, targetUserId, scope? }
// scope: 'all' | 'drug' | 'medical' | 'booster' | 'alcohol' | 'perDrug'
async function clearPlayerCooldown(req, res) {
  try {
    const { targetUserId } = req.body;
    let { scope } = req.body;
    if (!targetUserId) return res.status(400).json({ error: 'targetUserId is required' });
    await getAdminPlayerFromReq(req);
    scope = scope || 'all';
    const update = {};
    if (scope === 'all' || scope === 'drug') update['cooldowns.drugCooldown'] = 0;
    if (scope === 'all' || scope === 'medical') update['cooldowns.medicalCooldown'] = 0;
    if (scope === 'all' || scope === 'booster') update['cooldowns.boosterCooldown'] = 0;
    if (scope === 'all' || scope === 'alcohol') update['cooldowns.alcoholCooldown'] = 0;
    if (scope === 'all' || scope === 'perDrug') update['cooldowns.drugs'] = {};
    const player = await Player.findOneAndUpdate({ user: targetUserId }, { $set: update }, { new: true }).lean();
    if (!player) return res.status(404).json({ error: 'Target player not found' });
    return res.json({ ok: true, cleared: scope });
  } catch (err) {
    if (err.message === 'Unauthorized') return res.status(401).json({ error: 'Unauthorized' });
    if (err.message === 'Forbidden') return res.status(403).json({ error: 'Not authorized' });
    console.error('ADMIN clearPlayerCooldown error:', err);
    return res.status(500).json({ error: 'Failed to clear cooldowns' });
  }
}

// POST /api/admin/cooldowns/reset-all { adminUserId, includeNPC? }
async function resetAllCooldowns(req, res) {
  try {
    await getAdminPlayerFromReq(req);
    const includeNPC = String(req.body?.includeNPC).toLowerCase() === 'true' || req.body?.includeNPC === true;
    const filter = includeNPC ? {} : { npc: { $ne: true } };
    const update = {
      $set: {
        'cooldowns.medicalCooldown': 0,
        'cooldowns.drugCooldown': 0,
        'cooldowns.boosterCooldown': 0,
        'cooldowns.alcoholCooldown': 0,
        'cooldowns.drugs': {},
      }
    };
    const result = await Player.updateMany(filter, update);
    const matched = result.matchedCount ?? result.n ?? 0;
    const modified = result.modifiedCount ?? result.nModified ?? 0;
    return res.json({ matched, modified });
  } catch (err) {
    if (err.message === 'Unauthorized') return res.status(401).json({ error: 'Unauthorized' });
    if (err.message === 'Forbidden') return res.status(403).json({ error: 'Not authorized' });
    console.error('ADMIN resetAllCooldowns error:', err);
    return res.status(500).json({ error: 'Failed to reset cooldowns' });
  }
}

// ------------------------------
// Cartel reputation
// ------------------------------

// PATCH /api/admin/cartel/rep { adminUserId, targetUserId, reputation?, repLevel? }
async function setCartelRep(req, res) {
  try {
    const { targetUserId } = req.body;
    if (!targetUserId) return res.status(400).json({ error: 'targetUserId is required' });
    await getAdminPlayerFromReq(req);

    // Find the cartel owned by target player
    const cartel = await Cartel.findOne({ ownerId: targetUserId });
    if (!cartel) return res.status(404).json({ error: 'Target player does not own a cartel' });

    let newRep = cartel.reputation;

    // If repLevel provided, set rep to that level's threshold
    if (typeof req.body.repLevel !== 'undefined') {
      const lvl = Math.max(0, Math.min(REP_LEVELS.length - 1, Number(req.body.repLevel)));
      newRep = REP_LEVELS[lvl].xpRequired;
    }
    // If explicit reputation provided, use that (overrides repLevel)
    if (typeof req.body.reputation !== 'undefined') {
      newRep = Math.max(0, Number(req.body.reputation));
    }

    cartel.reputation = Number.isFinite(newRep) ? newRep : cartel.reputation;
    cartel.repLevel = getRepLevel(cartel.reputation);
    await cartel.save();

    const info = getRepInfo(cartel.reputation);
    return res.json({
      cartelName: cartel.name,
      reputation: cartel.reputation,
      repLevel: cartel.repLevel,
      rankName: info.name,
    });
  } catch (err) {
    if (err.message === 'Unauthorized') return res.status(401).json({ error: 'Unauthorized' });
    if (err.message === 'Forbidden') return res.status(403).json({ error: 'Not authorized' });
    console.error('ADMIN setCartelRep error:', err);
    return res.status(500).json({ error: 'Failed to set cartel reputation' });
  }
}

// ------------------------------
// Database maintenance
// ------------------------------

// POST /api/admin/database/purge { adminUserId, confirm }
async function purgeDatabase(req, res) {
  try {
    const admin = await getAdminPlayerFromReq(req);
    if (admin.playerRole !== 'Developer') return res.status(403).json({ error: 'Only Developers can purge database' });
    const confirm = String(req.body?.confirm || '');
    if (confirm !== 'DROP') return res.status(400).json({ error: 'Confirmation required: set confirm to "DROP"' });
    const conn = mongoose.connection;
    if (!conn || !conn.db) return res.status(500).json({ error: 'No DB connection' });
    const dbName = conn.db.databaseName;
    await conn.dropDatabase();
    return res.json({ ok: true, dropped: dbName });
  } catch (err) {
    if (err.message === 'Unauthorized') return res.status(401).json({ error: 'Unauthorized' });
    if (err.message === 'Forbidden') return res.status(403).json({ error: 'Not authorized' });
    console.error('ADMIN purgeDatabase error:', err);
    return res.status(500).json({ error: 'Failed to purge database' });
  }
}
