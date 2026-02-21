// ═══════════════════════════════════════════════════════════════
//  Production Service — Labs, drug cooking, quality
// ═══════════════════════════════════════════════════════════════

const Cartel = require('../../models/Cartel');
const Territory = require('../../models/Territory');
const { resolveCartel, maxLabs, addHeat, addReputation } = require('./cartelService');
const {
  DRUGS,
  LABS,
  TERRITORIES,
  HEAT_PER_PRODUCTION,
} = require('../../config/cartel');

// ── Build a lab ──

async function buildLab(userId, labType, territoryId) {
  const cartel = await resolveCartel(userId);
  const labCfg = LABS[labType];
  if (!labCfg) throw Object.assign(new Error('Unknown lab type'), { status: 400 });

  const terrCfg = TERRITORIES[territoryId];
  if (!terrCfg) throw Object.assign(new Error('Unknown territory'), { status: 400 });

  // Must control the territory
  const terr = await Territory.findOne({ territoryId, controlledBy: cartel._id });
  if (!terr) throw Object.assign(new Error('You don\'t control this territory'), { status: 400 });

  // Check lab cap
  const cap = maxLabs(cartel.repLevel);
  if (cartel.labs.length >= cap) {
    throw Object.assign(new Error(`Lab cap reached (${cartel.labs.length}/${cap}). Increase rep.`), { status: 400 });
  }

  // Cost
  if (cartel.treasury < labCfg.cost) {
    throw Object.assign(new Error(`Need $${labCfg.cost.toLocaleString()} in treasury`), { status: 400 });
  }

  cartel.treasury -= labCfg.cost;
  cartel.labs.push({
    labId: labType,
    territoryId,
    level: 1,
    producing: null,
    batchStartedAt: null,
    batchesCompleted: 0,
  });
  await cartel.save();

  return { labs: cartel.labs, treasury: cartel.treasury };
}

// ── Upgrade a lab ──

async function upgradeLab(userId, labIndex) {
  const cartel = await resolveCartel(userId);
  const lab = cartel.labs[labIndex];
  if (!lab) throw Object.assign(new Error('Lab not found'), { status: 400 });

  const labCfg = LABS[lab.labId];
  if (!labCfg) throw Object.assign(new Error('Unknown lab config'), { status: 400 });
  if (lab.level >= labCfg.maxLevel) throw Object.assign(new Error('Lab already at max level'), { status: 400 });

  const cost = Math.floor(labCfg.cost * Math.pow(labCfg.upgradeCostMult, lab.level));
  if (cartel.treasury < cost) {
    throw Object.assign(new Error(`Upgrade costs $${cost.toLocaleString()}`), { status: 400 });
  }

  cartel.treasury -= cost;
  lab.level += 1;
  cartel.markModified('labs');
  await cartel.save();

  return { lab, cost, treasury: cartel.treasury };
}

// ── Destroy a lab ──

async function destroyLab(userId, labIndex) {
  const cartel = await resolveCartel(userId);
  if (!cartel.labs[labIndex]) throw Object.assign(new Error('Lab not found'), { status: 400 });

  const removed = cartel.labs.splice(labIndex, 1)[0];
  cartel.markModified('labs');
  await cartel.save();

  return { destroyed: removed.labId, labs: cartel.labs };
}

// ── Start producing ──

async function startProduction(userId, labIndex, drugId) {
  const cartel = await resolveCartel(userId);
  if (cartel.bustedUntil && new Date(cartel.bustedUntil) > new Date()) {
    throw Object.assign(new Error('Operations frozen — cartel was busted'), { status: 400 });
  }

  const lab = cartel.labs[labIndex];
  if (!lab) throw Object.assign(new Error('Lab not found'), { status: 400 });
  if (lab.producing) throw Object.assign(new Error('Lab already cooking'), { status: 400 });

  const drug = DRUGS[drugId];
  if (!drug) throw Object.assign(new Error('Unknown drug'), { status: 400 });
  if (drug.requiredLab !== lab.labId) {
    throw Object.assign(new Error(`This lab can't produce ${drug.name}. Needs ${LABS[drug.requiredLab]?.name || drug.requiredLab}`), { status: 400 });
  }

  // Pay raw material cost from treasury
  if (cartel.treasury < drug.baseCost) {
    throw Object.assign(new Error(`Need $${drug.baseCost.toLocaleString()} for raw materials`), { status: 400 });
  }

  cartel.treasury -= drug.baseCost;
  lab.producing = drugId;
  lab.batchStartedAt = new Date();
  cartel.markModified('labs');
  await cartel.save();

  return { lab, treasury: cartel.treasury };
}

// ── Check and collect finished batches ──

function productionTime(lab, drug) {
  const labCfg = LABS[lab.labId];
  const speedMult = 1 - ((lab.level - 1) * (labCfg?.productionBonus || 0));
  return Math.floor(drug.baseProductionTime * Math.max(0.2, speedMult));
}

function batchQuality(lab, drug) {
  const labCfg = LABS[lab.labId];
  return Math.min(100, drug.baseQuality + (lab.level - 1) * (labCfg?.qualityBonus || 0));
}

async function collectBatch(userId, labIndex) {
  const cartel = await resolveCartel(userId);
  const lab = cartel.labs[labIndex];
  if (!lab) throw Object.assign(new Error('Lab not found'), { status: 400 });
  if (!lab.producing) throw Object.assign(new Error('Lab is not producing'), { status: 400 });

  const drug = DRUGS[lab.producing];
  if (!drug) throw Object.assign(new Error('Unknown drug'), { status: 400 });

  const elapsed = (Date.now() - new Date(lab.batchStartedAt).getTime()) / 1000;
  const needed = productionTime(lab, drug);
  if (elapsed < needed) {
    const remaining = Math.ceil(needed - elapsed);
    throw Object.assign(new Error(`Batch not ready. ${remaining}s remaining.`), { status: 400 });
  }

  // Produce!
  const qty = drug.batchSize;
  const qual = batchQuality(lab, drug);

  // Add to inventory
  const inv = cartel.inventory.find(i => i.drugId === drug.id);
  if (inv) {
    // Weighted average quality
    const totalQty = inv.quantity + qty;
    inv.quality = Math.round((inv.quality * inv.quantity + qual * qty) / totalQty);
    inv.quantity = totalQty;
  } else {
    cartel.inventory.push({ drugId: drug.id, quantity: qty, quality: qual });
  }

  lab.producing = null;
  lab.batchStartedAt = null;
  lab.batchesCompleted += 1;

  // Heat & rep
  cartel.heat = Math.max(0, cartel.heat + HEAT_PER_PRODUCTION);
  cartel.reputation += 20;

  cartel.markModified('labs');
  cartel.markModified('inventory');
  await cartel.save();

  return {
    drug: drug.name,
    quantity: qty,
    quality: qual,
    inventory: cartel.inventory,
    heat: cartel.heat,
  };
}

// ── Get lab status (with time remaining) ──

function labStatus(cartel) {
  return cartel.labs.map((lab, idx) => {
    const labCfg = LABS[lab.labId] || {};
    const result = {
      index: idx,
      labId: lab.labId,
      name: labCfg.name || lab.labId,
      territoryId: lab.territoryId,
      level: lab.level,
      maxLevel: labCfg.maxLevel || 5,
      producing: lab.producing,
      batchesCompleted: lab.batchesCompleted,
    };

    if (lab.producing && lab.batchStartedAt) {
      const drug = DRUGS[lab.producing];
      if (drug) {
        const needed = productionTime(lab, drug);
        const elapsed = (Date.now() - new Date(lab.batchStartedAt).getTime()) / 1000;
        result.timeNeeded = needed;
        result.timeElapsed = Math.floor(elapsed);
        result.timeRemaining = Math.max(0, Math.ceil(needed - elapsed));
        result.ready = elapsed >= needed;
        result.drugName = drug.name;
        result.batchSize = drug.batchSize;
        result.batchQuality = batchQuality(lab, drug);
      }
    }

    return result;
  });
}

// ── Get drug catalog ──

function getDrugCatalog() {
  return Object.values(DRUGS).map(d => ({
    id: d.id,
    name: d.name,
    emoji: d.emoji,
    baseProductionTime: d.baseProductionTime,
    batchSize: d.batchSize,
    baseCost: d.baseCost,
    basePrice: d.basePrice,
    requiredLab: d.requiredLab,
    labName: LABS[d.requiredLab]?.name || d.requiredLab,
    description: d.description,
  }));
}

function getLabCatalog() {
  return Object.values(LABS).map(l => ({
    id: l.id,
    name: l.name,
    cost: l.cost,
    maxLevel: l.maxLevel,
    productionBonus: l.productionBonus,
    qualityBonus: l.qualityBonus,
    description: l.description,
  }));
}

module.exports = {
  buildLab,
  upgradeLab,
  destroyLab,
  startProduction,
  collectBatch,
  labStatus,
  getDrugCatalog,
  getLabCatalog,
  productionTime,
  batchQuality,
};
