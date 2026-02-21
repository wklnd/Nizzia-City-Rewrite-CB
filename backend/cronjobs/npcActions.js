// NPC automated actions: stocks, bank, gym, crimes, jobs, drug operations
const cron = require('node-cron');

// --- Safe Chalk Import (Works with v4 and v5) ---
let chalk = null;
try {
    const mod = require('chalk');
    chalk = mod && mod.default ? mod.default : mod;
} catch (_) {
    // Fallback no-color shim
    const id = (x) => x;
    chalk = {
        blue: id, blueBright: id, green: id, yellow: id,
        magenta: id, gray: id, red: id, cyan: id, bold: { red: id }
    };
}

// --- Safe color helpers ---
const color = {
    blue: (s) => (chalk && typeof chalk.blue === 'function' ? chalk.blue(s) : s),
    blueBright: (s) => (
        chalk && typeof chalk.blueBright === 'function'
            ? chalk.blueBright(s)
            : (chalk && typeof chalk.blue === 'function' ? chalk.blue(s) : s)
    ),
    green: (s) => (chalk && typeof chalk.green === 'function' ? chalk.green(s) : s),
    yellow: (s) => (chalk && typeof chalk.yellow === 'function' ? chalk.yellow(s) : s),
    magenta: (s) => (chalk && typeof chalk.magenta === 'function' ? chalk.magenta(s) : s),
    red: (s) => (chalk && typeof chalk.red === 'function' ? chalk.red(s) : s),
    cyan: (s) => (chalk && typeof chalk.cyan === 'function' ? chalk.cyan(s) : s),
    gray: (s) => (
        chalk && typeof chalk.gray === 'function'
            ? chalk.gray(s)
            : (chalk && typeof chalk.grey === 'function' ? chalk.grey(s) : s)
    ),
};

const Player = require('../models/Player');
const BankAccount = require('../models/Bank');
const Item = require('../models/Item');
const Warehouse = require('../models/Warehouse');
const GrowPot = require('../models/GrowPot');
const WeedStash = require('../models/WeedStash');
const stocksCfg = require('../config/stocks');
const { STRAINS, WAREHOUSES, DIRT_COST, POT_COST } = require('../config/grow');
const { CRIMES, LOCATION } = require('../config/crimes/search_for_cash');
const { CITY_JOBS, meta: jobMeta } = require('../config/job');
const { getLatestPrice } = require('../services/stockService');
const { getCurrentRates, getEndDate, calculatePayout } = require('../services/bankService');
const gymService = require('../services/gymService');

const { rollPersonality, shouldAct } = require('../config/npcPersonalities');
const {
  handleEducation, handleCasino, handleRealEstate,
  handleBusiness, handlePets, handleMarket, handleItems,
} = require('./npcHustleHandlers');

// --- Utility functions ---
function choice(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }
const ts = () => `[${new Date().toTimeString().slice(0,8)}]`;
function fmtMoney(n) {
    return Number(n || 0).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

// --- Core NPC handlers (unchanged) ---
async function handleStocks(player, prices) {
    try {
        const symbols = Object.keys(stocksCfg);
        const cash = Number(player.money || 0);
        const minSpend = 100;
        const hasHoldings = Array.isArray(player.portfolio) && player.portfolio.length > 0;
        const budgetFrac = hasHoldings ? (0.20 + Math.random() * 0.20) : (0.35 + Math.random() * 0.35);
        const budget = Math.max(minSpend, cash * budgetFrac);

        // SELL rules
        if (hasHoldings) {
            let bestSell = null;
            const targetGain = 0.03 + Math.random() * 0.12;
            const stopLoss = 0.25 + Math.random() * 0.15;

            for (let i = 0; i < player.portfolio.length; i++) {
                const h = player.portfolio[i];
                const price = prices[h.symbol] || 0;
                if (!price || !h.shares) continue;

                const gainPct = h.avgPrice > 0 ? (price - h.avgPrice) / h.avgPrice : 0;
                let shouldSell = false, reason = '';

                if (gainPct >= targetGain) {
                    shouldSell = true; reason = `take-profit ${(gainPct * 100).toFixed(1)}%`;
                } else if (gainPct <= -stopLoss) {
                    shouldSell = true; reason = `stop-loss ${(gainPct * 100).toFixed(1)}%`;
                }

                if (shouldSell) {
                    let frac;
                    if (gainPct >= 0.30) frac = 0.70 + Math.random() * 0.30;
                    else if (gainPct >= 0.10) frac = 0.40 + Math.random() * 0.35;
                    else frac = 0.30 + Math.random() * 0.30;

                    const qty = Math.max(1, Math.floor(h.shares * frac));
                    const proceeds = Number((qty * price).toFixed(2));
                    if (!bestSell || proceeds > bestSell.proceeds) {
                        bestSell = { idx: i, symbol: h.symbol, price, qty, proceeds, reason };
                    }
                }
            }

            if (!bestSell && Math.random() < 0.15) {
                for (let i = 0; i < player.portfolio.length; i++) {
                    const h = player.portfolio[i];
                    const price = prices[h.symbol] || 0;
                    if (!price || !h.shares) continue;
                    const gainPct = h.avgPrice > 0 ? (price - h.avgPrice) / h.avgPrice : 0;
                    if (gainPct <= -stopLoss) {
                        const frac = 0.30 + Math.random() * 0.30;
                        const qty = Math.max(1, Math.floor(h.shares * frac));
                        const proceeds = Number((qty * price).toFixed(2));
                        bestSell = { idx: i, symbol: h.symbol, price, qty, proceeds, reason: `deep-stop ${(gainPct * 100).toFixed(1)}%` };
                        break;
                    }
                }
            }

            if (bestSell) {
                const h = player.portfolio[bestSell.idx];
                h.shares = Number((h.shares - bestSell.qty).toFixed(8));
                if (h.shares <= 0) player.portfolio.splice(bestSell.idx, 1);
                player.money = Number(((player.money || 0) + bestSell.proceeds).toFixed(2));
                if (typeof player.markModified === 'function') player.markModified('portfolio');
                return { action: 'sell', qty: bestSell.qty, value: bestSell.proceeds, symbol: bestSell.symbol };
            }
        }

        // BUY rules
        const affordable = symbols.filter(s => prices[s] > 0 && prices[s] <= budget);
        const cheapest = symbols.slice().sort((a, b) => (prices[a] || Infinity) - (prices[b] || Infinity))[0];
        const sym = (affordable.length ? choice(affordable) : cheapest) || choice(symbols);
        const price = prices[sym] || 0;
        if (!price) return { action: 'skip' };

        const spend = clamp(budget, 0, cash);
        const shares = Math.max(1, Math.floor(spend / price));
        if (shares <= 0) return { action: 'skip' };

        const cost = Number((shares * price).toFixed(2));
        if ((player.money || 0) < cost) return { action: 'skip' };

        const idx = (player.portfolio || []).findIndex(h => h.symbol === sym);
        if (idx >= 0) {
            const h = player.portfolio[idx];
            const newShares = Number(h.shares || 0) + shares;
            const newAvg = newShares > 0 ? Number(((h.avgPrice * h.shares + cost) / newShares).toFixed(4)) : price;
            h.shares = newShares;
            h.avgPrice = newAvg;
        } else {
            player.portfolio = player.portfolio || [];
            player.portfolio.push({ symbol: sym, shares, avgPrice: price });
        }

        player.money = Number(((player.money || 0) - cost).toFixed(2));
        if (typeof player.markModified === 'function') player.markModified('portfolio');
        return { action: 'buy', qty: shares, value: cost, symbol: sym };

    } catch (e) {
        console.error('NPC stocks handler error:', e.message);
        return { action: 'error' };
    }
}


async function handleGym(player){
  try {
    // Only train when near max energy, then use ALL energy
    const e = Number(player.energyStats?.energy || 0);
    const eMax = Number(player.energyStats?.energyMax || 0);
    if (e <= 0 || eMax <= 0) return;
    const nearMax = e >= Math.floor(eMax * 0.9); // 90%+ of max counts as "close to max"
    if (!nearMax) return;
    const stats = ['strength','speed','dexterity','defense'];
    const statType = choice(stats);
    // Use all available energy in a single train burst
    const energyPerTrain = e;
    const gain = gymService.calculateGain({
      statTotal: Number(player.battleStats?.[statType] || 0),
      happy: Number(player.happiness?.happy || 0),
      gymDots: 10,
      energyPerTrain,
      perkBonus: 0,
      statType,
      randomValue: Math.floor(Math.random()*101) - 50,
    });
    player.battleStats = player.battleStats || {};
    player.battleStats[statType] = Number(player.battleStats[statType] || 0) + parseFloat(gain);
    player.energyStats.energy = 0;
    // Training reduces happiness proportionally to energy spent
    if (player.happiness && typeof player.happiness.happy === 'number') {
      const happinessCost = Math.max(1, Math.floor(energyPerTrain));
      player.happiness.happy = Math.max(0, Number(player.happiness.happy || 0) - happinessCost);
    }
  } catch (e) {
    console.error('NPC gym handler error:', e.message);
  }
}

// ═══════════════════════════════════════════════════════════════
//  NEW: Crime — Search for Cash (burn all nerve)
// ═══════════════════════════════════════════════════════════════
async function handleCrime(player) {
  try {
    const nerveCost = Number(CRIMES.search_for_cash?.nerveCost || 2);
    let nerve = Number(player.nerveStats?.nerve || 0);
    if (nerve < nerveCost) return { attempts: 0, money: 0 };

    const locIds = CRIMES.search_for_cash?.location || ['subway_station'];
    const locs = locIds
      .map(id => Object.values(LOCATION).find(l => l.id === id))
      .filter(Boolean);
    if (!locs.length) return { attempts: 0, money: 0 };

    // Time-of-day popularity
    const hour = new Date().getHours();
    const bucket = hour >= 6 && hour < 12 ? 'morning' : hour >= 12 && hour < 18 ? 'afternoon' : hour >= 18 && hour < 22 ? 'evening' : 'night';

    let totalMoney = 0;
    let attempts = 0;
    let successes = 0;

    // Burn ALL available nerve on crimes
    while (nerve >= nerveCost) {
      const loc = locs[Math.floor(Math.random() * locs.length)];
      nerve -= nerveCost;
      attempts++;

      // Outcome roll (same logic as crimeController)
      const popPerc = Number((loc.PopularityAt || {})[bucket] || 50);
      const popularity = Math.max(0, Math.min(1, popPerc / 100));
      const failFactor = 1 - 0.5 * popularity;
      const critChance = Math.max(0, (loc.CriticalFailChance || 0) * failFactor);
      const minorChance = Math.max(0, (loc.MinorFailChance || 0) * failFactor);
      const roll = Math.random() * 100;

      if (roll < critChance) {
        // Critical fail — take 20% hp damage
        const hp = Number(player.health || 100);
        const dmg = Math.max(1, Math.floor(hp * 0.2));
        player.health = Math.max(0, hp - dmg);
        player.crimesCriticalFails = (player.crimesCriticalFails || 0) + 1;
      } else if (roll < critChance + minorChance) {
        // Minor fail — no reward
        player.crimesFails = (player.crimesFails || 0) + 1;
      } else {
        // Success — roll loot
        successes++;
        for (const entry of (loc.loot || [])) {
          const base = Number(entry.chance || 0);
          const lootFactor = 0.5 + popularity;
          const effChance = Math.min(100, base * lootFactor);
          if (Math.random() * 100 > effChance) continue;

          if (entry.type === 'money') {
            const min = Math.max(0, Number(entry.min || 0));
            const max = Math.max(min, Number(entry.max || min));
            const amt = Math.floor(Math.random() * (max - min + 1)) + min;
            totalMoney += amt;
          } else if (entry.type === 'item') {
            // NPCs collect items too
            const itemId = String(entry.value);
            if (itemId === '0') continue; // skip placeholder items
            try {
              const doc = await Item.findOne({ id: itemId });
              if (doc) {
                player.inventory = player.inventory || [];
                const idx = player.inventory.findIndex(e => String(e.item) === String(doc._id));
                if (idx >= 0) player.inventory[idx].qty = Number(player.inventory[idx].qty || 0) + 1;
                else player.inventory.push({ item: doc._id, qty: 1 });
              }
            } catch { /* item not found, skip */ }
          }
        }
        player.crimesSuccessful = (player.crimesSuccessful || 0) + 1;
      }
      player.crimesCommitted = (player.crimesCommitted || 0) + 1;
    }

    // Apply results
    if (totalMoney > 0) {
      player.$locals._txMeta = { type: 'crime', description: `NPC crime spree ($${fmtMoney(totalMoney)})` };
      player.money = Number((player.money || 0) + totalMoney).toFixed(2) * 1;
    }
    player.nerveStats.nerve = Math.max(0, nerve);
    if (player.inventory) player.markModified('inventory');

    return { attempts, successes, money: totalMoney };
  } catch (e) {
    console.error('NPC crime handler error:', e.message);
    return { attempts: 0, money: 0 };
  }
}

// ═══════════════════════════════════════════════════════════════
//  NEW: Work Job (city jobs only — guaranteed income)
// ═══════════════════════════════════════════════════════════════
async function handleWork(player) {
  try {
    // ── Auto-hire: if unemployed, pick a random city job ──
    if (!player.job?.jobId && !player.job?.companyId) {
      // Check quit penalty
      if (player.job?.lastQuitAt) {
        const penaltyEnd = new Date(player.job.lastQuitAt).getTime() + (jobMeta.quitPenaltyHours || 24) * 3600000;
        if (Date.now() < penaltyEnd) return { worked: false, reason: 'quit-penalty' };
      }
      const jobKeys = Object.keys(CITY_JOBS);
      if (jobKeys.length) {
        const jobId = jobKeys[Math.floor(Math.random() * jobKeys.length)];
        player.job = player.job || {};
        player.job.jobId = jobId;
        player.job.jobRank = 0;
        player.job.jobPoints = 0;
        player.job.lastWorkedAt = null;
        player.markModified('job');
      }
      return { worked: false, hired: true };
    }

    if (!player.job?.jobId) return { worked: false };

    // Cooldown check
    if (player.job.lastWorkedAt) {
      const cooldownEnd = new Date(player.job.lastWorkedAt).getTime() + (jobMeta.workCooldownMinutes || 60) * 60000;
      if (Date.now() < cooldownEnd) return { worked: false, reason: 'cooldown' };
    }

    const jobId = player.job.jobId;
    const jobCfg = Object.values(CITY_JOBS).find(j => j.id === jobId);
    if (!jobCfg) return { worked: false };

    const rankIdx = player.job.jobRank || 0;
    const rank = jobCfg.ranks[rankIdx] || jobCfg.ranks[0];
    const pay = rank.pay || 0;
    const jpGained = rank.jobPoints || 0;
    const statGains = rank.statsGained || {};

    // Apply pay
    player.$locals._txMeta = { type: 'job', description: `${jobCfg.name} paycheck` };
    player.money = Number(player.money || 0) + pay;
    player.job.jobPoints = (player.job.jobPoints || 0) + jpGained;
    player.job.lastWorkedAt = new Date();

    // Apply stat gains
    player.workStats = player.workStats || {};
    player.workStats.manuallabor = (player.workStats.manuallabor || 0) + (statGains.manuallabor || 0);
    player.workStats.intelligence = (player.workStats.intelligence || 0) + (statGains.intelligence || 0);
    player.workStats.endurance = (player.workStats.endurance || 0) + (statGains.endurance || 0);

    // Auto-promote if enough JP and stats
    const nextRank = jobCfg.ranks[rankIdx + 1];
    if (nextRank && rankIdx < 9) {
      const reqJP = rank.pointsForPromotion || Infinity;
      const ws = player.workStats;
      const reqStats = nextRank.requiredStats || {};
      const meetsJP = player.job.jobPoints >= reqJP;
      const meetsStats = (ws.manuallabor || 0) >= (reqStats.manuallabor || 0) &&
                         (ws.intelligence || 0) >= (reqStats.intelligence || 0) &&
                         (ws.endurance || 0) >= (reqStats.endurance || 0);
      if (meetsJP && meetsStats) {
        player.job.jobRank = rankIdx + 1;
        player.job.jobPoints = 0;
      }
    }

    player.markModified('job');
    player.markModified('workStats');
    return { worked: true, pay, jobName: jobCfg.name, rankName: rank.name };
  } catch (e) {
    console.error('NPC work handler error:', e.message);
    return { worked: false };
  }
}

// ═══════════════════════════════════════════════════════════════
//  NEW: Drug Operations — harvest, sell, replant
// ═══════════════════════════════════════════════════════════════

/** Pick a strain the NPC can afford, biased toward higher tiers */
function pickStrain(cash) {
  // Sort strains by sell price descending (best profit first)
  const affordable = Object.values(STRAINS)
    .filter(s => cash >= s.seedCost + DIRT_COST)
    .sort((a, b) => b.sellPrice - a.sellPrice);
  if (!affordable.length) return null;
  // 60% chance best affordable, 30% second best, 10% random
  const roll = Math.random();
  if (roll < 0.6) return affordable[0];
  if (roll < 0.9 && affordable.length > 1) return affordable[1];
  return affordable[Math.floor(Math.random() * affordable.length)];
}

/** Compute pot state (same logic as growService) */
function computeNpcPotState(pot) {
  if (!pot.strainId || !pot.plantedAt) return { done: false };
  const strain = STRAINS[pot.strainId];
  if (!strain) return { done: false };
  const dur = Math.floor(strain.growTime / 3); // per-stage duration
  const elapsed = Math.floor((Date.now() - new Date(pot.stageStartedAt || pot.plantedAt).getTime()) / 1000);
  let idx = ['seedling', 'vegetative', 'flowering', 'ready'].indexOf(pot.stage || 'seedling');
  if (idx < 0) idx = 0;
  let rem = elapsed;
  while (idx < 3 && rem >= dur) { rem -= dur; idx++; }
  return { done: idx >= 3, strainId: pot.strainId };
}

async function handleDrugs(player) {
  const stats = { sold: 0, earnings: 0, harvested: 0, planted: 0, warehouseBought: false, potsBought: 0 };
  try {
    const userId = player.user;

    // ── Step 1: Auto-buy warehouse if rich enough and none owned ──
    let wh = await Warehouse.findOne({ ownerId: userId });
    if (!wh) {
      // Only buy if NPC has enough cash (pick biggest affordable)
      const cash = Number(player.money || 0);
      const affordable = Object.values(WAREHOUSES)
        .filter(w => cash >= w.cost + POT_COST * 2) // need at least 2 pots too
        .sort((a, b) => b.cost - a.cost);
      if (affordable.length) {
        const whDef = affordable[0];
        player.$locals._txMeta = { type: 'purchase', description: `NPC bought ${whDef.name}` };
        player.money = Number(player.money || 0) - whDef.cost;
        wh = await Warehouse.create({ ownerId: userId, type: whDef.id, pots: 0 });
        stats.warehouseBought = true;
      }
    }
    if (!wh) return stats;

    const whDef = WAREHOUSES[wh.type] || {};

    // ── Step 2: Auto-buy pots if cash allows ──
    while (wh.pots < (whDef.maxPots || 2) && Number(player.money || 0) >= POT_COST) {
      const newIndex = wh.pots;
      player.money = Number(player.money || 0) - POT_COST;
      wh.pots += 1;
      await GrowPot.findOneAndUpdate(
        { ownerId: userId, potIndex: newIndex },
        { ownerId: userId, potIndex: newIndex },
        { upsert: true, new: true }
      );
      stats.potsBought++;
    }
    if (stats.potsBought) await wh.save();

    // ── Step 3: Sell ALL weed stash ──
    const stashes = await WeedStash.find({ ownerId: userId, grams: { $gt: 0 } });
    for (const stash of stashes) {
      const strain = STRAINS[stash.strainId];
      if (!strain || !stash.grams) continue;
      const earnings = stash.grams * strain.sellPrice;
      stats.sold += stash.grams;
      stats.earnings += earnings;
      player.$locals._txMeta = { type: 'sale', description: `NPC sold ${stash.grams}g ${stash.strainId}` };
      player.money = Number(player.money || 0) + earnings;
      stash.grams = 0;
      await stash.save();
    }

    // ── Step 4: Harvest ready plants & replant ──
    const pots = await GrowPot.find({ ownerId: userId }).sort('potIndex');
    for (const pot of pots) {
      if (pot.strainId) {
        // Check if ready to harvest
        const state = computeNpcPotState(pot);
        if (state.done) {
          const strain = STRAINS[pot.strainId];
          if (strain) {
            const grams = Math.floor(Math.random() * (strain.yield.max - strain.yield.min + 1)) + strain.yield.min;
            await WeedStash.findOneAndUpdate(
              { ownerId: userId, strainId: pot.strainId },
              { $inc: { grams } },
              { upsert: true, new: true }
            );
            stats.harvested += grams;
            // Clear pot for replanting
            pot.strainId = null;
            pot.stage = null;
            pot.plantedAt = null;
            pot.stageStartedAt = null;
            pot.harvestedAt = new Date();
            await pot.save();
          }
        }
      }

      // Plant in empty pots
      if (!pot.strainId) {
        const strain = pickStrain(Number(player.money || 0));
        if (strain) {
          const totalCost = strain.seedCost + DIRT_COST;
          player.money = Number(player.money || 0) - totalCost;
          pot.strainId = strain.id;
          pot.stage = 'seedling';
          pot.plantedAt = new Date();
          pot.stageStartedAt = new Date();
          pot.harvestedAt = null;
          await pot.save();
          stats.planted++;
        }
      }
    }

    return stats;
  } catch (e) {
    console.error('NPC drug handler error:', e.message);
    return stats;
  }
}

async function handleBank(player){
  try {
    // First, withdraw any matured accounts
    const now = new Date();
    const matured = await BankAccount.find({ player: player._id, isWithdrawn: false, endDate: { $lte: now } });
    for (const acct of matured) {
      const { total } = calculatePayout(acct.depositedAmount, acct.interestRate, acct.period);
      acct.isWithdrawn = true;
      await acct.save();
      player.money = Number(((player.money || 0) + total).toFixed(2));
    }

    // With a small probability, open a new deposit if none active
    const active = await BankAccount.findOne({ player: player._id, isWithdrawn: false, endDate: { $gt: now } });
    if (!active && Math.random() < 0.35) {
      const cash = player.money || 0;
      if (cash > 1000) {
        const { rates } = await getCurrentRates();
        const periods = Object.keys(rates);
        const period = choice(periods);
        const apr = Number(rates[period]);
        const maxDeposit = Math.min(2000000000, cash * (0.1 + Math.random() * 0.9)); // 10-90% of cash
        const amount = Math.max(1, Math.floor(maxDeposit));
        if (amount >= 1 && cash >= amount) {
          const acct = new BankAccount({
            player: player._id,
            depositedAmount: amount,
            period,
            interestRate: apr,
            startDate: now,
            endDate: getEndDate(now, period),
          });
          await acct.save();
          player.money = Number((cash - amount).toFixed(2));
        }
      }
    }
  } catch (e) {
    console.error('NPC bank handler error:', e.message);
  }
}

async function tickNpcActions(){
  // Precompute latest prices once for this tick
  const symbols = Object.keys(stocksCfg);
  const prices = {};
  for (const s of symbols) {
    try { const p = await getLatestPrice(s); prices[s] = Number(p?.price || 0); } catch { prices[s] = 0; }
  }

  // Select NPCs with all fields needed for every action
  const npcs = await Player.find({ npc: true }).select(
    'name user money portfolio energyStats battleStats happiness npc npcPersonality ' +
    'nerveStats health inventory job workStats points addiction cooldowns ' +
    'crimesCommitted crimesSuccessful crimesFails crimesCriticalFails crimeExp exp crimesXpList ' +
    'education casino properties home'
  );
  if (!npcs || npcs.length === 0) return;
  console.log(`${ts()} [npc] found NPCs: ${npcs.length}`);

  const changed = new Set();

  // ── Auto-assign personalities on first encounter ──
  let personalitiesAssigned = 0;
  for (const p of npcs) {
    if (!p.npcPersonality) {
      p.npcPersonality = rollPersonality();
      personalitiesAssigned++;
      changed.add(p);
    }
  }
  if (personalitiesAssigned > 0) {
    console.log(`${ts()} ${color.magenta('[npc] assigned')} ${personalitiesAssigned} personalities`);
  }

  // ── Personality-based participation (replaces old sampleSubset) ──
  const stocksSet  = npcs.filter(p => shouldAct(p.npcPersonality, 'stocks'));
  const gymSet     = npcs.filter(p => shouldAct(p.npcPersonality, 'gym'));
  const bankSet    = npcs.filter(p => shouldAct(p.npcPersonality, 'bank'));
  const crimeSet   = npcs.filter(p => shouldAct(p.npcPersonality, 'crime'));
  const workSet    = npcs.filter(p => shouldAct(p.npcPersonality, 'work'));
  const drugSet    = npcs.filter(p => shouldAct(p.npcPersonality, 'drugs'));
  const eduSet     = npcs.filter(p => shouldAct(p.npcPersonality, 'education'));
  const casinoSet  = npcs.filter(p => shouldAct(p.npcPersonality, 'casino'));
  const estateSet  = npcs.filter(p => shouldAct(p.npcPersonality, 'realEstate'));
  const bizSet     = npcs.filter(p => shouldAct(p.npcPersonality, 'business'));
  const petSet     = npcs.filter(p => shouldAct(p.npcPersonality, 'pets'));
  const marketSet  = npcs.filter(p => shouldAct(p.npcPersonality, 'market'));
  const itemSet    = npcs.filter(p => shouldAct(p.npcPersonality, 'items'));

  // ══════════════════════════════════════════════════════════
  //  EXISTING HANDLERS
  // ══════════════════════════════════════════════════════════

  // ── Bank ──
  for (const p of bankSet) { await handleBank(p); changed.add(p); }

  // ── Stocks ──
  let buys=0, sells=0, skips=0;
  let buyShares=0, sellShares=0; let buyValue=0, sellValue=0;
  for (const p of stocksSet) {
    const r = await handleStocks(p, prices);
    if (r && r.action === 'buy') { buys++; buyShares += Number(r.qty||0); buyValue += Number(r.value||0); }
    else if (r && r.action === 'sell') { sells++; sellShares += Number(r.qty||0); sellValue += Number(r.value||0); }
    else { skips++; }
    changed.add(p);
  }

  // ── Gym ──
  for (const p of gymSet) { await handleGym(p); changed.add(p); }

  // ── Crimes (burn all nerve) ──
  let crimeAttempts = 0, crimeSuccesses = 0, crimeMoney = 0;
  for (const p of crimeSet) {
    const r = await handleCrime(p);
    crimeAttempts += r.attempts;
    crimeSuccesses += (r.successes || 0);
    crimeMoney += r.money;
    changed.add(p);
  }

  // ── Work Jobs ──
  let worked = 0, workPay = 0;
  for (const p of workSet) {
    const r = await handleWork(p);
    if (r.worked) { worked++; workPay += (r.pay || 0); }
    changed.add(p);
  }

  // ── Drug Operations ──
  let drugsSold = 0, drugEarnings = 0, drugsHarvested = 0, drugsPlanted = 0;
  for (const p of drugSet) {
    const r = await handleDrugs(p);
    drugsSold += r.sold;
    drugEarnings += r.earnings;
    drugsHarvested += r.harvested;
    drugsPlanted += r.planted;
    changed.add(p);
  }

  // ══════════════════════════════════════════════════════════
  //  NEW HANDLERS — education, casino, real estate, business,
  //                  pets, items, market
  // ══════════════════════════════════════════════════════════

  // ── Education ──
  let eduEnrolled = 0, eduCompleted = 0;
  for (const p of eduSet) {
    const r = await handleEducation(p);
    if (r.enrolled) eduEnrolled++;
    if (r.completed) eduCompleted++;
    changed.add(p);
  }

  // ── Casino ──
  let casinoSpins = 0;
  for (const p of casinoSet) {
    const r = await handleCasino(p);
    if (r.spun) casinoSpins++;
    changed.add(p);
  }

  // ── Real Estate ──
  let estBought = 0, estUpgraded = 0;
  for (const p of estateSet) {
    const r = await handleRealEstate(p);
    if (r.bought) estBought++;
    if (r.upgraded) estUpgraded++;
    changed.add(p);
  }

  // ── Business ──
  let bizCollected = 0, bizBought = 0, bizUpgraded = 0, bizHired = 0;
  for (const p of bizSet) {
    const r = await handleBusiness(p);
    bizCollected += r.collected;
    if (r.bought) bizBought++;
    if (r.upgraded) bizUpgraded++;
    bizHired += r.hired;
    changed.add(p);
  }

  // ── Pets ──
  let petsBought = 0;
  for (const p of petSet) {
    const r = await handlePets(p);
    if (r.bought) petsBought++;
    changed.add(p);
  }

  // ── Items (use consumables) ──
  let itemsUsed = 0;
  for (const p of itemSet) {
    const r = await handleItems(p);
    itemsUsed += r.used;
    changed.add(p);
  }

  // ── Market (list & buy) — credits deferred to post-save ──
  let mktListed = 0, mktBought = 0, mktSpent = 0;
  const allMarketCredits = [];
  for (const p of marketSet) {
    const r = await handleMarket(p);
    mktListed += r.listed;
    mktBought += r.bought;
    mktSpent += r.spent;
    if (r.credits) allMarketCredits.push(...r.credits);
    changed.add(p);
  }

  // ── Save all modified NPCs ──
  for (const p of changed) {
    try { await p.save(); } catch (e) { console.error('Failed saving NPC:', e.message); }
  }

  // ── Apply market seller credits AFTER bulk save to avoid overwrites ──
  for (const { sellerId, amount } of allMarketCredits) {
    try { await Player.updateOne({ _id: sellerId }, { $inc: { money: amount } }); } catch { /* skip */ }
  }

  // ══════════════════════════════════════════════════════════
  //  SUMMARY LOGS
  // ══════════════════════════════════════════════════════════

  const vol = buyValue + sellValue;
  const priced = Object.values(prices).filter(v => Number(v) > 0).length;
  console.log([`${ts()}`,
    color.blueBright('[npc] stocks'),
    color.green(`buys=${buys} (${buyShares} sh, $${fmtMoney(buyValue)})`),
    color.yellow(`sells=${sells} (${sellShares} sh, $${fmtMoney(sellValue)})`),
    color.magenta(`volume=$${fmtMoney(vol)}`),
    color.gray(`actors=${stocksSet.length} symbols=${symbols.length} priced=${priced}`)
  ].join('  '));

  if (crimeAttempts > 0) {
    console.log([`${ts()}`,
      color.red('[npc] crime'),
      color.yellow(`attempts=${crimeAttempts}`),
      color.green(`success=${crimeSuccesses}`),
      color.magenta(`earned=$${fmtMoney(crimeMoney)}`),
      color.gray(`actors=${crimeSet.length}`)
    ].join('  '));
  }

  if (worked > 0) {
    console.log([`${ts()}`,
      color.cyan('[npc] jobs'),
      color.green(`worked=${worked}`),
      color.magenta(`pay=$${fmtMoney(workPay)}`),
      color.gray(`actors=${workSet.length}`)
    ].join('  '));
  }

  if (drugsSold > 0 || drugsHarvested > 0 || drugsPlanted > 0) {
    console.log([`${ts()}`,
      color.green('[npc] drugs'),
      color.yellow(`sold=${drugsSold}g ($${fmtMoney(drugEarnings)})`),
      color.magenta(`harvested=${drugsHarvested}g`),
      color.cyan(`planted=${drugsPlanted}`),
      color.gray(`actors=${drugSet.length}`)
    ].join('  '));
  }

  if (eduEnrolled > 0 || eduCompleted > 0) {
    console.log([`${ts()}`,
      color.cyan('[npc] education'),
      color.green(`enrolled=${eduEnrolled}`),
      color.magenta(`completed=${eduCompleted}`),
      color.gray(`actors=${eduSet.length}`)
    ].join('  '));
  }

  if (casinoSpins > 0) {
    console.log([`${ts()}`,
      color.yellow('[npc] casino'),
      color.green(`spins=${casinoSpins}`),
      color.gray(`actors=${casinoSet.length}`)
    ].join('  '));
  }

  if (estBought > 0 || estUpgraded > 0) {
    console.log([`${ts()}`,
      color.magenta('[npc] real-estate'),
      color.green(`bought=${estBought}`),
      color.cyan(`upgraded=${estUpgraded}`),
      color.gray(`actors=${estateSet.length}`)
    ].join('  '));
  }

  if (bizBought > 0 || bizCollected > 0 || bizUpgraded > 0 || bizHired > 0) {
    console.log([`${ts()}`,
      color.blue('[npc] business'),
      color.green(`bought=${bizBought}`),
      color.magenta(`collected=$${fmtMoney(bizCollected)}`),
      color.cyan(`upgraded=${bizUpgraded} hired=${bizHired}`),
      color.gray(`actors=${bizSet.length}`)
    ].join('  '));
  }

  if (petsBought > 0) {
    console.log([`${ts()}`,
      color.green('[npc] pets'),
      color.magenta(`bought=${petsBought}`),
      color.gray(`actors=${petSet.length}`)
    ].join('  '));
  }

  if (itemsUsed > 0) {
    console.log([`${ts()}`,
      color.yellow('[npc] items'),
      color.green(`used=${itemsUsed}`),
      color.gray(`actors=${itemSet.length}`)
    ].join('  '));
  }

  if (mktListed > 0 || mktBought > 0) {
    console.log([`${ts()}`,
      color.cyan('[npc] market'),
      color.green(`listed=${mktListed}`),
      color.yellow(`bought=${mktBought}`),
      color.magenta(`spent=$${fmtMoney(mktSpent)}`),
      color.gray(`actors=${marketSet.length}`)
    ].join('  '));
  }
}

function scheduleNpcActions(){
  // every 5 minutes staggered actions (lower frequency to reduce load)
  cron.schedule('*/5 * * * *', async () => {
    console.log(`${ts()} [cron] NPC actions tick`);
    await tickNpcActions();
  });
  // One-time warm-up tick shortly after startup to confirm it's working
  setTimeout(() => {
    warmUpSummary = [ `${ts()}`, color.green('[npc]'), color.blueBright('[warm-up]') ];    
    console.log(warmUpSummary.join(' '));
    tickNpcActions().catch(e => console.error('NPC warm-up error:', e.message));
  }, 15000);
}

module.exports = scheduleNpcActions;
