const Player = require('../models/Player');
const Item = require('../models/Item');
const mongoose = require('mongoose');

// GET /api/inventory/mine
async function getInventory(req, res) {
  try {
    const userId = req.authUserId;
    const player = await Player.findOne({ user: userId }).populate('inventory.item');
    if (!player) return res.status(404).json({ error: 'Player not found' });
    return res.json({ inventory: player.inventory || [] });
  } catch (err) {
    console.error('getInventory error:', err);
    return res.status(500).json({ error: 'Failed to fetch inventory' });
  }
}

// POST /api/inventory/buy { itemId, qty }
async function buyItem(req, res) {
  try {
    const userId = req.authUserId;
    const { itemId, qty } = req.body;
    const quantity = Math.max(1, Number(qty || 1));
    if (!itemId) return res.status(400).json({ error: 'itemId is required' });

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
    player.$locals._txMeta = { type: 'purchase', description: `Bought ${quantity}x ${item.name || 'item'}` };
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

async function sellItem(req, res) {
  try {
    const userId = req.authUserId;
    const { itemId, qty } = req.body;
    const quantity = Math.max(1, Number(qty || 1));
    if (!itemId) return res.status(400).json({ error: 'itemId is required' });

    const [player, item] = await Promise.all([
      Player.findOne({ user: userId }),
      Item.findById(itemId)
    ]);
    if (!player) return res.status(404).json({ error: 'Player not found' });
    if (!item) return res.status(404).json({ error: 'Item not found' });
    if (item.price == null) return res.status(400).json({ error: 'Item not for sale' });

    const idx = (player.inventory || []).findIndex(e => String(e.item) === String(item._id));
    if (idx < 0) return res.status(404).json({ error: 'Item not found in inventory' });

    const total = Number(item.price) * quantity;
    if ((player.inventory[idx].qty || 0) < quantity) return res.status(400).json({ error: 'Not enough item quantity' });

    // Update inventory and add money
    player.inventory[idx].qty = Number(player.inventory[idx].qty || 0) - quantity;
    player.$locals._txMeta = { type: 'sale', description: `Sold ${quantity}x ${item.name || 'item'}` };
    player.money = Number(player.money || 0) + total;

    await player.save();

    const populated = await Player.findById(player._id).populate('inventory.item');
    return res.json({ money: populated.money, inventory: populated.inventory });
  } catch (err) {
    console.error('sellItem error:', err);
    return res.status(500).json({ error: 'Failed to sell item' });
  }
}

module.exports = { getInventory, buyItem };
 
// POST /api/inventory/use { itemId, qty? }
async function useItemFromInventory(req, res) {
  try {
    const userId = req.authUserId;
    const { itemId } = req.body;
    const quantity = Math.max(1, Number(req.body?.qty || 1));
    if (!itemId) return res.status(400).json({ error: 'itemId is required' });

    // Resolve player by user id
    const player = await Player.findOne({ user: userId });
    if (!player) return res.status(404).json({ error: 'Player not found' });

    // Resolve item by Mongo _id or custom id
    let item = null;
    if (mongoose.Types.ObjectId.isValid(itemId)) item = await Item.findById(itemId);
    if (!item) item = await Item.findOne({ id: String(itemId) });
    if (!item) return res.status(404).json({ error: 'Item not found' });

    // Find inventory entry
    const inv = player.inventory || [];
    const idx = inv.findIndex(e => String(e.item) === String(item._id));
    if (idx < 0 || Number(inv[idx].qty || 0) < quantity) {
      return res.status(400).json({ error: 'Not enough quantity in inventory' });
    }

    // Apply item effects first; if it throws, do not consume
    const itemService = require('../services/itemService');
    let applyRes;
    try {
      applyRes = await itemService.applyItem(userId, item._id);
    } catch (err) {
      if (err && err.code === 'COOLDOWN') {
        return res.status(429).json({ error: 'Cooldown active', type: err.type, remaining: err.remaining });
      }
      throw err;
    }

    // Consume from inventory
    inv[idx].qty = Number(inv[idx].qty || 0) - quantity;
    if (inv[idx].qty <= 0) inv.splice(idx, 1);
    player.inventory = inv;
    await player.save();

    // Return updated inventory and effect result
    const populated = await Player.findById(player._id).populate('inventory.item');
    return res.json({ ...applyRes, inventory: populated.inventory });
  } catch (err) {
    console.error('useItemFromInventory error:', err);
    return res.status(500).json({ error: 'Failed to use item' });
  }
}

module.exports.useItemFromInventory = useItemFromInventory;
