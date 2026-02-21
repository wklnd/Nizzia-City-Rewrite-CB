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
  // Support both legacy single cooldownType/Seconds and new effect.cooldowns object
  const cdType = (effect.cooldownType || inferTypeFromItem() || '').toLowerCase();
  const cdObj = effect.cooldowns && typeof effect.cooldowns === 'object' ? effect.cooldowns : null;
  const willSetDrug = cdObj ? Number(cdObj.drug||0) > 0 : (cdType === 'drug' && Number(effect.cooldownSeconds||0) > 0);
  const willSetMedical = cdObj ? Number(cdObj.medical||0) > 0 : (cdType === 'medical' && Number(effect.cooldownSeconds||0) > 0);
  const willSetBooster = cdObj ? Number(cdObj.booster||0) > 0 : (cdType === 'booster' && Number(effect.cooldownSeconds||0) > 0);
  const willSetAlcohol = cdObj ? Number(cdObj.alcohol||0) > 0 : (cdType === 'alcohol' && Number(effect.cooldownSeconds||0) > 0);
  // Block usage when cooldown active for all categories
  if (willSetDrug) {
    const remaining = Number(player.cooldowns?.drugCooldown || 0);
    if (remaining > 0) {
      const err = new Error(`Cooldown active: drug (${remaining}s remaining)`);
      err.code = 'COOLDOWN';
      err.type = 'drug';
      err.remaining = remaining;
      throw err;
    }
  }
  if (willSetMedical) {
    const remaining = Number(player.cooldowns?.medicalCooldown || 0);
    if (remaining > 0) {
      const err = new Error(`Cooldown active: medical (${remaining}s remaining)`);
      err.code = 'COOLDOWN';
      err.type = 'medical';
      err.remaining = remaining;
      throw err;
    }
  }
  if (willSetBooster) {
    const remaining = Number(player.cooldowns?.boosterCooldown || 0);
    if (remaining > 0) {
      const err = new Error(`Cooldown active: booster (${remaining}s remaining)`);
      err.code = 'COOLDOWN';
      err.type = 'booster';
      err.remaining = remaining;
      throw err;
    }
  }
  if (willSetAlcohol) {
    const remaining = Number(player.cooldowns?.alcoholCooldown || 0);
    const ALCOHOL_MAX = 24 * 3600; // 24h cap for alcohol usage
    // Allow stacking up to the daily cap; block only when already at/over 24h
    if (remaining >= ALCOHOL_MAX) {
      const err = new Error(`Cooldown active: alcohol (${remaining}s remaining)`);
      err.code = 'COOLDOWN';
      err.type = 'alcohol';
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
  if (typeof effect.points === 'number') {
    player.points = Number(player.points || 0) + Number(effect.points)
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
  // Battle stat bonuses (flat adds)
  if (effect.bonuses && typeof effect.bonuses === 'object') {
    player.battleStats = player.battleStats || {}
    if (typeof effect.bonuses.strength === 'number') player.battleStats.strength = Number(player.battleStats.strength||0) + Number(effect.bonuses.strength)
    if (typeof effect.bonuses.dexterity === 'number') player.battleStats.dexterity = Number(player.battleStats.dexterity||0) + Number(effect.bonuses.dexterity)
    if (typeof effect.bonuses.speed === 'number') player.battleStats.speed = Number(player.battleStats.speed||0) + Number(effect.bonuses.speed)
    if (typeof effect.bonuses.defense === 'number') player.battleStats.defense = Number(player.battleStats.defense||0) + Number(effect.bonuses.defense)
  }

  // Cooldowns via effect.cooldownType and effect.cooldownSeconds
  player.cooldowns = player.cooldowns || {};
  if (cdObj) {
    const add = (key, sec) => {
      if (!Number(sec)) return;
      const storeKey = key === 'alcohol' ? 'alcoholCooldown' : (key + 'Cooldown');
      const existing = Number(player.cooldowns[storeKey] || 0);
      player.cooldowns[storeKey] = existing + Number(sec);
    }
    add('alcohol', cdObj.alcohol)
    add('booster', cdObj.booster)
    add('drug', cdObj.drug)
    add('medical', cdObj.medical)
  } else if (cdType && Number(effect.cooldownSeconds) > 0) {
    const sec = Number(effect.cooldownSeconds);
    const key = (cdType === 'alcohol') ? 'alcoholCooldown' : (cdType + 'Cooldown');
    const existing = Number(player.cooldowns[key] || 0);
    player.cooldowns[key] = existing + sec;
  }

  // Helpers
  function toProb(p){
    if (p == null) return 1;
    const n = Number(p);
    if (!Number.isFinite(n)) return 1;
    return n > 1 ? Math.max(0, Math.min(1, n/100)) : Math.max(0, Math.min(1, n));
  }
  function roll(prob){ return Math.random() < toProb(prob) }
  function randInt(min, max){
    const a = Math.floor(Number(min||0));
    const b = Math.floor(Number(max||0));
    const lo = Math.min(a,b), hi = Math.max(a,b);
    return Math.floor(Math.random()*(hi-lo+1))+lo;
  }

  // Cache rewards: grant money/items (supports fixed or ranged with chance)
  async function grantCache(cache) {
    if (!cache || typeof cache !== 'object') return;
    // Money: number or {min,max}, gated by moneyChance
    if (cache.money != null) {
      let amount = 0;
      if (typeof cache.money === 'number') amount = Number(cache.money);
      else if (typeof cache.money === 'object') {
        const mi = Number(cache.money.min||0), mx = Number(cache.money.max||0);
        amount = randInt(mi, Math.max(mi, mx));
      }
      if (amount && roll(cache.moneyChance)) {
        player.$locals._txMeta = { type: 'other', description: `Cache reward` };
        player.money = Number(player.money || 0) + amount;
      }
    }
    // Points: number or {min,max}, gated by pointsChance
    if (cache.points != null) {
      let pts = 0;
      if (typeof cache.points === 'number') pts = Number(cache.points);
      else if (typeof cache.points === 'object') {
        const mi = Number(cache.points.min||0), mx = Number(cache.points.max||0);
        pts = randInt(mi, Math.max(mi, mx));
      }
      if (pts && roll(cache.pointsChance)) {
        player.points = Number(player.points || 0) + pts;
      }
    }
    const list = Array.isArray(cache.items) ? cache.items : []
    for (const row of list) {
      if (!row || !(row.id)) continue;
      if (!roll(row.chance)) continue;
      const it = await Item.findOne({ id: String(row.id) })
      if (!it) continue;
      let qty = 1;
      if (row.minQty != null || row.maxQty != null) {
        const mi = Number(row.minQty||1), mx = Number(row.maxQty||mi||1);
        qty = Math.max(1, randInt(mi, Math.max(mi, mx)));
      } else {
        qty = Math.max(1, Number(row.qty || 1));
      }
      const inv = player.inventory || []
      const idx = inv.findIndex(e => String(e.item) === String(it._id))
      if (idx >= 0) inv[idx].qty = Number(inv[idx].qty || 0) + qty
      else inv.push({ item: it._id, qty })
      player.inventory = inv
    }
  }
  if (item.type === 'cache' || (effect.cache && typeof effect.cache === 'object')) {
    await grantCache(effect.cache || {})
  }

  await player.save();
  return {
    message: `${item.name} used successfully`,
    energy: player.energyStats?.energy,
    nerve: player.nerveStats?.nerve,
    happy: player.happiness?.happy,
    points: Number(player.points || 0),
    money: Number(player.money || 0),
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