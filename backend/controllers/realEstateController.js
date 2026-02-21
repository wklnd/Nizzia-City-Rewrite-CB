const Player = require('../models/Player');
const { UPGRADES } = require('../config/properties');
const propertyService = require('../services/propertyService');
const petService = require('../services/petService');

function humanizeId(id) {
  if (!id || typeof id !== 'string') return String(id || '');
  return id
    .split('_')
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(' ');
}

function getOwnedEntry(player, propertyId){
  return (player.properties || []).find(p => p.propertyId === propertyId) || null;
}

function sumUpgradeLevels(upgrades){
  if (!upgrades) return 0;
  if (typeof upgrades.forEach === 'function') {
    let sum = 0; upgrades.forEach(v => sum += Number(v||0)); return sum;
  }
  return Object.values(upgrades).reduce((a,b)=>a+Number(b||0),0);
}

function computeHappyMaxFor(player, PROPS, extraHappyBonus = 0){
  const homeId = player.home || 'trailer';
  const base = PROPS[homeId]?.baseHappyMax || player.happiness?.happyMax || 150;
  const entry = getOwnedEntry(player, homeId);
  let bonus = 0;
  const upgrades = entry?.upgrades;
  const iter = (cb)=>{
    if (!upgrades) return;
    if (typeof upgrades.forEach === 'function') upgrades.forEach((v,k)=>cb(k, v));
    else Object.entries(upgrades).forEach(([k,v])=>cb(k,v));
  };
  iter((k, v) => {
    const def = UPGRADES[k];
    const level = Number(v||0);
    for (let i=1; i<=level; i++) {
      const inc = def?.bonus?.(i)?.happyMax || 0;
      bonus += Number(inc||0);
    }
  });
  return base + bonus + Number(extraHappyBonus || 0);
}

async function ensureStarterProperty(player, PROPS){
  if (!player.properties || player.properties.length === 0) {
    player.properties = [{ propertyId: 'trailer', upgrades: {}, acquiredAt: new Date() }];
  }
  if (!player.home) player.home = 'trailer';
  // Ensure happyMax is at least base for the home
  const newMax = computeHappyMaxFor(player, PROPS, 0);
  if (player.happiness) {
    player.happiness.happyMax = newMax;
    if (typeof player.happiness.happy === 'number') {
      player.happiness.happy = Math.min(player.happiness.happy, newMax);
    }
  }
  await player.save();
}

async function getCatalog(req, res){
  try {
    const PROPS = await propertyService.getCatalog();
    const userId = req.authUserId;
    const player = await Player.findOne({ user: userId });
    if (!player) return res.status(404).json({ error: 'Player not found' });
    await ensureStarterProperty(player, PROPS);
    // Include pet happiness bonus when reporting stats
    const petBonus = await petService.getHappyBonusForUser(player.user);
    const owned = new Set((player.properties||[]).map(p => p.propertyId));
    const catalog = Object.values(PROPS)
      // Hide properties from market unless already owned
      .filter(p => (p.market !== false) || owned.has(p.id))
      .map(p => {
      const entry = (player.properties||[]).find(pp => pp.propertyId === p.id);
      // Normalize upgrades to plain object with numeric levels
      let upgrades = {};
      if (entry && entry.upgrades) {
        if (typeof entry.upgrades.forEach === 'function') {
          entry.upgrades.forEach((v,k)=>{ upgrades[k] = Number(v||0); });
        } else {
          Object.entries(entry.upgrades).forEach(([k,v])=>{ upgrades[k] = Number(v||0); });
        }
      }
      // Build upgrade metadata for frontend (names and next-level costs)
      const upgradeNames = {};
      const upgradeCosts = {};
      Object.keys(p.upgradeLimits || {}).forEach((uId) => {
        const uDef = UPGRADES[uId];
        upgradeNames[uId] = uDef?.name || humanizeId(uId);
        const current = Number(upgrades[uId] || 0);
        const limit = Number(p.upgradeLimits[uId] || 1);
        const nextLevel = current + 1;
        if (nextLevel <= limit) {
          const cost = typeof uDef?.cost === 'function' ? Number(uDef.cost(nextLevel) || 0) : 0;
          upgradeCosts[uId] = cost;
        }
      });
      const upgradeCapacity = Object.values(p.upgradeLimits || {}).reduce((a,b)=>a + Number(b||0), 0);
      return {
        id: p.id,
        name: p.name,
        cost: p.cost,
        baseHappyMax: p.baseHappyMax,
        upgradeCapacity,
        upgradeLimits: p.upgradeLimits,
        upgrades,
        upgradeNames,
        upgradeCosts,
        owned: owned.has(p.id),
        active: player.home === p.id,
      };
    });
    // Compute effective happy max for the active home
    const happyMax = computeHappyMaxFor(player, PROPS, petBonus);
    res.json({ properties: catalog, home: player.home, money: player.money, happyMax });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
}

async function buyProperty(req, res){
  try {
    const userId = req.authUserId;
    const { propertyId, setActive } = req.body;
    const PROPS = await propertyService.getCatalog();
    if (!propertyId) return res.status(400).json({ error: 'propertyId is required' });
  const def = PROPS[propertyId];
    if (!def) return res.status(400).json({ error: 'Invalid propertyId' });
  if (def.market === false) return res.status(400).json({ error: 'This property is not available on the market' });
    const player = await Player.findOne({ user: userId });
    if (!player) return res.status(404).json({ error: 'Player not found' });
  await ensureStarterProperty(player, PROPS);
  // Allow owning multiple of the same property; remove single-ownership restriction
    const cost = Number(def.cost||0);
    if (Number(player.money||0) < cost) return res.status(400).json({ error: 'Not enough money' });
    player.$locals._txMeta = { type: 'property', description: `Bought property: ${def.name || propertyId}` };
    player.money = Number(player.money||0) - cost;
    player.properties.push({ propertyId, upgrades: {}, acquiredAt: new Date() });
    if (setActive) player.home = propertyId;
    // Recompute happiness max if active changed
    if (setActive) {
      const petBonus = await petService.getHappyBonusForUser(player.user);
      const newMax = computeHappyMaxFor(player, PROPS, petBonus);
      player.happiness.happyMax = newMax;
      player.happiness.happy = Math.min(player.happiness.happy, newMax);
    }
    await player.save();
    res.json({ ok: true, money: player.money, home: player.home });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
}

async function sellProperty(req, res){
  try {
    const userId = req.authUserId;
    const { propertyId } = req.body;
    const PROPS = await propertyService.getCatalog();
    if (!propertyId) return res.status(400).json({ error: 'propertyId is required' });
    if (propertyId === 'trailer') return res.status(400).json({ error: 'Cannot sell your starter trailer' });
    const player = await Player.findOne({ user: userId });
    if (!player) return res.status(404).json({ error: 'Player not found' });
    await ensureStarterProperty(player, PROPS);
    if (player.home === propertyId) return res.status(400).json({ error: 'Set a different home before selling this property' });
  const entry = getOwnedEntry(player, propertyId);
  if (!entry) return res.status(404).json({ error: 'Property not owned' });
  const def = PROPS[propertyId];
  const refund = Math.floor((def.cost||0) * 0.5); // Assumption: 50% refund
  player.$locals._txMeta = { type: 'property', description: `Sold property: ${def.name || propertyId}` };
  player.money = Number(player.money||0) + refund;
  // Remove only one instance of this propertyId
  const arr = Array.from(player.properties || [])
  const idx = arr.findIndex(p => p.propertyId === propertyId)
  if (idx >= 0) arr.splice(idx, 1)
  player.properties = arr
    await player.save();
    res.json({ ok: true, money: player.money, refund });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
}

async function setActiveProperty(req, res){
  try {
    const userId = req.authUserId;
    const { propertyId } = req.body;
    if (!propertyId) return res.status(400).json({ error: 'propertyId is required' });
    const player = await Player.findOne({ user: userId });
    if (!player) return res.status(404).json({ error: 'Player not found' });
    await ensureStarterProperty(player, await propertyService.getCatalog());
    const entry = getOwnedEntry(player, propertyId);
    if (!entry) return res.status(404).json({ error: 'Property not owned' });
    player.home = propertyId;
    const petBonus = await petService.getHappyBonusForUser(player.user);
    const newMax = computeHappyMaxFor(player, await propertyService.getCatalog(), petBonus);
    player.happiness.happyMax = newMax;
    if (typeof player.happiness.happy === 'number') player.happiness.happy = Math.min(player.happiness.happy, newMax);
    await player.save();
    res.json({ ok: true, home: player.home, happyMax: player.happiness.happyMax, happy: player.happiness.happy });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
}

async function buyUpgrade(req, res){
  try {
    const userId = req.authUserId;
    const { propertyId, upgradeId } = req.body;
    const PROPS = await propertyService.getCatalog();
    if (!propertyId || !upgradeId) return res.status(400).json({ error: 'propertyId and upgradeId are required' });
    const player = await Player.findOne({ user: userId });
    if (!player) return res.status(404).json({ error: 'Player not found' });
    await ensureStarterProperty(player, PROPS);

    const propDef = PROPS[propertyId];
    if (!propDef) return res.status(400).json({ error: 'Invalid propertyId' });
    const entry = getOwnedEntry(player, propertyId);
    if (!entry) return res.status(404).json({ error: 'Property not owned' });
    const upDef = UPGRADES[upgradeId];
    if (!upDef) return res.status(400).json({ error: 'Invalid upgradeId' });

    // Current level (support multi-level up to property limit)
    let currentLevel = 0;
    if (entry.upgrades) {
      if (typeof entry.upgrades.get === 'function') currentLevel = Number(entry.upgrades.get(upgradeId) || 0);
      else currentLevel = Number(entry.upgrades[upgradeId] || 0);
    }
    const limit = Number(propDef.upgradeLimits?.[upgradeId] || 1);
    if (currentLevel >= limit) return res.status(400).json({ error: 'Upgrade is at max level' });

    const nextLevel = currentLevel + 1;
    const cost = Number(upDef.cost(nextLevel) || 0);
    if (Number(player.money||0) < cost) return res.status(400).json({ error: 'Not enough money' });

    // Deduct funds and apply level
    player.$locals._txMeta = { type: 'property', description: `Property upgrade: ${upDef.name || upgradeId}` };
    player.money = Number(player.money||0) - cost;
    if (!entry.upgrades) entry.upgrades = new Map();
    if (typeof entry.upgrades.set === 'function') {
      entry.upgrades.set(upgradeId, nextLevel);
    } else {
      entry.upgrades[upgradeId] = nextLevel;
    }
    // Ensure Mongoose registers nested map/object changes inside array
    try { player.markModified && player.markModified('properties'); } catch(_) {}

    // If upgrading the active home, recompute happyMax
    if (player.home === propertyId) {
      const petBonus = await petService.getHappyBonusForUser(player.user);
      const newMax = computeHappyMaxFor(player, PROPS, petBonus);
      player.happiness.happyMax = newMax;
      player.happiness.happy = Math.min(player.happiness.happy, newMax);
    }

    await player.save();
  res.json({ ok: true, money: player.money, level: nextLevel, happyMax: player.happiness.happyMax, happy: player.happiness.happy });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
}

async function getHome(req, res){
  try {
    const userId = req.authUserId;
    const PROPS = await propertyService.getCatalog();
    const player = await Player.findOne({ user: userId });
    if (!player) return res.status(404).json({ error: 'Player not found' });
    await ensureStarterProperty(player, PROPS);
  const homeId = player.home || 'trailer';
    const def = PROPS[homeId] || PROPS['trailer'];
    const entry = (player.properties||[]).find(p => p.propertyId === homeId) || null;
    let upgrades = {};
    if (entry && entry.upgrades) {
      if (typeof entry.upgrades.forEach === 'function') entry.upgrades.forEach((v,k)=>{ upgrades[k]=Number(v||0); });
      else Object.entries(entry.upgrades).forEach(([k,v])=>{ upgrades[k]=Number(v||0); });
    }
    const image = `/assets/images/property_${homeId}.jpg`;
    // Provide upgrade names for installed/available upgrades
    const upgradeNames = {};
    Object.keys(def?.upgradeLimits || {}).forEach((uId) => {
      const uDef = UPGRADES[uId];
      upgradeNames[uId] = uDef?.name || humanizeId(uId);
    });
    const pet = await petService.getOwnedPetByUserId(player.user);
    const petBonus = Number(pet?.happyBonus || 0);
    res.json({
      id: homeId,
      name: def?.name || homeId,
      image,
      upgrades,
      upgradeNames,
      upkeep: Number(def?.upkeep || 0),
      upkeepDue: Number(entry?.upkeepDue || 0),
      lastUpkeepPaidAt: entry?.lastUpkeepPaidAt || null,
      happyMax: computeHappyMaxFor(player, PROPS, petBonus),
      happy: player.happiness?.happy,
      pet: pet ? { type: pet.type, name: pet.name, age: pet.age, happyBonus: pet.happyBonus } : null,
      money: player.money,
    });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
}

async function payUpkeep(req, res){
  try {
    const userId = req.authUserId;
    const PROPS = await propertyService.getCatalog();
    const player = await Player.findOne({ user: userId });
    if (!player) return res.status(404).json({ error: 'Player not found' });
    await ensureStarterProperty(player, PROPS);
    const homeId = player.home || 'trailer';
    const def = PROPS[homeId];
    if (!def) return res.status(400).json({ error: 'Invalid home' });
    const entry = (player.properties||[]).find(p => p.propertyId === homeId);
    if (!entry) return res.status(404).json({ error: 'Home not owned' });
    const due = Number(entry.upkeepDue || 0);
    if (due <= 0) return res.status(400).json({ error: 'No upkeep due' });
    // Perform an atomic update to avoid double-paying due to concurrent requests
    const now = new Date();
    const updated = await Player.findOneAndUpdate(
      {
        _id: player._id,
        money: { $gte: due },
        'properties.propertyId': homeId,
        'properties.upkeepDue': due,
      },
      {
        $inc: { money: -due },
        $set: { 'properties.$.upkeepDue': 0, 'properties.$.lastUpkeepPaidAt': now },
      },
      { new: true }
    );
    if (!updated) {
      return res.status(409).json({ error: 'Upkeep already paid or insufficient funds' });
    }
    res.json({ ok: true, money: updated.money, lastUpkeepPaidAt: now, paid: due, upkeepDue: 0 });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
}

module.exports = { getCatalog, buyProperty, sellProperty, setActiveProperty, buyUpgrade, getHome, payUpkeep };
