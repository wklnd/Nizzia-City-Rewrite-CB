const growService = require('../services/growService');

// GET /grow/strains — list all available strains
async function strains(req, res) {
  try {
    const list = await growService.getStrainCatalog();
    res.json({ strains: list });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
}

// GET /grow/warehouses — list all warehouse tiers
async function warehouses(req, res) {
  try {
    const list = growService.getWarehouseCatalog();
    res.json({ warehouses: list });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
}

// GET /grow/my — get player's warehouse, pots, and stash
async function myGrow(req, res) {
  try {
    const userId = req.authUserId;

    const { warehouse, player } = await growService.getWarehouse(userId);
    const pots = warehouse ? await growService.getPots(userId) : [];
    const stash = await growService.getStash(userId);

    res.json({
      warehouse: warehouse ? {
        type: warehouse.type,
        pots: warehouse.pots,
        maxPots: require('../config/grow').WAREHOUSES[warehouse.type]?.maxPots || 0,
      } : null,
      pots,
      stash,
    });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
}

// POST /grow/buy-warehouse — purchase or upgrade warehouse
async function buyWarehouse(req, res) {
  try {
    const userId = req.authUserId;
    const { warehouseId } = req.body || {};
    if (!warehouseId) return res.status(400).json({ error: 'warehouseId is required' });
    const wh = await growService.buyWarehouse(userId, warehouseId);
    res.json({ warehouse: wh });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
}

// POST /grow/buy-pot — buy a new pot
async function buyPot(req, res) {
  try {
    const userId = req.authUserId;
    const result = await growService.buyPot(userId);
    res.json(result);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
}

// POST /grow/plant — plant a seed in a pot
async function plant(req, res) {
  try {
    const userId = req.authUserId;
    const { potIndex, strainId } = req.body || {};
    if (potIndex === undefined || !strainId) {
      return res.status(400).json({ error: 'potIndex and strainId are required' });
    }
    const pot = await growService.plant(userId, Number(potIndex), strainId);
    res.json({ pot });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
}

// POST /grow/harvest — harvest a ready plant
async function harvest(req, res) {
  try {
    const userId = req.authUserId;
    const { potIndex } = req.body || {};
    if (potIndex === undefined) {
      return res.status(400).json({ error: 'potIndex is required' });
    }
    const result = await growService.harvest(userId, Number(potIndex));
    res.json(result);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
}

// POST /grow/sell — sell weed from stash
async function sell(req, res) {
  try {
    const userId = req.authUserId;
    const { strainId, grams } = req.body || {};
    if (!strainId || !grams) {
      return res.status(400).json({ error: 'strainId and grams are required' });
    }
    const result = await growService.sellWeed(userId, strainId, Number(grams));
    res.json(result);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
}

// POST /grow/use — consume weed for stat boosts
async function use(req, res) {
  try {
    const userId = req.authUserId;
    const { strainId, grams } = req.body || {};
    if (!strainId || !grams) {
      return res.status(400).json({ error: 'strainId and grams are required' });
    }
    const result = await growService.useWeed(userId, strainId, Number(grams));
    res.json(result);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
}

module.exports = { strains, warehouses, myGrow, buyWarehouse, buyPot, plant, harvest, sell, use };
