const Player = require('../models/Player');
const Item = require('../models/Item');

// GET /api/inventory/:userId
async function getInventory(req, res) {
  try {
    const { userId } = req.params;
    const player = await Player.findOne({ user: userId }).populate('inventory.item');
    if (!player) return res.status(404).json({ error: 'Player not found' });
    return res.json({ inventory: player.inventory || [] });
  } catch (err) {
    console.error('getInventory error:', err);
    return res.status(500).json({ error: 'Failed to fetch inventory' });
  }
}

// POST /api/inventory/buy { userId, itemId, qty }
async function buyItem(req, res) {
  try {
    const { userId, itemId, qty } = req.body;
    const quantity = Math.max(1, Number(qty || 1));
    if (!userId || !itemId) return res.status(400).json({ error: 'userId and itemId are required' });

    const [player, item] = await Promise.all([
      Player.findOne({ user: userId }),
      Item.findById(itemId)
    ]);
    if (!player) return res.status(404).json({ error: 'Player not found' });
    if (!item) return res.status(404).json({ error: 'Item not found' });
    if (item.price == null) return res.status(400).json({ error: 'Item not for sale' });

    const total = Number(item.price) * quantity;
    if ((player.money || 0) < total) return res.status(400).json({ error: 'Not enough money' });

    // Deduct money and add to inventory (upsert)
    player.money = Number(player.money || 0) - total;
    const idx = (player.inventory || []).findIndex(e => String(e.item) === String(item._id));
    if (idx >= 0) {
      player.inventory[idx].qty = Number(player.inventory[idx].qty || 0) + quantity;
    } else {
      player.inventory.push({ item: item._id, qty: quantity });
    }
    await player.save();

    const populated = await Player.findById(player._id).populate('inventory.item');
    return res.json({ money: populated.money, inventory: populated.inventory });
  } catch (err) {
    console.error('buyItem error:', err);
    return res.status(500).json({ error: 'Failed to buy item' });
  }
}

module.exports = { getInventory, buyItem };
