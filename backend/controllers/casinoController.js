const wheelSettings = require("../config/casino");
const Player = require("../models/Player");
const Item = require("../models/Item");
const propertyService = require('../services/propertyService');

function wheelReward(wheel) {  
  if (!wheelSettings[wheel]) {
    throw new Error(`Invalid wheel type: ${wheel}`);
  }

  const rewards = wheelSettings[wheel].rewards;
  const totalChance = rewards.reduce((acc, reward) => acc + reward.chance, 0);
  const randomChance = Math.random() * totalChance;

  let cumulativeChance = 0;
  for (const reward of rewards) {
    cumulativeChance += reward.chance;
    if (randomChance < cumulativeChance) {
      return reward;
    }
  }
  return null; // This should never happen if the chances are set up correctly
}

const spinWheel = async (req, res) => {
  try {
    const userId = req.authUserId;
    const { wheel } = req.body;
    if (!wheel) {
      return res.status(400).json({ error: "Wheel type is required" });
    }

    // Validate wheel type and get its cost
    const wheelConfig = wheelSettings[wheel];
    if (!wheelConfig) {
      return res.status(400).json({ error: "Invalid wheel type" });
    }
    const cost = wheelConfig.cost;

    // Resolve player by user ObjectId
    const player = await Player.findOne({ user: userId });
    if (!player) {
      return res.status(404).json({ error: "Player not found" });
    }

    // Enforce daily limit: one spin per wheel per 24 hours (Admins/Developers exempt)
    const now = new Date();
    const lastSpins = player.casino?.lastSpins;
    const isPrivileged = player.playerRole === 'Admin' || player.playerRole === 'Developer'
    let last = null;
    if (lastSpins) {
      if (typeof lastSpins.get === 'function') last = lastSpins.get(wheel) || null;
      else last = lastSpins[wheel] || null;
    }
    // Legacy fallback (global limit) if per-wheel not present
    if (!last && player.casino?.lastSpinAt) last = new Date(player.casino.lastSpinAt);
    if (!isPrivileged && last && (now.getTime() - new Date(last).getTime()) < 24 * 60 * 60 * 1000) {
      const msLeft = 24 * 60 * 60 * 1000 - (now.getTime() - new Date(last).getTime());
      const hours = Math.floor(msLeft / 3600000);
      const minutes = Math.floor((msLeft % 3600000) / 60000);
      return res.status(429).json({ error: `Daily limit reached. Try again in ${hours}h ${minutes}m.` });
    }

    // Check if the player has enough money
    if (player.money < cost) {
      return res.status(400).json({ error: "Not enough money to spin the wheel" });
    }

    // Deduct the cost from the player's money
    player.$locals._txMeta = { type: 'casino_loss', description: `Casino wheel spin` };
    player.money = Number(player.money || 0) - Number(cost || 0);

    // Spin the wheel and determine the reward
    const reward = wheelReward(wheel);

    // Apply reward for basic types
    if (reward) {
      if (reward.type === 'money') {
        player.$locals._txMeta = { type: 'casino_win', description: `Casino wheel win` };
        player.money = Number(player.money || 0) + Number(reward.value || 0);
      } else if (reward.type === 'points') {
        player.points = Number(player.points || 0) + Number(reward.value || 0);
      } else if (reward.type === 'item') {
        // Attempt to grant the item into inventory by item id slug
        let itemDoc = await Item.findOne({ id: String(reward.value) });
        if (itemDoc) {
          player.inventory = player.inventory || [];
          const idx = player.inventory.findIndex((e) => String(e.item) === String(itemDoc._id));
          if (idx >= 0) {
            player.inventory[idx].qty = Number(player.inventory[idx].qty || 0) + 1;
          } else {
            player.inventory.push({ item: itemDoc._id, qty: 1 });
          }
        } else {
          // If item not found, include a hint in response but don't fail the spin
          reward.warning = `Item ${reward.value} not found in catalog`;
        }
      } else if (reward.type === 'property') {
        // Grant a property instance if the property id exists in our catalog
        const propId = String(reward.value);
        const propDef = await propertyService.getProperty(propId);
        if (propDef) {
          player.properties = player.properties || [];
          player.properties.push({ propertyId: propId, upgrades: {}, acquiredAt: new Date() });
          // If no home set, default to the first acquired property
          if (!player.home) player.home = propId;
        } else {
          reward.warning = `Property ${propId} not found in catalog`;
        }
      }
      // Note: items/tokens/effects/honors not applied in this minimal pass
    }

    // Update last spin time (per-wheel)
    player.casino = player.casino || {};
    if (!player.casino.lastSpins) player.casino.lastSpins = new Map();
    if (typeof player.casino.lastSpins.set === 'function') {
      player.casino.lastSpins.set(wheel, now);
    } else {
      // in case schema stored as plain object
      player.casino.lastSpins[wheel] = now;
      try { player.markModified && player.markModified('casino.lastSpins'); } catch (_) {}
    }
    await player.save();

    // Return the reward to the user
    res.json({ reward, remainingMoney: player.money, points: player.points });
  } catch (err) {
    console.error('[casino] spinWheel error:', err?.message || err);
    res.status(400).json({ error: err.message });
  }
};

const getWheels = async (req, res) => {
  try {
    const list = Object.entries(wheelSettings).map(([id, w]) => ({ id, name: w.name, cost: w.cost }))
    res.json({ wheels: list })
  } catch (e) { res.status(500).json({ error: 'Failed to load wheels' }) }
}

module.exports = { spinWheel, getWheels };