const { PROPERTIES: CONFIG_PROPERTIES } = require('../config/properties');
const { Property } = require('../models/Property');

// Simple cache so we don’t hit the DB every request
let cache = {
  loadedAt: 0,
  useDb: false,
  map: { ...CONFIG_PROPERTIES },
};

function toMapById(list) {
  const out = {};
  for (const it of list || []) {
    if (!it || !it.id) continue;
    out[String(it.id)] = {
      id: String(it.id),
      name: it.name,
      cost: Number(it.cost || 0),
      upkeep: Number(it.upkeep || 0),
      baseHappyMax: Number(it.baseHappyMax || 0),
      upgradeLimits: it.upgradeLimits || {},
      market: it.market !== false,
    };
  }
  return out;
}

async function refreshCache(force = false) {
  const now = Date.now();
  if (!force && now - cache.loadedAt < 60_000) return cache; // 60s TTL
  try {
    const rows = await Property.find().lean();
    if (rows && rows.length > 0) {
      cache = { loadedAt: now, useDb: true, map: toMapById(rows) };
      return cache;
    }
  } catch (_) {
    // swallow and fall back to config
  }
  cache = { loadedAt: now, useDb: false, map: { ...CONFIG_PROPERTIES } };
  return cache;
}

async function getCatalog() {
  await refreshCache(false);
  return cache.map;
}

async function getProperty(id) {
  if (!id) return null;
  const map = await getCatalog();
  return map[String(id)] || null;
}

function usingDatabase() {
  return cache.useDb === true;
}

module.exports = { getCatalog, getProperty, refreshCache, usingDatabase };
