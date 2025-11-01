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
    if (item.type === 'medicine') return 'medical';
    if (item.type === 'alchool') return 'alcohol'; // schema uses 'alchool'
    return '';
  };
  const cdType = (effect.cooldownType || inferTypeFromItem() || '').toLowerCase();
  // Only block on drug/medical; allow stacking for alcohol and booster
  if (cdType === 'drug' || cdType === 'medical') {
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
    const delta = Number(effect.nerve);
    const allowOvercap = (cdType === 'alcohol');
    let next = cur + delta;
    if (allowOvercap) {
      // Overcap allowed: ensure not below min, but do not clamp to max
      next = Math.max(nMin, next);
    } else {
      next = clamp(next, nMin, nMax);
    }
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
    const key = (cdType === 'alcohol') ? 'alcoholCooldown' : (cdType + 'Cooldown');
    // For alcohol and booster, allow stacking; this matches the desired behavior where
    // e.g. 23:58 remaining + 1h drink -> 24:58 remaining. We simply add seconds.
    // (Drug/medical only reach here when not blocked above.)
    const existing = Number(player.cooldowns[key] || 0);
    // Soft cap: allow totals to exceed 24h; they'll tick down naturally via cron
    player.cooldowns[key] = existing + sec;
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
      alcohol: Number(player.cooldowns?.alcoholCooldown || 0),
      drugs: (() => {
        const map = player.cooldowns?.drugs;
        if (!map) return {};
        if (map instanceof Map) {
          return Object.fromEntries(Array.from(map.entries()));
        }
        return map;
      })(),
    }
  };
};

module.exports = { applyItem };