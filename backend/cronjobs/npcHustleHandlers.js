// ═══════════════════════════════════════════════════════════════
//  NPC Hustle Handlers — education, casino, real estate,
//  business, pets, market, items
//  All logic is inline (no service calls) to avoid double-save
//  conflicts with the NPC tick's end-of-loop bulk save.
// ═══════════════════════════════════════════════════════════════

const Item = require('../models/Item');
const Business = require('../models/Business');
const Pets = require('../models/Pets');
const ItemMarket = require('../models/ItemMarket');

const { CATEGORIES, ALL_COURSES } = require('../config/education');
const { wheelSettings } = require('../config/casino');
const { PROPERTIES, UPGRADES } = require('../config/properties');
const { BUSINESSES, UPGRADE_TIERS } = require('../config/business');
const { PETS } = require('../config/pets');

function choice(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function fmtMoney(n) {
  return Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ═══════════════════════════════════════════════════════════════
//  EDUCATION — auto-complete finished courses, enroll in next
// ═══════════════════════════════════════════════════════════════

async function handleEducation(player) {
  const stats = { enrolled: false, completed: false, courseName: null, bachelorEarned: null };
  try {
    if (!player.education) player.education = { completed: [], bachelors: [], active: { courseId: null } };
    const completed = player.education.completed || [];
    const bachelors = player.education.bachelors || [];
    const active = player.education.active;

    // ── Step 1: Complete active course if finished ──
    if (active?.courseId) {
      if (new Date(active.endsAt) <= new Date()) {
        const course = ALL_COURSES[active.courseId];
        if (course) {
          const rewards = course.rewards || {};
          player.workStats = player.workStats || {};
          if (rewards.manuallabor) player.workStats.manuallabor = Number(player.workStats.manuallabor || 0) + rewards.manuallabor;
          if (rewards.intelligence) player.workStats.intelligence = Number(player.workStats.intelligence || 0) + rewards.intelligence;
          if (rewards.endurance) player.workStats.endurance = Number(player.workStats.endurance || 0) + rewards.endurance;

          if (!player.education.completed) player.education.completed = [];
          if (!player.education.completed.includes(active.courseId)) {
            player.education.completed.push(active.courseId);
          }

          // Check bachelor completion
          const cat = CATEGORIES[course.category];
          if (cat) {
            const allDone = cat.courses.every(c => player.education.completed.includes(c.id));
            if (allDone && !bachelors.includes(cat.id)) {
              if (!player.education.bachelors) player.education.bachelors = [];
              player.education.bachelors.push(cat.id);
              const br = cat.bachelor.rewards || {};
              if (br.manuallabor) player.workStats.manuallabor += br.manuallabor;
              if (br.intelligence) player.workStats.intelligence += br.intelligence;
              if (br.endurance) player.workStats.endurance += br.endurance;
              stats.bachelorEarned = cat.bachelor.name;
            }
          }

          player.education.active = { courseId: null, startedAt: null, endsAt: null };
          stats.completed = true;
          stats.courseName = course.name;
          player.markModified('education');
          player.markModified('workStats');
        }
      }
      return stats; // Still studying or just completed — don't double-enroll
    }

    // ── Step 2: Enroll in next course ──
    // Prefer categories already in progress, then pick a new one
    const catIds = Object.keys(CATEGORIES).sort(() => Math.random() - 0.5);

    for (const catId of catIds) {
      if (bachelors.includes(catId)) continue; // Already graduated

      const cat = CATEGORIES[catId];
      for (const course of cat.courses) {
        if (completed.includes(course.id)) continue;
        const prereqsMet = course.prereqs.every(p => completed.includes(p));
        if (!prereqsMet) continue;
        if (Number(player.money || 0) < course.cost) continue;

        // Enroll
        player.money = Number(player.money) - course.cost;
        const now = new Date();
        const endsAt = new Date(now.getTime() + course.durationDays * 24 * 3600000);
        player.education.active = { courseId: course.id, startedAt: now, endsAt };
        stats.enrolled = true;
        stats.courseName = course.name;
        player.markModified('education');
        return stats;
      }
    }

    return stats;
  } catch (e) {
    console.error('NPC education handler error:', e.message);
    return stats;
  }
}

// ═══════════════════════════════════════════════════════════════
//  CASINO — spin the best affordable wheel (24h cooldown each)
// ═══════════════════════════════════════════════════════════════

async function handleCasino(player) {
  const stats = { spun: false, wheelName: null, reward: null };
  try {
    if (player.casino?.casinoSelfExclusion) return stats;

    const now = new Date();
    const DAY_MS = 24 * 60 * 60 * 1000;
    if (!player.casino) player.casino = {};
    if (!player.casino.lastSpins) player.casino.lastSpins = new Map();
    const lastSpins = player.casino.lastSpins;

    // Sort wheels by cost descending — prefer expensive ones
    const wheelIds = Object.keys(wheelSettings).sort(
      (a, b) => wheelSettings[b].cost - wheelSettings[a].cost
    );

    for (const wheelId of wheelIds) {
      const wheel = wheelSettings[wheelId];
      if (Number(player.money || 0) < wheel.cost) continue;

      // 24 h cooldown
      const lastSpin = lastSpins instanceof Map ? lastSpins.get(wheelId) : lastSpins?.[wheelId];
      if (lastSpin && (now.getTime() - new Date(lastSpin).getTime()) < DAY_MS) continue;

      // Pay
      player.money = Number(player.money) - wheel.cost;

      // Weighted random reward
      const totalChance = wheel.rewards.reduce((s, r) => s + (r.chance || 0), 0);
      let roll = Math.random() * totalChance;
      let reward = wheel.rewards[wheel.rewards.length - 1];
      for (const r of wheel.rewards) {
        roll -= r.chance || 0;
        if (roll <= 0) { reward = r; break; }
      }

      // Apply reward
      let desc = '';
      switch (reward.type) {
        case 'money':
          player.money = Number(player.money || 0) + Number(reward.value);
          desc = `$${fmtMoney(reward.value)}`;
          break;
        case 'points':
          player.points = Number(player.points || 0) + Number(reward.value);
          desc = `${reward.value} pts`;
          break;
        case 'tokens':
          desc = `${reward.value} tokens`;
          break;
        case 'item':
          try {
            const item = await Item.findOne({ id: String(reward.value) });
            if (item) {
              player.inventory = player.inventory || [];
              const idx = player.inventory.findIndex(e => String(e.item) === String(item._id));
              if (idx >= 0) player.inventory[idx].qty = Number(player.inventory[idx].qty || 0) + 1;
              else player.inventory.push({ item: item._id, qty: 1 });
              player.markModified('inventory');
              desc = item.name;
            }
          } catch { desc = 'item'; }
          break;
        case 'property':
          player.properties = player.properties || [];
          if (!player.properties.some(p => p.propertyId === reward.value)) {
            player.properties.push({ propertyId: reward.value, upgrades: new Map(), acquiredAt: new Date() });
            player.markModified('properties');
            desc = `property: ${reward.value}`;
          } else { desc = 'property (owned)'; }
          break;
        case 'special':
          desc = reward.value === 'lose' ? 'LOSE' : reward.value;
          break;
        case 'effect':
          desc = `effect:${reward.value}`;
          break;
        case 'honor':
          desc = `honor:${reward.value}`;
          break;
        default:
          desc = `${reward.type}:${reward.value}`;
      }

      // Record spin cooldown
      if (lastSpins instanceof Map) lastSpins.set(wheelId, now);
      else player.casino.lastSpins = new Map([[wheelId, now]]);
      player.markModified('casino');

      stats.spun = true;
      stats.wheelName = wheel.name;
      stats.reward = desc;
      return stats; // One spin per tick
    }

    return stats;
  } catch (e) {
    console.error('NPC casino handler error:', e.message);
    return stats;
  }
}

// ═══════════════════════════════════════════════════════════════
//  REAL ESTATE — buy best affordable property, upgrade, set home
// ═══════════════════════════════════════════════════════════════

async function handleRealEstate(player) {
  const stats = { bought: null, upgraded: null, newHome: null };
  try {
    player.properties = player.properties || [];
    const owned = new Set(player.properties.map(p => p.propertyId));
    const cash = Number(player.money || 0);

    // ── Buy best affordable property not yet owned ──
    const available = Object.values(PROPERTIES)
      .filter(p => p.market !== false && p.cost > 0 && !owned.has(p.id) && cash >= p.cost)
      .sort((a, b) => b.cost - a.cost);

    if (available.length > 0) {
      const prop = available[0];
      player.money = Number(player.money) - prop.cost;
      player.properties.push({
        propertyId: prop.id,
        upgrades: new Map(),
        acquiredAt: new Date(),
        upkeepDue: 0,
      });
      player.markModified('properties');
      stats.bought = prop.name;

      // Set as home if better
      const currentHome = PROPERTIES[player.home || 'trailer'];
      if (!currentHome || prop.baseHappyMax > (currentHome.baseHappyMax || 0)) {
        player.home = prop.id;
        stats.newHome = prop.name;
        player.happiness = player.happiness || {};
        player.happiness.happyMax = prop.baseHappyMax;
      }
    }

    // ── Upgrade a random owned property (50 % chance per tick) ──
    if (player.properties.length > 0 && Math.random() < 0.5) {
      const propEntry = choice(player.properties);
      const propCfg = PROPERTIES[propEntry.propertyId];
      if (propCfg && propCfg.upgradeLimits) {
        const upgradeIds = Object.keys(propCfg.upgradeLimits).sort(() => Math.random() - 0.5);
        for (const upId of upgradeIds) {
          const upgCfg = UPGRADES[upId];
          if (!upgCfg) continue;
          const currentLevel = (propEntry.upgrades instanceof Map
            ? propEntry.upgrades.get(upId)
            : propEntry.upgrades?.[upId]) || 0;
          const maxLevel = propCfg.upgradeLimits[upId] || 0;
          if (currentLevel >= maxLevel) continue;

          const nextLevel = currentLevel + 1;
          const cost = upgCfg.cost(nextLevel);
          if (Number(player.money || 0) < cost) continue;

          player.money = Number(player.money) - cost;
          if (propEntry.upgrades instanceof Map) {
            propEntry.upgrades.set(upId, nextLevel);
          } else {
            propEntry.upgrades = propEntry.upgrades || {};
            propEntry.upgrades[upId] = nextLevel;
          }
          player.markModified('properties');

          // Apply happyMax bonus
          const bonus = upgCfg.bonus(nextLevel);
          if (bonus.happyMax) {
            player.happiness = player.happiness || {};
            player.happiness.happyMax = Number(player.happiness.happyMax || 150) + bonus.happyMax;
          }

          stats.upgraded = `${upgCfg.name} Lv${nextLevel}`;
          break; // one upgrade action per tick
        }
      }
    }

    return stats;
  } catch (e) {
    console.error('NPC real-estate handler error:', e.message);
    return stats;
  }
}

// ═══════════════════════════════════════════════════════════════
//  BUSINESS — collect, buy, upgrade, hire (all inline)
// ═══════════════════════════════════════════════════════════════

async function handleBusiness(player) {
  const stats = { collected: 0, bought: null, upgraded: null, hired: 0 };
  try {
    const userId = player.user;

    // ── Collect all pending income from owned businesses ──
    const owned = await Business.find({ ownerId: userId });
    for (const biz of owned) {
      if (biz.pendingIncome > 0) {
        stats.collected += biz.pendingIncome;
        player.money = Number(player.money || 0) + biz.pendingIncome;
        biz.pendingIncome = 0;
        biz.pendingTicks = 0;
        await biz.save();
      }
    }

    // ── Buy the most expensive affordable business not yet owned ──
    const ownedTypes = new Set(owned.map(b => b.businessId));
    const affordable = Object.values(BUSINESSES)
      .filter(b => !ownedTypes.has(b.id) && Number(player.money || 0) >= b.cost)
      .sort((a, b) => b.cost - a.cost);

    if (affordable.length > 0 && Math.random() < 0.7) {
      const biz = affordable[0];
      player.money = Number(player.money) - biz.cost;
      await Business.create({
        ownerId: userId,
        businessId: biz.id,
        name: biz.name,
        level: 0,
        staff: 0,
        pendingIncome: 0,
        pendingTicks: 0,
      });
      stats.bought = biz.name;
    }

    // ── Upgrade one existing business (50 % chance) ──
    for (const biz of owned) {
      if (biz.level >= 5) continue;
      const nextLevel = biz.level + 1;
      const tier = UPGRADE_TIERS[nextLevel];
      if (!tier) continue;
      const cfg = BUSINESSES[biz.businessId];
      if (!cfg) continue;
      const cost = Math.floor(cfg.cost * tier.cost_mult);
      if (Number(player.money || 0) < cost) continue;
      if (Math.random() > 0.5) continue;

      player.money = Number(player.money) - cost;
      biz.level = nextLevel;
      await biz.save();
      stats.upgraded = `${biz.name} → ${tier.name}`;
      break;
    }

    // ── Hire staff (40 % chance per biz, up to 3 per tick) ──
    for (const biz of owned) {
      const cfg = BUSINESSES[biz.businessId];
      if (!cfg) continue;
      if (biz.staff >= (cfg.maxStaff || 0)) continue;
      const hireCost = 5000;
      if (Number(player.money || 0) < hireCost) continue;
      if (Math.random() > 0.4) continue;

      const toHire = Math.min(
        cfg.maxStaff - biz.staff,
        Math.floor(Number(player.money || 0) / hireCost),
        3
      );
      if (toHire <= 0) continue;

      player.money = Number(player.money) - hireCost * toHire;
      biz.staff += toHire;
      await biz.save();
      stats.hired += toHire;
    }

    return stats;
  } catch (e) {
    console.error('NPC business handler error:', e.message);
    return stats;
  }
}

// ═══════════════════════════════════════════════════════════════
//  PETS — buy best affordable pet (one per player)
// ═══════════════════════════════════════════════════════════════

async function handlePets(player) {
  const stats = { bought: null };
  try {
    const userId = player.user;

    // Already has a pet?
    const existing = await Pets.findOne({ ownerId: userId });
    if (existing) return stats;

    const cash = Number(player.money || 0);
    const affordable = Object.values(PETS)
      .filter(p => !p.exclusive && cash >= p.cost)
      .sort((a, b) => b.cost - a.cost); // most expensive first

    if (!affordable.length) return stats;

    const pet = affordable[0];
    player.money = Number(player.money) - pet.cost;

    await Pets.create({
      name: pet.name,
      type: pet.id,
      happyBonus: pet.happyBonus,
      petstoreCost: pet.cost,
      ownerId: userId,
    });

    // Boost happyMax
    player.happiness = player.happiness || {};
    player.happiness.happyMax = Number(player.happiness.happyMax || 150) + pet.happyBonus;

    stats.bought = pet.name;
    return stats;
  } catch (e) {
    // Unique-index duplication is harmless (race / pet already exists)
    if (e.code !== 11000) console.error('NPC pets handler error:', e.message);
    return stats;
  }
}

// ═══════════════════════════════════════════════════════════════
//  MARKET — list surplus items for sale, buy useful items
//  Returns credits[] — applied AFTER the bulk NPC save to avoid
//  stale-overwrite issues.
// ═══════════════════════════════════════════════════════════════

async function handleMarket(player) {
  const stats = { listed: 0, bought: 0, spent: 0, credits: [] };
  try {
    const inv = player.inventory || [];

    // ── List surplus items (keep 1, list the rest) ──
    for (const entry of inv) {
      if (entry.qty <= 2) continue;
      const item = await Item.findById(entry.item);
      if (!item || !item.sellable || !item.price || item.price <= 0) continue;

      const listQty = entry.qty - 1;
      const listPrice = Math.floor(item.price * (0.8 + Math.random() * 0.5)); // 80-130 %

      await ItemMarket.create({
        itemId: item.id,
        price: listPrice,
        amountAvailable: listQty,
        sellerId: player._id,
      });

      entry.qty = 1;
      stats.listed += listQty;
    }
    if (stats.listed > 0) player.markModified('inventory');

    // ── Buy useful items from other players' listings ──
    const cash = Number(player.money || 0);
    if (cash > 5000) {
      const listings = await ItemMarket.find({
        sellerId: { $ne: player._id },
        price: { $lte: Math.floor(cash * 0.1) },
        amountAvailable: { $gt: 0 },
      }).limit(5);

      for (const listing of listings) {
        const item = await Item.findOne({ id: listing.itemId });
        if (!item) continue;
        if (!['medicine', 'enhancers', 'drugs', 'cache'].includes(item.type)) continue;

        const buyQty = Math.min(listing.amountAvailable, 3);
        const totalCost = listing.price * buyQty;
        if (Number(player.money || 0) < totalCost) continue;

        player.money = Number(player.money) - totalCost;

        // Add to inventory
        const invIdx = inv.findIndex(e => String(e.item) === String(item._id));
        if (invIdx >= 0) inv[invIdx].qty = Number(inv[invIdx].qty || 0) + buyQty;
        else inv.push({ item: item._id, qty: buyQty });

        // Update or delete listing
        listing.amountAvailable -= buyQty;
        if (listing.amountAvailable <= 0) await ItemMarket.deleteOne({ _id: listing._id });
        else await listing.save();

        // Defer seller credit to post-save phase
        stats.credits.push({ sellerId: listing.sellerId, amount: totalCost });
        stats.bought += buyQty;
        stats.spent += totalCost;
      }
      if (stats.bought > 0) player.markModified('inventory');
    }

    return stats;
  } catch (e) {
    console.error('NPC market handler error:', e.message);
    return stats;
  }
}

// ═══════════════════════════════════════════════════════════════
//  ITEMS — use consumables from inventory (simplified inline)
// ═══════════════════════════════════════════════════════════════

async function handleItems(player) {
  const stats = { used: 0, items: [] };
  try {
    const inv = player.inventory || [];
    if (!inv.length) return stats;

    let usedCount = 0;
    for (let i = 0; i < inv.length && usedCount < 3; i++) {
      const entry = inv[i];
      if (!entry || entry.qty <= 0) continue;

      const item = await Item.findById(entry.item);
      if (!item || !item.usable) continue;

      const effect = item.effect || {};

      // Infer cooldown type
      const inferType = () => {
        if (item.type === 'drugs') return 'drug';
        if (item.type === 'enhancers') return 'booster';
        if (item.type === 'medicine') return 'medical';
        if (item.type === 'alchool') return 'alcohol';
        return '';
      };
      const cdType = (effect.cooldownType || inferType()).toLowerCase();
      const cdKey = cdType === 'alcohol' ? 'alcoholCooldown' : (cdType + 'Cooldown');

      // Skip if on cooldown
      if (cdType && player.cooldowns) {
        const remaining = Number(player.cooldowns[cdKey] || 0);
        if (remaining > 0) continue;
      }

      // Apply resource effects
      if (typeof effect.energy === 'number') {
        const max = Number(player.energyStats?.energyMax || 100);
        player.energyStats.energy = Math.min(max, Number(player.energyStats?.energy || 0) + effect.energy);
      }
      if (typeof effect.nerve === 'number') {
        const max = Number(player.nerveStats?.nerveMax || 20);
        player.nerveStats.nerve = Math.min(max, Number(player.nerveStats?.nerve || 0) + effect.nerve);
      }
      if (typeof effect.happy === 'number') {
        const max = Number(player.happiness?.happyMax || 150);
        player.happiness.happy = Math.min(max, Number(player.happiness?.happy || 0) + effect.happy);
      }
      if (typeof effect.points === 'number') {
        player.points = Number(player.points || 0) + effect.points;
      }
      if (typeof effect.addiction === 'number') {
        player.addiction = Number(player.addiction || 0) + effect.addiction;
      }
      // Battle stat bonuses
      if (effect.bonuses && typeof effect.bonuses === 'object') {
        player.battleStats = player.battleStats || {};
        for (const [stat, val] of Object.entries(effect.bonuses)) {
          if (typeof val === 'number') {
            player.battleStats[stat] = Number(player.battleStats[stat] || 0) + val;
          }
        }
      }

      // Set cooldown
      if (cdType) {
        player.cooldowns = player.cooldowns || {};
        const cdObj = effect.cooldowns && typeof effect.cooldowns === 'object' ? effect.cooldowns : null;
        if (cdObj) {
          for (const [key, sec] of Object.entries(cdObj)) {
            if (!Number(sec)) continue;
            const storeKey = key === 'alcohol' ? 'alcoholCooldown' : (key + 'Cooldown');
            player.cooldowns[storeKey] = Number(player.cooldowns[storeKey] || 0) + Number(sec);
          }
        } else if (Number(effect.cooldownSeconds) > 0) {
          player.cooldowns[cdKey] = Number(player.cooldowns[cdKey] || 0) + Number(effect.cooldownSeconds);
        }
      }

      // Consume 1 unit
      entry.qty -= 1;
      usedCount++;
      stats.used++;
      stats.items.push(item.name);
    }

    // Remove zero-qty slots
    player.inventory = inv.filter(e => e.qty > 0);
    if (usedCount > 0) player.markModified('inventory');

    return stats;
  } catch (e) {
    console.error('NPC items handler error:', e.message);
    return stats;
  }
}

module.exports = {
  handleEducation,
  handleCasino,
  handleRealEstate,
  handleBusiness,
  handlePets,
  handleMarket,
  handleItems,
};
