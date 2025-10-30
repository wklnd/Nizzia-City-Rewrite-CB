const Item = require('../models/Item');
const Player = require('../models/Player');
const mongoose = require('mongoose');

async function resolvePlayer(userOrPlayerId){
  if (!userOrPlayerId) return null;
  // Try as Player._id
  if (mongoose.Types.ObjectId.isValid(userOrPlayerId)) {
    const asPlayer = await Player.findById(userOrPlayerId);
    if (asPlayer) return asPlayer;
    // Try as Player.user (auth user id)
    const byUser = await Player.findOne({ user: userOrPlayerId });
    if (byUser) return byUser;
  }
  // Not ObjectId or not found
  return null;
}

function clamp(n, min, max){ return Math.max(min, Math.min(max, n)); }

const applyItem = async (userOrPlayerId, itemId) => {
  const player = await resolvePlayer(userOrPlayerId);
  if (!player) throw new Error('Player not found');
  let item = null;
  if (mongoose.Types.ObjectId.isValid(itemId)) {
    item = await Item.findById(itemId);
  }
  if (!item) {
    item = await Item.findOne({ id: String(itemId) });
  }
  if (!item) throw new Error('Item not found');
  if (!item.usable) throw new Error('Item is not usable');

  const effect = item.effect || {};

  // Determine cooldown type and enforce active cooldowns
  const inferTypeFromItem = () => {
    if (item.type === 'drugs') return 'drug';
    if (item.type === 'enhancers') return 'booster';
    if (item.type === 'medicine' || item.type === 'alchool') return 'medical';
    return '';
  };
  const cdType = (effect.cooldownType || inferTypeFromItem() || '').toLowerCase();
  if (cdType === 'drug' || cdType === 'booster' || cdType === 'medical') {
    const key = cdType + 'Cooldown';
    const remaining = Number(player.cooldowns?.[key] || 0);
    if (remaining > 0) {
      const err = new Error(`Cooldown active: ${cdType} (${remaining}s remaining)`);
      err.code = 'COOLDOWN';
      err.type = cdType;
      err.remaining = remaining;
      throw err;
    }
  }

  // Apply resource effects
  if (typeof effect.energy === 'number') {
    const eMax = Number(player.energyStats?.energyMax ?? 0);
    const eMin = Number(player.energyStats?.energyMin ?? 0);
    const cur = Number(player.energyStats?.energy ?? 0);
    const next = clamp(cur + Number(effect.energy), eMin, eMax || Infinity);
    player.energyStats.energy = Number.isFinite(next) ? next : cur + Number(effect.energy);
  }
  if (typeof effect.nerve === 'number') {
    const nMax = Number(player.nerveStats?.nerveMax ?? Infinity);
    const nMin = Number(player.nerveStats?.nerveMin ?? 0);
    const cur = Number(player.nerveStats?.nerve ?? 0);
    const next = clamp(cur + Number(effect.nerve), nMin, nMax);
    player.nerveStats.nerve = next;
  }
  if (typeof effect.happy === 'number') {
    const hMax = Number(player.happiness?.happyMax ?? Infinity);
    const hMin = Number(player.happiness?.happyMin ?? 0);
    const cur = Number(player.happiness?.happy ?? 0);
    const next = clamp(cur + Number(effect.happy), hMin, hMax);
    player.happiness.happy = next;
  }
  if (typeof effect.addiction === 'number') {
    player.addiction = Number(player.addiction || 0) + Number(effect.addiction);
  }

  // Cooldowns via effect.cooldownType and effect.cooldownSeconds
  if (cdType && Number(effect.cooldownSeconds) > 0) {
    const sec = Number(effect.cooldownSeconds);
    player.cooldowns = player.cooldowns || {};
    const key = cdType + 'Cooldown';
    player.cooldowns[key] = Number(player.cooldowns[key] || 0) + sec;
  }

  await player.save();
  return {
    message: `${item.name} used successfully`,
    energy: player.energyStats?.energy,
    nerve: player.nerveStats?.nerve,
    happy: player.happiness?.happy,
    addiction: player.addiction,
    cooldowns: {
      drug: Number(player.cooldowns?.drugCooldown || 0),
      booster: Number(player.cooldowns?.boosterCooldown || 0),
      medical: Number(player.cooldowns?.medicalCooldown || 0),
    }
  };
};

module.exports = { applyItem };