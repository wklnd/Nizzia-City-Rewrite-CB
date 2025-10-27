const Player = require('../models/Player');

async function getDevPlayer(userId) {
  // Find player by linked user ObjectId
  const player = await Player.findOne({ user: userId });
  if (!player) throw new Error('Player not found');
  if (player.playerRole !== 'Developer') throw new Error('Forbidden');
  return player;
}

// POST /api/dev/add-money { userId, amount }
async function addMoney(req, res) {
  try {
    const { userId, amount } = req.body;
    if (!userId || typeof amount === 'undefined') return res.status(400).json({ error: 'userId and amount are required' });
    const player = await getDevPlayer(userId);
    player.money = Number(player.money || 0) + Number(amount || 0);
    await player.save();
    return res.json({ money: player.money });
  } catch (err) {
    if (err.message === 'Forbidden') return res.status(403).json({ error: 'Not authorized' });
    if (err.message === 'Player not found') return res.status(404).json({ error: 'Player not found' });
    console.error('DEV addMoney error:', err);
    return res.status(500).json({ error: 'Failed to add money' });
  }
}

// POST /api/dev/add-energy { userId, amount }
async function addEnergy(req, res) {
  try {
    const { userId, amount } = req.body;
    if (!userId || typeof amount === 'undefined') return res.status(400).json({ error: 'userId and amount are required' });
    const player = await getDevPlayer(userId);
    const inc = Number(amount || 0);
    const eMax = player.energyStats?.energyMax ?? 0;
    player.energyStats.energy = Math.min(eMax, (player.energyStats?.energy ?? 0) + inc);
    await player.save();
    return res.json({ energy: player.energyStats.energy, energyMax: eMax });
  } catch (err) {
    if (err.message === 'Forbidden') return res.status(403).json({ error: 'Not authorized' });
    if (err.message === 'Player not found') return res.status(404).json({ error: 'Player not found' });
    console.error('DEV addEnergy error:', err);
    return res.status(500).json({ error: 'Failed to add energy' });
  }
}

// POST /api/dev/add-nerve { userId, amount }
async function addNerve(req, res) {
  try {
    const { userId, amount } = req.body;
    if (!userId || typeof amount === 'undefined') return res.status(400).json({ error: 'userId and amount are required' });
    const player = await getDevPlayer(userId);
    const inc = Number(amount || 0);
    const nMax = player.nerveStats?.nerveMax ?? 0;
    player.nerveStats.nerve = Math.min(nMax, (player.nerveStats?.nerve ?? 0) + inc);
    await player.save();
    return res.json({ nerve: player.nerveStats.nerve, nerveMax: nMax });
  } catch (err) {
    if (err.message === 'Forbidden') return res.status(403).json({ error: 'Not authorized' });
    if (err.message === 'Player not found') return res.status(404).json({ error: 'Player not found' });
    console.error('DEV addNerve error:', err);
    return res.status(500).json({ error: 'Failed to add nerve' });
  }
}

module.exports = { addMoney, addEnergy, addNerve };
