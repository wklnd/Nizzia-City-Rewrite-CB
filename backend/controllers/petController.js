const Pets = require('../models/Pets');
const Player = require('../models/Player');
const petService = require('../services/petService');
const propertyService = require('../services/propertyService');

// Public: view any player's pet by numeric player id
async function getByPlayerId(req, res){
  try {
    const pid = Number(req.params.id);
    if (!Number.isFinite(pid)) return res.status(400).json({ error: 'Invalid player id' });
    const player = await Player.findOne({ id: pid }).select('user').lean();
    if (!player) return res.status(404).json({ error: 'Player not found' });
    const pet = await Pets.findOne({ ownerId: player.user }).lean();
    if (!pet) return res.json({ pet: null });
    res.json({ pet: { id: String(pet._id), type: pet.type, name: pet.name, age: pet.age, happyBonus: pet.happyBonus } });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
}

async function catalog(req, res){
  try {
    const map = await petService.getCatalog();
    const list = Object.values(map).map(p => ({ id: p.id, name: p.name, cost: p.cost, happyBonus: p.happyBonus }));
    res.json({ pets: list });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
}

async function mine(req, res){
  try {
    const userId = req.authUserId;
    const player = await Player.findOne({ user: userId });
    if (!player) return res.status(404).json({ error: 'Player not found' });
    const pet = await Pets.findOne({ ownerId: player.user }).lean();
    if (!pet) return res.json({ pet: null });
    res.json({ pet: {
      id: String(pet._id),
      type: pet.type,
      name: pet.name,
      age: pet.age,
      happyBonus: pet.happyBonus,
      petstoreCost: pet.petstoreCost,
    }});
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
}

async function buy(req, res){
  try {
    const userId = req.authUserId;
    const { type, name } = req.body || {};
    if (!type) return res.status(400).json({ error: 'type is required' });
    const player = await Player.findOne({ user: userId });
    if (!player) return res.status(404).json({ error: 'Player not found' });

    // Enforce one per player
    const existing = await Pets.findOne({ ownerId: player.user });
    if (existing) return res.status(400).json({ error: 'You already own a pet' });

    const def = await petService.getPetDef(type);
    if (!def) return res.status(400).json({ error: 'Invalid pet type' });

    const cost = Number(def.cost || 0);
    if (Number(player.money || 0) < cost) return res.status(400).json({ error: 'Not enough money' });

    // Deduct and create pet
    player.$locals._txMeta = { type: 'purchase', description: `Bought pet: ${def.name}` };
    player.money = Number(player.money || 0) - cost;
    await player.save();

    const petDoc = await Pets.create({
      name: name || def.name,
      type: def.id,
      age: 0,
      happyBonus: Number(def.happyBonus || 0),
      petstoreCost: cost,
      ownerId: player.user,
    });

    // Recompute and persist player's happyMax to include the new pet bonus
    try {
      const PROPS = await propertyService.getCatalog();
      const homeId = player.home || 'trailer';
      const defProp = PROPS[homeId];
      let bonus = 0;
      const entry = (player.properties || []).find(p => p.propertyId === homeId) || null;
      const upgrades = entry?.upgrades;
      const iter = (cb)=>{
        if (!upgrades) return;
        if (typeof upgrades.forEach === 'function') upgrades.forEach((v,k)=>cb(k, v));
        else Object.entries(upgrades).forEach(([k,v])=>cb(k,v));
      };
      const { UPGRADES } = require('../config/properties');
      iter((k, v) => {
        const uDef = UPGRADES[k];
        const level = Number(v||0);
        for (let i=1; i<=level; i++) bonus += Number(uDef?.bonus?.(i)?.happyMax || 0);
      });
      const base = defProp?.baseHappyMax || player.happiness?.happyMax || 150;
      const newMax = base + bonus + Number(petDoc.happyBonus || 0);
      if (player.happiness) {
        player.happiness.happyMax = newMax;
        if (typeof player.happiness.happy === 'number') {
          player.happiness.happy = Math.min(player.happiness.happy, newMax);
        }
        await player.save();
      }
    } catch(_) { /* non-fatal */ }

    res.json({ ok: true, money: player.money, pet: {
      id: String(petDoc._id), type: petDoc.type, name: petDoc.name, age: petDoc.age,
      happyBonus: petDoc.happyBonus,
    }});
  } catch (e) {
    // Handle potential unique index violation with a friendly error
    if (e && e.code === 11000) {
      return res.status(409).json({ error: 'You already own a pet' });
    }
    res.status(400).json({ error: e.message });
  }
}

async function releasePet(req, res){
  try {
    const userId = req.authUserId;
    const player = await Player.findOne({ user: userId });
    if (!player) return res.status(404).json({ error: 'Player not found' });
    const pet = await Pets.findOne({ ownerId: player.user });
    if (!pet) return res.status(404).json({ error: 'No pet to release' });
    await Pets.deleteOne({ _id: pet._id });
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
}

module.exports = { catalog, mine, buy, releasePet, getByPlayerId };
 
// Rename a pet (set nickname)
async function rename(req, res){
  try {
    const userId = req.authUserId;
    const { name } = req.body || {};
    if (!name) return res.status(400).json({ error: 'name is required' });
    // Basic validation
    const trimmed = String(name).trim();
    if (trimmed.length < 2 || trimmed.length > 32) return res.status(400).json({ error: 'Name must be 2-32 characters' });

    const player = await Player.findOne({ user: userId });
    if (!player) return res.status(404).json({ error: 'Player not found' });

    const pet = await Pets.findOne({ ownerId: player.user });
    if (!pet) return res.status(404).json({ error: 'No pet to rename' });

    pet.name = trimmed;
    await pet.save();
    res.json({ ok: true, pet: { id: String(pet._id), type: pet.type, name: pet.name, age: pet.age, happyBonus: pet.happyBonus } });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
}

module.exports.rename = rename;
