const Player = require('../models/Player');
const Vault = require('../models/Vault');

function normalizeUserId(input){
  if (!input) return null;
  const n = Number(input);
  if (!Number.isNaN(n)) return { kind: 'playerId', value: n };
  return { kind: 'user', value: input };
}

async function findPlayerByAny(userId){
  const norm = normalizeUserId(userId);
  if (!norm) return null;
  if (norm.kind === 'playerId') return Player.findOne({ id: norm.value });
  return Player.findOne({ user: norm.value });
}

function hasVaultUpgrade(player){
  const homeId = player.home || 'trailer';
  const entry = (player.properties || []).find(p => p.propertyId === homeId);
  if (!entry) return false;
  const up = entry.upgrades || {};
  if (typeof up.get === 'function') return Number(up.get('vault') || 0) > 0;
  return Number(up['vault'] || 0) > 0;
}

async function getVault(req, res){
  try {
    const { userId } = Object.assign({}, req.params, req.query, req.body);
    if (!userId) return res.status(400).json({ error: 'userId is required' });
    const player = await findPlayerByAny(userId);
    if (!player) return res.status(404).json({ error: 'Player not found' });
    const allowed = hasVaultUpgrade(player);
    const vault = await Vault.findOne({ playerId: player._id });
    res.json({ balance: Number(vault?.balance || 0), hasVault: allowed, home: player.home });
  } catch (e){ res.status(400).json({ error: e.message }); }
}

async function deposit(req, res){
  try {
    const { userId, amount } = req.body || {};
    const amt = Math.floor(Number(amount||0));
    if (!userId || !Number.isFinite(amt) || amt <= 0) return res.status(400).json({ error: 'userId and positive amount required' });
    const player = await findPlayerByAny(userId);
    if (!player) return res.status(404).json({ error: 'Player not found' });
    if (!hasVaultUpgrade(player)) return res.status(403).json({ error: 'Vault upgrade required' });
    if (Number(player.money||0) < amt) return res.status(400).json({ error: 'Not enough cash' });

    player.money = Number(player.money||0) - amt;
    let vault = await Vault.findOne({ playerId: player._id });
    if (!vault) vault = await Vault.create({ playerId: player._id, balance: 0 });
    vault.balance = Number(vault.balance||0) + amt;
    await player.save();
    await vault.save();
    res.json({ ok: true, money: player.money, balance: vault.balance });
  } catch (e){ res.status(400).json({ error: e.message }); }
}

async function withdraw(req, res){
  try {
    const { userId, amount } = req.body || {};
    const amt = Math.floor(Number(amount||0));
    if (!userId || !Number.isFinite(amt) || amt <= 0) return res.status(400).json({ error: 'userId and positive amount required' });
    const player = await findPlayerByAny(userId);
    if (!player) return res.status(404).json({ error: 'Player not found' });
    if (!hasVaultUpgrade(player)) return res.status(403).json({ error: 'Vault upgrade required' });

    let vault = await Vault.findOne({ playerId: player._id });
    if (!vault || Number(vault.balance||0) < amt) return res.status(400).json({ error: 'Insufficient vault funds' });
    vault.balance = Number(vault.balance||0) - amt;
    player.money = Number(player.money||0) + amt;
    await vault.save();
    await player.save();
    res.json({ ok: true, money: player.money, balance: vault.balance });
  } catch (e){ res.status(400).json({ error: e.message }); }
}

module.exports = { getVault, deposit, withdraw };
