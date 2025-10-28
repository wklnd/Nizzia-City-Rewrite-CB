const Player = require('../models/Player');
const stocksCfg = require('../config/stocks');
const { listStocks, getLatestPrice, getHistory } = require('../services/stockService');

async function list(req, res) {
  try { res.json(await listStocks()); }
  catch (e) { res.status(500).json({ error: e.message }); }
}

async function quote(req, res) {
  try {
    const symbol = (req.params.symbol || '').toUpperCase();
    if (!stocksCfg[symbol]) return res.status(404).json({ error: 'Unknown symbol' });
    const last = await getLatestPrice(symbol);
    const history = await getHistory(symbol, req.query.range || '1d');
    res.json({ symbol, name: stocksCfg[symbol].name, price: last.price, history, decimals: Number.isInteger(stocksCfg[symbol].decimals) ? stocksCfg[symbol].decimals : 2 });
  } catch (e) { res.status(500).json({ error: e.message }); }
}

async function portfolio(req, res) {
  try {
    const { userId } = req.params;
    const player = await Player.findOne({ user: userId }).lean();
    if (!player) return res.status(404).json({ error: 'Player not found' });
    const holdings = player.portfolio || [];
    const enriched = [];
    for (const h of holdings) {
      const last = await getLatestPrice(h.symbol);
      const value = Number((h.shares * last.price).toFixed(2));
      enriched.push({ ...h, currentPrice: last.price, value });
    }
    res.json({ money: player.money, holdings: enriched });
  } catch (e) { res.status(500).json({ error: e.message }); }
}

async function buy(req, res) {
  try {
    const { userId, symbol, shares } = req.body;
    const qty = Math.max(1, Number(shares || 0));
    const sym = (symbol || '').toUpperCase();
    if (!stocksCfg[sym]) return res.status(400).json({ error: 'Unknown symbol' });
    const player = await Player.findOne({ user: userId });
    if (!player) return res.status(404).json({ error: 'Player not found' });
    const last = await getLatestPrice(sym);
    const cost = Number((qty * last.price).toFixed(2));
    if ((player.money || 0) < cost) return res.status(400).json({ error: 'Not enough money' });
    player.money = Number((player.money - cost).toFixed(2));
    const idx = (player.portfolio || []).findIndex(h => h.symbol === sym);
    if (idx >= 0) {
      const h = player.portfolio[idx];
      const newShares = Number(h.shares || 0) + qty;
      const newAvg = newShares > 0 ? Number(((h.avgPrice*h.shares + cost)/newShares).toFixed(4)) : last.price;
      h.shares = newShares; h.avgPrice = newAvg;
    } else {
      player.portfolio.push({ symbol: sym, shares: qty, avgPrice: last.price });
    }
    await player.save();
    return res.json({ money: player.money, holding: player.portfolio.find(h => h.symbol === sym) });
  } catch (e) { res.status(500).json({ error: e.message }); }
}

async function sell(req, res) {
  try {
    const { userId, symbol, shares } = req.body;
    const qty = Math.max(1, Number(shares || 0));
    const sym = (symbol || '').toUpperCase();
    const player = await Player.findOne({ user: userId });
    if (!player) return res.status(404).json({ error: 'Player not found' });
    const idx = (player.portfolio || []).findIndex(h => h.symbol === sym);
    if (idx < 0) return res.status(400).json({ error: 'No holdings for this symbol' });
    const h = player.portfolio[idx];
    if ((h.shares || 0) < qty) return res.status(400).json({ error: 'Not enough shares' });
    const last = await getLatestPrice(sym);
    const proceeds = Number((qty * last.price).toFixed(2));
    h.shares = Number((h.shares - qty).toFixed(8));
    if (h.shares <= 0) player.portfolio.splice(idx, 1);
    player.money = Number(((player.money || 0) + proceeds).toFixed(2));
    await player.save();
    return res.json({ money: player.money, proceeds, remaining: h.shares || 0 });
  } catch (e) { res.status(500).json({ error: e.message }); }
}

module.exports = { list, quote, portfolio, buy, sell };
