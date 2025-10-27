const Player = require('../models/Player');
const Counter = require('../models/Counter');

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
