const { PETS: CONFIG_PETS } = require('../config/pets');
const Pets = require('../models/Pets');
const Player = require('../models/Player');

// Currently pets catalog is config-backed only; structure mirrors propertyService for future DB support.
let cache = {
  loadedAt: 0,
  map: { ...CONFIG_PETS },
};

async function refreshCache(force = false) {
  const now = Date.now();
  if (!force && now - cache.loadedAt < 60_000) return cache;
  cache = { loadedAt: now, map: { ...CONFIG_PETS } };
  return cache;
}

async function getCatalog() {
  await refreshCache(false);
  return cache.map;
}

async function getPetDef(id) {
  const map = await getCatalog();
  return id ? map[String(id)] || null : null;
}

// Convenience helpers around owned pets
async function getOwnedPetByUserId(userId) {
  if (!userId) return null;
  return Pets.findOne({ ownerId: userId }).lean();
}

async function getOwnedPetForPlayerIdentifier(userOrNumericPlayerId) {
  if (!userOrNumericPlayerId) return null;
  // Resolve Player to get user id
  let player = null;
  const n = Number(userOrNumericPlayerId);
  if (!Number.isNaN(n)) player = await Player.findOne({ id: n });
  if (!player) player = await Player.findOne({ user: userOrNumericPlayerId });
  if (!player) return null;
  return getOwnedPetByUserId(player.user);
}

async function getHappyBonusForUser(userId) {
  const pet = await getOwnedPetByUserId(userId);
  return Number(pet?.happyBonus || 0);
}

module.exports = {
  refreshCache,
  getCatalog,
  getPetDef,
  getOwnedPetByUserId,
  getOwnedPetForPlayerIdentifier,
  getHappyBonusForUser,
};
