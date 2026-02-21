// ═══════════════════════════════════════════════════════════════
//  Mission & Combat Service — Deliveries, attacks, territory seizure,
//  assassinations, corruption, sabotage, smuggling, intimidation
// ═══════════════════════════════════════════════════════════════

const CartelMission = require('../../models/CartelMission');
const CartelNPC     = require('../../models/CartelNPC');
const Territory     = require('../../models/Territory');
const Cartel        = require('../../models/Cartel');
const { resolveCartel } = require('./cartelService');
const { grantXP, adjustLoyalty } = require('./npcService');
const {
  MISSION_TYPES,
  TERRITORIES,
  DRUGS,
  COMBAT_WEIGHTS,
  DEFENDER_BONUS,
  CASUALTY_CHANCE_LOSS,
  CASUALTY_CHANCE_WIN,
  INJURY_CHANCE_WIN,
  INJURY_RECOVERY_HOURS,
  HEAT_PER_DELIVERY,
  HEAT_PER_ATTACK,
  HEAT_PER_SEIZE,
  HEAT_PER_ASSASSINATION,
  HEAT_PER_SABOTAGE,
  HEAT_PER_SMUGGLING,
  HEAT_PER_INTIMIDATION,
  HEAT_CORRUPTION_REDUCE,
  NPC_LOYALTY_GAIN_MISSION,
} = require('../../config/cartel');

// ── Helpers ──

function calcPower(npcs) {
  let total = 0;
  for (const npc of npcs) {
    const s = npc.stats || {};
    let power = 0;
    for (const [stat, weight] of Object.entries(COMBAT_WEIGHTS)) {
      power += (s[stat] || 0) * weight;
    }
    // Level bonus: +5% per level above 1
    power *= 1 + (npc.level - 1) * 0.05;
    total += power;
  }
  return Math.floor(total);
}

function pickCasualties(npcs, chancePerNpc) {
  const results = [];
  for (const npc of npcs) {
    if (Math.random() < chancePerNpc) {
      results.push(npc);
    }
  }
  return results;
}

// ── Start delivery mission ──

async function startDelivery(userId, fromTerritory, toTerritory, drugId, quantity, npcIds) {
  const cartel = await resolveCartel(userId);
  if (cartel.bustedUntil && new Date(cartel.bustedUntil) > new Date()) {
    throw Object.assign(new Error('Operations frozen'), { status: 400 });
  }

  if (!TERRITORIES[fromTerritory]) throw Object.assign(new Error('Invalid origin'), { status: 400 });
  if (!TERRITORIES[toTerritory]) throw Object.assign(new Error('Invalid destination'), { status: 400 });
  if (fromTerritory === toTerritory) throw Object.assign(new Error('Same territory'), { status: 400 });

  const drug = DRUGS[drugId];
  if (!drug) throw Object.assign(new Error('Unknown drug'), { status: 400 });
  quantity = Math.floor(Number(quantity) || 0);
  if (quantity <= 0) throw Object.assign(new Error('Invalid quantity'), { status: 400 });

  // Check inventory
  const inv = cartel.inventory.find(i => i.drugId === drugId);
  if (!inv || inv.quantity < quantity) throw Object.assign(new Error('Not enough product'), { status: 400 });

  // Validate NPCs (must be mules, idle, belong to cartel)
  const npcs = await CartelNPC.find({ _id: { $in: npcIds }, cartelId: cartel._id, role: 'mule', status: 'idle' });
  if (npcs.length < MISSION_TYPES.delivery.minNPCs) {
    throw Object.assign(new Error(`Need at least ${MISSION_TYPES.delivery.minNPCs} idle mule(s)`), { status: 400 });
  }

  // Calculate duration: base * distance factor / avg mule speed
  const avgSpeed = npcs.reduce((s, n) => s + (n.stats?.speed || 10), 0) / npcs.length;
  const speedFactor = Math.max(0.3, 1 - avgSpeed / 200); // faster mules = shorter time
  const duration = Math.floor(MISSION_TYPES.delivery.baseDuration * speedFactor);
  const completesAt = new Date(Date.now() + duration * 1000);

  // Remove from inventory
  inv.quantity -= quantity;
  if (inv.quantity <= 0) cartel.inventory = cartel.inventory.filter(i => i.drugId !== drugId);
  cartel.markModified('inventory');
  await cartel.save();

  // Create mission
  const mission = await CartelMission.create({
    cartelId: cartel._id,
    ownerId: userId,
    type: 'delivery',
    npcIds: npcs.map(n => n._id),
    fromTerritory,
    toTerritory,
    payload: [{ drugId, quantity }],
    startedAt: new Date(),
    completesAt,
  });

  // Mark NPCs as on mission
  for (const npc of npcs) {
    npc.status = 'on_mission';
    npc.missionId = mission._id;
    await npc.save();
  }

  return { mission, duration };
}

// ── Start attack mission ──

async function startAttack(userId, targetTerritoryId, npcIds) {
  const cartel = await resolveCartel(userId);
  if (cartel.bustedUntil && new Date(cartel.bustedUntil) > new Date()) {
    throw Object.assign(new Error('Operations frozen'), { status: 400 });
  }

  if (!TERRITORIES[targetTerritoryId]) throw Object.assign(new Error('Invalid territory'), { status: 400 });

  const terr = await Territory.findOne({ territoryId: targetTerritoryId });
  const isOwnTerritory = terr?.controlledBy?.toString() === cartel._id.toString();

  // Rival attack requires a controller
  if (!isOwnTerritory && (!terr || !terr.controlledBy)) {
    throw Object.assign(new Error('Territory has no controller to attack (claim it or seize it)'), { status: 400 });
  }

  // Validate NPCs (hitmen, idle)
  const npcs = await CartelNPC.find({ _id: { $in: npcIds }, cartelId: cartel._id, role: 'hitman', status: 'idle' });
  if (npcs.length < MISSION_TYPES.attack.minNPCs) {
    throw Object.assign(new Error(`Need at least ${MISSION_TYPES.attack.minNPCs} idle hitman`), { status: 400 });
  }

  const duration = isOwnTerritory
    ? Math.floor(MISSION_TYPES.attack.baseDuration * 0.5)   // sweep is faster
    : MISSION_TYPES.attack.baseDuration;
  const completesAt = new Date(Date.now() + duration * 1000);

  const mission = await CartelMission.create({
    cartelId: cartel._id,
    ownerId: userId,
    type: 'attack',
    npcIds: npcs.map(n => n._id),
    toTerritory: targetTerritoryId,
    targetCartel: isOwnTerritory ? null : terr.controlledBy,   // null = own-territory sweep
    startedAt: new Date(),
    completesAt,
  });

  for (const npc of npcs) {
    npc.status = 'on_mission';
    npc.missionId = mission._id;
    await npc.save();
  }

  return { mission, duration };
}

// ── Start seize mission (take over territory) ──

async function startSeize(userId, targetTerritoryId, npcIds) {
  const cartel = await resolveCartel(userId);
  if (cartel.bustedUntil && new Date(cartel.bustedUntil) > new Date()) {
    throw Object.assign(new Error('Operations frozen'), { status: 400 });
  }

  if (!TERRITORIES[targetTerritoryId]) throw Object.assign(new Error('Invalid territory'), { status: 400 });

  const terr = await Territory.findOne({ territoryId: targetTerritoryId });
  if (terr?.controlledBy?.toString() === cartel._id.toString()) {
    throw Object.assign(new Error('You already control this territory'), { status: 400 });
  }

  const npcs = await CartelNPC.find({ _id: { $in: npcIds }, cartelId: cartel._id, role: 'hitman', status: 'idle' });
  if (npcs.length < MISSION_TYPES.seize.minNPCs) {
    throw Object.assign(new Error(`Need at least ${MISSION_TYPES.seize.minNPCs} idle hitmen to seize`), { status: 400 });
  }

  const duration = MISSION_TYPES.seize.baseDuration;
  const completesAt = new Date(Date.now() + duration * 1000);

  const mission = await CartelMission.create({
    cartelId: cartel._id,
    ownerId: userId,
    type: 'seize',
    npcIds: npcs.map(n => n._id),
    toTerritory: targetTerritoryId,
    targetCartel: terr?.controlledBy || null,
    startedAt: new Date(),
    completesAt,
  });

  for (const npc of npcs) {
    npc.status = 'on_mission';
    npc.missionId = mission._id;
    await npc.save();
  }

  return { mission, duration };
}

// ── Get active missions ──

async function getActiveMissions(userId) {
  const cartel = await resolveCartel(userId);
  const missions = await CartelMission.find({ cartelId: cartel._id, status: 'active' })
    .populate('npcIds', 'name role level')
    .sort({ completesAt: 1 });

  return missions.map(m => ({
    _id: m._id,
    type: m.type,
    typeName: MISSION_TYPES[m.type]?.name || m.type,
    emoji: MISSION_TYPES[m.type]?.emoji || '❓',
    npcs: m.npcIds.map(n => ({ _id: n._id, name: n.name, role: n.role, level: n.level })),
    fromTerritory: m.fromTerritory,
    toTerritory: m.toTerritory,
    payload: m.payload,
    startedAt: m.startedAt,
    completesAt: m.completesAt,
    timeRemaining: Math.max(0, Math.ceil((new Date(m.completesAt).getTime() - Date.now()) / 1000)),
    ready: new Date(m.completesAt) <= new Date(),
  }));
}

// ── Get completed missions (history) ──

async function getMissionHistory(userId, limit = 20) {
  const cartel = await resolveCartel(userId);
  const missions = await CartelMission.find({ cartelId: cartel._id, status: { $ne: 'active' } })
    .populate('npcIds', 'name role level')
    .sort({ completedAt: -1 })
    .limit(limit)
    .lean();

  return missions.map(m => ({
    _id: m._id,
    type: m.type,
    typeName: MISSION_TYPES[m.type]?.name || m.type,
    emoji: MISSION_TYPES[m.type]?.emoji || '❓',
    outcome: m.outcome?.success ? 'success' : 'failed',
    npcs: (m.npcIds || []).map(n => (typeof n === 'object' ? { name: n.name, role: n.role } : n)),
    fromTerritory: m.fromTerritory,
    toTerritory: m.toTerritory,
    completedAt: m.completedAt,
    summary: (m.outcome?.log || []).join(' '),
    moneyGained: m.outcome?.moneyGained || 0,
    repGained: m.outcome?.repGained || 0,
  }));
}

// ── Process completed missions (called by cron) ──

async function processCompletedMissions() {
  const ready = await CartelMission.find({ status: 'active', completesAt: { $lte: new Date() } });
  let completed = 0;

  for (const mission of ready) {
    try {
      if (mission.type === 'delivery') await resolveDelivery(mission);
      else if (mission.type === 'attack') await resolveAttack(mission);
      else if (mission.type === 'seize') await resolveSeize(mission);
      else if (mission.type === 'assassination') await resolveAssassination(mission);
      else if (mission.type === 'corruption') await resolveCorruption(mission);
      else if (mission.type === 'sabotage') await resolveSabotage(mission);
      else if (mission.type === 'smuggling') await resolveSmuggling(mission);
      else if (mission.type === 'intimidation') await resolveIntimidation(mission);
      completed++;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(`[cartel] mission resolve error: ${err.message}`);
      mission.status = 'failed';
      mission.completedAt = new Date();
      mission.outcome.log = [`Error: ${err.message}`];
      await mission.save();
    }
  }

  return { completed };
}

// ── Resolve delivery ──

async function resolveDelivery(mission) {
  const cartel = await Cartel.findById(mission.cartelId);
  const npcs = await CartelNPC.find({ _id: { $in: mission.npcIds } });
  const log = [];

  // Success chance based on stealth vs territory law level
  const avgStealth = npcs.reduce((s, n) => s + (n.stats?.stealth || 10), 0) / npcs.length;
  const terrCfg = TERRITORIES[mission.toTerritory] || {};
  const interceptChance = Math.max(0, (terrCfg.lawLevel || 0.5) - avgStealth / 100);
  const intercepted = Math.random() < interceptChance;

  if (intercepted) {
    // Failed delivery — product lost
    mission.status = 'failed';
    mission.outcome.success = false;
    for (const p of mission.payload) {
      mission.outcome.productLost += p.quantity;
      log.push(`The feds ripped open the trunk. ${p.quantity} keys of ${p.drugId} — gone. Torched on the side of the highway.`);
    }

    // Some mules may get arrested
    for (const npc of npcs) {
      if (Math.random() < 0.4) {
        npc.status = 'arrested';
        npc.arrestedAt = new Date();
        mission.outcome.casualties.push({ npcId: npc._id, result: 'arrested' });
        log.push(`${npc.name} got dragged out of the car face-first into the asphalt. Cuffed and gone.`);
      } else {
        npc.status = 'idle';
      }
      npc.missionId = null;
      await npc.save();
    }
  } else {
    // Successful delivery — add product to cartel inventory at destination
    mission.status = 'completed';
    mission.outcome.success = true;
    for (const p of mission.payload) {
      const inv = cartel.inventory.find(i => i.drugId === p.drugId);
      if (inv) inv.quantity += p.quantity;
      else cartel.inventory.push({ drugId: p.drugId, quantity: p.quantity, quality: 50 });
      mission.outcome.productGained += p.quantity;
      log.push(`${p.quantity} units of ${p.drugId} dropped clean in ${terrCfg.name || mission.toTerritory}. No eyes, no problems.`);
    }

    cartel.markModified('inventory');
    cartel.heat = Math.max(0, cartel.heat + HEAT_PER_DELIVERY);
    cartel.reputation += 30;

    // NPCs complete
    for (const npc of npcs) {
      npc.status = 'idle';
      npc.missionId = null;
      await grantXP(npc, 25);
      await adjustLoyalty(npc, NPC_LOYALTY_GAIN_MISSION);
    }
  }

  mission.outcome.heatGained = intercepted ? 0 : HEAT_PER_DELIVERY;
  mission.outcome.repGained = intercepted ? 0 : 10;
  mission.outcome.log = log;
  mission.completedAt = new Date();
  await mission.save();
  await cartel.save();
}

// ── Resolve attack ──

async function resolveAttack(mission) {
  const cartel = await Cartel.findById(mission.cartelId);
  const attackNPCs = await CartelNPC.find({ _id: { $in: mission.npcIds } });
  const log = [];

  // ── Own-territory variant: "Sweep Territory" ──
  if (!mission.targetCartel) {
    const attackPower = calcPower(attackNPCs);
    const terrCfg = TERRITORIES[mission.toTerritory] || {};
    const lawResistance = Math.floor((terrCfg.lawLevel || 0.5) * 100);

    mission.outcome.attackPower = attackPower;
    mission.outcome.defensePower = lawResistance;

    const success = attackPower > lawResistance;
    log.push(`🧹 Your crew swept through the streets. Firepower: ${attackPower} vs Law resistance: ${lawResistance}`);

    if (success) {
      mission.status = 'completed';
      mission.outcome.success = true;

      // Earn cash from clearing out petty criminals / collecting stashes
      const cashFound = Math.floor(500 + Math.random() * attackPower * 10);
      cartel.treasury += cashFound;
      mission.outcome.moneyGained = cashFound;
      log.push(`Cleared out the rats. Found $${cashFound.toLocaleString()} in stash houses and dead men's pockets.`);

      // Boost territory control power
      const terr = await Territory.findOne({ territoryId: mission.toTerritory });
      if (terr) {
        terr.controlPower = (terr.controlPower || 0) + Math.floor(attackPower / 20);
        await terr.save();
        log.push(`Tightened the grip on your turf (+${Math.floor(attackPower / 20)} control). The streets know who\'s in charge.`);
      }

      for (const npc of attackNPCs) {
        if (Math.random() < 0.08) {  // low injury chance on own turf
          npc.status = 'injured';
          npc.recoversAt = new Date(Date.now() + INJURY_RECOVERY_HOURS * 3600000);
          mission.outcome.casualties.push({ npcId: npc._id, result: 'injured' });
          log.push(`${npc.name} caught a stray round during the sweep. Bleeding but alive.`);
        } else {
          npc.status = 'idle';
          await grantXP(npc, 30);
          await adjustLoyalty(npc, NPC_LOYALTY_GAIN_MISSION);
        }
        npc.missionId = null;
        await npc.save();
      }

      cartel.heat = Math.max(0, cartel.heat + Math.floor(HEAT_PER_ATTACK / 3)); // low heat
      cartel.reputation += 45;
    } else {
      mission.status = 'failed';
      mission.outcome.success = false;
      log.push('Bad intel. The cops were waiting — riot shields, flash bangs, the whole circus.');

      for (const npc of attackNPCs) {
        if (Math.random() < 0.2) {
          npc.status = 'arrested';
          npc.arrestedAt = new Date();
          mission.outcome.casualties.push({ npcId: npc._id, result: 'arrested' });
          log.push(`${npc.name} went down hard. Cuffed and stuffed in the back of a cruiser.`);
        } else {
          npc.status = 'idle';
        }
        npc.missionId = null;
        await npc.save();
      }

      cartel.heat = Math.min(100, cartel.heat + 5);
    }

    mission.outcome.heatGained = success ? Math.floor(HEAT_PER_ATTACK / 3) : 5;
    mission.outcome.repGained = success ? 15 : 0;
    mission.outcome.log = log;
    mission.completedAt = new Date();
    await mission.save();
    await cartel.save();
    return;
  }

  // ── Standard rival attack ──
  const attackPower = calcPower(attackNPCs);

  // Defender: bodyguards assigned to the territory
  const defenderNPCs = await CartelNPC.find({
    cartelId: mission.targetCartel,
    role: 'bodyguard',
    assignedTo: mission.toTerritory,
    status: 'idle',
  });
  const defensePower = Math.floor(calcPower(defenderNPCs) * DEFENDER_BONUS);

  mission.outcome.attackPower = attackPower;
  mission.outcome.defensePower = defensePower;

  const success = attackPower > defensePower;
  log.push(`Your hitmen rolled up heavy. Attack power: ${attackPower} vs Defense: ${defensePower}`);

  if (success) {
    mission.status = 'completed';
    mission.outcome.success = true;

    // Steal money from defender
    const defCartel = await Cartel.findById(mission.targetCartel);
    if (defCartel) {
      const stolen = Math.floor(defCartel.treasury * 0.15); // steal 15%
      if (stolen > 0) {
        defCartel.treasury -= stolen;
        cartel.treasury += stolen;
        mission.outcome.moneyGained = stolen;
        log.push(`Cracked their safe. $${stolen.toLocaleString()} ripped straight from ${defCartel.name}\'s treasury. They won\'t forget this.`);
        await defCartel.save();
      }
    }

    // Attacker casualties (small)
    for (const npc of attackNPCs) {
      if (Math.random() < INJURY_CHANCE_WIN) {
        npc.status = 'injured';
        npc.recoversAt = new Date(Date.now() + INJURY_RECOVERY_HOURS * 3600000);
        mission.outcome.casualties.push({ npcId: npc._id, result: 'injured' });
        log.push(`${npc.name} took a hit but walked away. Tough bastard.`);
      } else {
        npc.status = 'idle';
        await grantXP(npc, 40);
        await adjustLoyalty(npc, NPC_LOYALTY_GAIN_MISSION);
      }
      npc.missionId = null;
      await npc.save();
    }

    // Defender casualties
    for (const npc of defenderNPCs) {
      if (Math.random() < CASUALTY_CHANCE_LOSS) {
        npc.status = 'dead';
        log.push(`Enemy bodyguard ${npc.name} bled out on the concrete. One less problem.`);
      } else if (Math.random() < 0.4) {
        npc.status = 'injured';
        npc.recoversAt = new Date(Date.now() + INJURY_RECOVERY_HOURS * 3600000);
        log.push(`Enemy ${npc.name} is breathing, barely. Won\'t be standing for a while.`);
      }
      await npc.save();
    }

    cartel.heat = Math.max(0, cartel.heat + HEAT_PER_ATTACK);
    cartel.reputation += 75;
  } else {
    mission.status = 'failed';
    mission.outcome.success = false;
    log.push('The raid went sideways. Their shooters held the line — your crew got chewed up.');

    for (const npc of attackNPCs) {
      if (Math.random() < CASUALTY_CHANCE_LOSS) {
        npc.status = 'dead';
        mission.outcome.casualties.push({ npcId: npc._id, result: 'dead' });
        log.push(`${npc.name} didn\'t make it back. Found face-down in a drainage ditch.`);
      } else if (Math.random() < 0.3) {
        npc.status = 'injured';
        npc.recoversAt = new Date(Date.now() + INJURY_RECOVERY_HOURS * 3600000);
        mission.outcome.casualties.push({ npcId: npc._id, result: 'injured' });
        log.push(`${npc.name} crawled back riddled with holes. Alive, but barely.`);
      } else {
        npc.status = 'idle';
      }
      npc.missionId = null;
      await npc.save();
    }
  }

  mission.outcome.heatGained = success ? HEAT_PER_ATTACK : 0;
  mission.outcome.repGained = success ? 25 : 0;
  mission.outcome.log = log;
  mission.completedAt = new Date();
  await mission.save();
  await cartel.save();
}

// ── Resolve territory seizure ──

async function resolveSeize(mission) {
  const cartel = await Cartel.findById(mission.cartelId);
  const attackNPCs = await CartelNPC.find({ _id: { $in: mission.npcIds } });
  const log = [];

  const attackPower = calcPower(attackNPCs);
  let defensePower = 0;
  let defenderNPCs = [];

  if (mission.targetCartel) {
    defenderNPCs = await CartelNPC.find({
      cartelId: mission.targetCartel,
      role: 'bodyguard',
      assignedTo: mission.toTerritory,
      status: 'idle',
    });
    defensePower = Math.floor(calcPower(defenderNPCs) * DEFENDER_BONUS);
  }

  // Add territory control power to defense
  const terr = await Territory.findOne({ territoryId: mission.toTerritory });
  defensePower += (terr?.controlPower || 0) * 5; // control power translates to defensive value

  mission.outcome.attackPower = attackPower;
  mission.outcome.defensePower = defensePower;

  const success = attackPower > defensePower;
  log.push(`All-out war. Your army: ${attackPower} vs Territory garrison: ${defensePower}`);

  if (success) {
    mission.status = 'completed';
    mission.outcome.success = true;

    // Transfer territory control
    if (terr) {
      terr.controlledBy = cartel._id;
      terr.controlPower = Math.floor(attackPower / 10); // survivors become garrison
      terr.contestedBy = null;
      terr.contestMission = null;
      await terr.save();
      log.push(`${TERRITORIES[mission.toTerritory]?.name || mission.toTerritory} is yours. The old regime is dead. Plant your flag in the ashes.`);
    }

    // Handle casualties
    for (const npc of attackNPCs) {
      if (Math.random() < CASUALTY_CHANCE_WIN) {
        npc.status = 'dead';
        mission.outcome.casualties.push({ npcId: npc._id, result: 'dead' });
        log.push(`${npc.name} died taking the compound. Went out guns blazing.`);
      } else if (Math.random() < INJURY_CHANCE_WIN) {
        npc.status = 'injured';
        npc.recoversAt = new Date(Date.now() + INJURY_RECOVERY_HOURS * 3600000);
        mission.outcome.casualties.push({ npcId: npc._id, result: 'injured' });
      } else {
        npc.status = 'idle';
        await grantXP(npc, 60);
        await adjustLoyalty(npc, NPC_LOYALTY_GAIN_MISSION * 2);
      }
      npc.missionId = null;
      await npc.save();
    }

    for (const npc of defenderNPCs) {
      if (Math.random() < CASUALTY_CHANCE_LOSS) {
        npc.status = 'dead';
        log.push(`Enemy defender ${npc.name} got put in the ground. The territory changes hands in blood.`);
      }
      await npc.save();
    }

    cartel.heat = Math.max(0, cartel.heat + HEAT_PER_SEIZE);
    cartel.reputation += 150;
  } else {
    mission.status = 'failed';
    mission.outcome.success = false;
    log.push('The assault crumbled. Their fortifications were too strong — your crew got torn apart trying to breach.');

    for (const npc of attackNPCs) {
      if (Math.random() < CASUALTY_CHANCE_LOSS) {
        npc.status = 'dead';
        mission.outcome.casualties.push({ npcId: npc._id, result: 'dead' });
        log.push(`${npc.name} was cut down in the crossfire. Left behind like garbage.`);
      } else {
        npc.status = Math.random() < 0.4 ? 'injured' : 'idle';
        if (npc.status === 'injured') {
          npc.recoversAt = new Date(Date.now() + INJURY_RECOVERY_HOURS * 3600000);
          mission.outcome.casualties.push({ npcId: npc._id, result: 'injured' });
        }
      }
      npc.missionId = null;
      await npc.save();
    }
  }

  mission.outcome.heatGained = success ? HEAT_PER_SEIZE : 5;
  mission.outcome.repGained = success ? 50 : 0;
  mission.outcome.log = log;
  mission.completedAt = new Date();
  await mission.save();
  await cartel.save();
}

// ═══════════════════════════════════════════════════════════════
//  NEW MISSION TYPES — Assassination, Corruption, Sabotage,
//                      Smuggling, Intimidation
// ═══════════════════════════════════════════════════════════════

// ── Helper: frozen check ──

function assertNotFrozen(cartel) {
  if (cartel.bustedUntil && new Date(cartel.bustedUntil) > new Date()) {
    throw Object.assign(new Error('Operations frozen'), { status: 400 });
  }
}

// ── Start assassination ──

async function startAssassination(userId, targetTerritoryId, npcIds) {
  const cartel = await resolveCartel(userId);
  assertNotFrozen(cartel);

  if (!TERRITORIES[targetTerritoryId]) throw Object.assign(new Error('Invalid territory'), { status: 400 });

  const terr = await Territory.findOne({ territoryId: targetTerritoryId });
  const isOwnTerritory = terr?.controlledBy?.toString() === cartel._id.toString();

  const npcs = await CartelNPC.find({ _id: { $in: npcIds }, cartelId: cartel._id, role: 'hitman', status: 'idle' });
  if (npcs.length < MISSION_TYPES.assassination.minNPCs) {
    throw Object.assign(new Error(`Need at least ${MISSION_TYPES.assassination.minNPCs} idle hitman`), { status: 400 });
  }

  let targetNpc = null;

  if (isOwnTerritory) {
    // Own territory: "Silence a Rat" — no specific target NPC, you're cleaning house
  } else {
    // Rival territory: pick a high-value enemy NPC
    if (!terr || !terr.controlledBy) throw Object.assign(new Error('Territory has no controller to target'), { status: 400 });
    const targetNpcs = await CartelNPC.find({ cartelId: terr.controlledBy, status: 'idle' }).sort({ level: -1 }).limit(5);
    if (!targetNpcs.length) throw Object.assign(new Error('No target NPCs found in that territory'), { status: 400 });
    targetNpc = targetNpcs[Math.floor(Math.random() * targetNpcs.length)];
  }

  const duration = isOwnTerritory
    ? Math.floor(MISSION_TYPES.assassination.baseDuration * 0.6)  // faster cleanup op
    : MISSION_TYPES.assassination.baseDuration;
  const completesAt = new Date(Date.now() + duration * 1000);

  const mission = await CartelMission.create({
    cartelId: cartel._id,
    ownerId: userId,
    type: 'assassination',
    npcIds: npcs.map(n => n._id),
    toTerritory: targetTerritoryId,
    targetCartel: isOwnTerritory ? null : terr.controlledBy,   // null = own-territory variant
    targetNpc: targetNpc?._id || null,
    startedAt: new Date(),
    completesAt,
  });

  for (const npc of npcs) {
    npc.status = 'on_mission';
    npc.missionId = mission._id;
    await npc.save();
  }

  return { mission, duration };
}

// ── Start corruption (bribe officials) ──

async function startCorruption(userId, targetTerritoryId, npcIds, bribeAmount) {
  const cartel = await resolveCartel(userId);
  assertNotFrozen(cartel);

  if (!TERRITORIES[targetTerritoryId]) throw Object.assign(new Error('Invalid territory'), { status: 400 });

  const npcs = await CartelNPC.find({ _id: { $in: npcIds }, cartelId: cartel._id, role: 'enforcer', status: 'idle' });
  if (npcs.length < MISSION_TYPES.corruption.minNPCs) {
    throw Object.assign(new Error(`Need at least ${MISSION_TYPES.corruption.minNPCs} idle enforcer`), { status: 400 });
  }

  bribeAmount = Math.floor(Number(bribeAmount) || 0);
  if (bribeAmount < 5000) throw Object.assign(new Error('Minimum bribe is $5,000'), { status: 400 });
  if (bribeAmount > cartel.treasury) throw Object.assign(new Error('Not enough in treasury'), { status: 400 });

  // Deduct bribe up front
  cartel.treasury -= bribeAmount;
  await cartel.save();

  const duration = MISSION_TYPES.corruption.baseDuration;
  const completesAt = new Date(Date.now() + duration * 1000);

  const mission = await CartelMission.create({
    cartelId: cartel._id,
    ownerId: userId,
    type: 'corruption',
    npcIds: npcs.map(n => n._id),
    toTerritory: targetTerritoryId,
    payload: [{ drugId: 'bribe', quantity: bribeAmount }],
    startedAt: new Date(),
    completesAt,
  });

  for (const npc of npcs) {
    npc.status = 'on_mission';
    npc.missionId = mission._id;
    await npc.save();
  }

  return { mission, duration, bribeAmount };
}

// ── Start sabotage ──

async function startSabotage(userId, targetTerritoryId, npcIds) {
  const cartel = await resolveCartel(userId);
  assertNotFrozen(cartel);

  if (!TERRITORIES[targetTerritoryId]) throw Object.assign(new Error('Invalid territory'), { status: 400 });

  const terr = await Territory.findOne({ territoryId: targetTerritoryId });
  const isOwnTerritory = terr?.controlledBy?.toString() === cartel._id.toString();

  // Rival sabotage requires a controller
  if (!isOwnTerritory && (!terr || !terr.controlledBy)) {
    throw Object.assign(new Error('Territory has no controller to sabotage'), { status: 400 });
  }

  const npcs = await CartelNPC.find({ _id: { $in: npcIds }, cartelId: cartel._id, role: 'hitman', status: 'idle' });
  if (npcs.length < MISSION_TYPES.sabotage.minNPCs) {
    throw Object.assign(new Error(`Need at least ${MISSION_TYPES.sabotage.minNPCs} idle hitmen`), { status: 400 });
  }

  const duration = isOwnTerritory
    ? Math.floor(MISSION_TYPES.sabotage.baseDuration * 0.5)  // faster when it's your own turf
    : MISSION_TYPES.sabotage.baseDuration;
  const completesAt = new Date(Date.now() + duration * 1000);

  const mission = await CartelMission.create({
    cartelId: cartel._id,
    ownerId: userId,
    type: 'sabotage',
    npcIds: npcs.map(n => n._id),
    toTerritory: targetTerritoryId,
    targetCartel: isOwnTerritory ? null : terr.controlledBy,   // null = own-territory burn evidence
    startedAt: new Date(),
    completesAt,
  });

  for (const npc of npcs) {
    npc.status = 'on_mission';
    npc.missionId = mission._id;
    await npc.save();
  }

  return { mission, duration };
}

// ── Start smuggling run ──

async function startSmuggling(userId, fromTerritory, toTerritory, drugId, quantity, npcIds) {
  const cartel = await resolveCartel(userId);
  assertNotFrozen(cartel);

  if (!TERRITORIES[fromTerritory]) throw Object.assign(new Error('Invalid origin'), { status: 400 });
  if (!TERRITORIES[toTerritory]) throw Object.assign(new Error('Invalid destination'), { status: 400 });
  if (fromTerritory === toTerritory) throw Object.assign(new Error('Same territory'), { status: 400 });

  // Must be cross-region
  const fromRegion = TERRITORIES[fromTerritory].region;
  const toRegion = TERRITORIES[toTerritory].region;
  if (fromRegion === toRegion) throw Object.assign(new Error('Smuggling requires crossing regions (use delivery for same-region)'), { status: 400 });

  const drug = DRUGS[drugId];
  if (!drug) throw Object.assign(new Error('Unknown drug'), { status: 400 });
  quantity = Math.floor(Number(quantity) || 0);
  if (quantity <= 0) throw Object.assign(new Error('Invalid quantity'), { status: 400 });

  const inv = cartel.inventory.find(i => i.drugId === drugId);
  if (!inv || inv.quantity < quantity) throw Object.assign(new Error('Not enough product'), { status: 400 });

  const npcs = await CartelNPC.find({ _id: { $in: npcIds }, cartelId: cartel._id, role: 'mule', status: 'idle' });
  if (npcs.length < MISSION_TYPES.smuggling.minNPCs) {
    throw Object.assign(new Error(`Need at least ${MISSION_TYPES.smuggling.minNPCs} idle mules for smuggling`), { status: 400 });
  }

  // Deduct inventory
  inv.quantity -= quantity;
  if (inv.quantity <= 0) cartel.inventory = cartel.inventory.filter(i => i.drugId !== drugId);
  cartel.markModified('inventory');
  await cartel.save();

  // Smuggling takes longer but speed helps
  const avgSpeed = npcs.reduce((s, n) => s + (n.stats?.speed || 10), 0) / npcs.length;
  const speedFactor = Math.max(0.4, 1 - avgSpeed / 200);
  const duration = Math.floor(MISSION_TYPES.smuggling.baseDuration * speedFactor);
  const completesAt = new Date(Date.now() + duration * 1000);

  const mission = await CartelMission.create({
    cartelId: cartel._id,
    ownerId: userId,
    type: 'smuggling',
    npcIds: npcs.map(n => n._id),
    fromTerritory,
    toTerritory,
    payload: [{ drugId, quantity }],
    startedAt: new Date(),
    completesAt,
  });

  for (const npc of npcs) {
    npc.status = 'on_mission';
    npc.missionId = mission._id;
    await npc.save();
  }

  return { mission, duration };
}

// ── Start intimidation ──

async function startIntimidation(userId, targetTerritoryId, npcIds) {
  const cartel = await resolveCartel(userId);
  assertNotFrozen(cartel);

  if (!TERRITORIES[targetTerritoryId]) throw Object.assign(new Error('Invalid territory'), { status: 400 });

  const npcs = await CartelNPC.find({ _id: { $in: npcIds }, cartelId: cartel._id, role: 'enforcer', status: 'idle' });
  if (npcs.length < MISSION_TYPES.intimidation.minNPCs) {
    throw Object.assign(new Error(`Need at least ${MISSION_TYPES.intimidation.minNPCs} idle enforcer`), { status: 400 });
  }

  const duration = MISSION_TYPES.intimidation.baseDuration;
  const completesAt = new Date(Date.now() + duration * 1000);

  const mission = await CartelMission.create({
    cartelId: cartel._id,
    ownerId: userId,
    type: 'intimidation',
    npcIds: npcs.map(n => n._id),
    toTerritory: targetTerritoryId,
    startedAt: new Date(),
    completesAt,
  });

  for (const npc of npcs) {
    npc.status = 'on_mission';
    npc.missionId = mission._id;
    await npc.save();
  }

  return { mission, duration };
}

// ═══════════════════════════════════════════════════════════════
//  RESOLVE — New mission types
// ═══════════════════════════════════════════════════════════════

// ── Resolve assassination ──

async function resolveAssassination(mission) {
  const cartel = await Cartel.findById(mission.cartelId);
  const npcs = await CartelNPC.find({ _id: { $in: mission.npcIds } });
  const log = [];

  // ── Own-territory variant: "Silence a Rat" ──
  if (!mission.targetCartel) {
    const avgStealth = npcs.reduce((s, n) => s + (n.stats?.stealth || 10), 0) / npcs.length;
    const avgIntel = npcs.reduce((s, n) => s + (n.stats?.intelligence || 10), 0) / npcs.length;
    const terrCfg = TERRITORIES[mission.toTerritory] || {};
    const lawDifficulty = Math.floor((terrCfg.lawLevel || 0.5) * 80);

    const killPower = Math.floor((avgStealth * 1.5 + avgIntel) * npcs.length);
    mission.outcome.attackPower = killPower;
    mission.outcome.defensePower = lawDifficulty;

    const success = killPower > lawDifficulty;
    log.push(`🤫 Hunter team deployed. Kill power: ${killPower} vs Exposure risk: ${lawDifficulty}`);

    if (success) {
      mission.status = 'completed';
      mission.outcome.success = true;

      // Big heat reduction — informant eliminated
      const heatReduced = Math.min(cartel.heat, Math.floor(HEAT_PER_ASSASSINATION * 1.5));
      cartel.heat = Math.max(0, cartel.heat - heatReduced);
      log.push(`🤐 The snitch is sleeping with the fishes. Heat dropped by ${heatReduced}. The trail just went ice cold.`);

      for (const npc of npcs) {
        if (Math.random() < 0.1) {
          npc.status = 'injured';
          npc.recoversAt = new Date(Date.now() + INJURY_RECOVERY_HOURS * 3600000);
          mission.outcome.casualties.push({ npcId: npc._id, result: 'injured' });
          log.push(`${npc.name} caught some heat covering tracks. Minor wounds, major cleanup.`);
        } else {
          npc.status = 'idle';
          await grantXP(npc, 40);
          await adjustLoyalty(npc, NPC_LOYALTY_GAIN_MISSION);
        }
        npc.missionId = null;
        await npc.save();
      }

      cartel.reputation += 60;
    } else {
      mission.status = 'failed';
      mission.outcome.success = false;
      log.push('The rat slipped through your fingers. Worse — now they know you\'re coming for them.');

      for (const npc of npcs) {
        if (Math.random() < 0.25) {
          npc.status = 'arrested';
          npc.arrestedAt = new Date();
          mission.outcome.casualties.push({ npcId: npc._id, result: 'arrested' });
          log.push(`${npc.name} got ID\'d on a security camera. Picked up within the hour.`);
        } else {
          npc.status = 'idle';
        }
        npc.missionId = null;
        await npc.save();
      }

      cartel.heat = Math.min(100, cartel.heat + 10);
    }

    mission.outcome.heatGained = success ? -Math.floor(HEAT_PER_ASSASSINATION * 1.5) : 10;
    mission.outcome.repGained = success ? 20 : 0;
    mission.outcome.log = log;
    mission.completedAt = new Date();
    await mission.save();
    await cartel.save();
    return;
  }

  // ── Standard rival assassination ──
  const targetNpc = mission.targetNpc ? await CartelNPC.findById(mission.targetNpc) : null;

  const killPower = calcPower(npcs);

  // Target's survival based on their own combat + bodyguards nearby
  const bodyguards = await CartelNPC.find({
    cartelId: mission.targetCartel,
    role: 'bodyguard',
    assignedTo: mission.toTerritory,
    status: 'idle',
  });
  const protectionPower = Math.floor(
    ((targetNpc?.stats?.combat || 20) * 3) +
    calcPower(bodyguards) * DEFENDER_BONUS
  );

  mission.outcome.attackPower = killPower;
  mission.outcome.defensePower = protectionPower;

  const success = killPower > protectionPower;
  log.push(`Kill squad deployed. Firepower: ${killPower} vs Protection detail: ${protectionPower}`);

  if (success) {
    mission.status = 'completed';
    mission.outcome.success = true;

    // Target NPC is eliminated
    if (targetNpc) {
      targetNpc.status = 'dead';
      await targetNpc.save();
      log.push(`💀 ${targetNpc.name} (Lv${targetNpc.level} ${targetNpc.role}) — two in the chest, one in the head. Target eliminated. Send flowers.`);
    }

    // Small chance hitman is injured on success
    for (const npc of npcs) {
      if (Math.random() < 0.15) {
        npc.status = 'injured';
        npc.recoversAt = new Date(Date.now() + INJURY_RECOVERY_HOURS * 3600000);
        mission.outcome.casualties.push({ npcId: npc._id, result: 'injured' });
        log.push(`${npc.name} got winged during extraction. Nothing a back-alley doctor can\'t fix.`);
      } else {
        npc.status = 'idle';
        await grantXP(npc, 50);
        await adjustLoyalty(npc, NPC_LOYALTY_GAIN_MISSION);
      }
      npc.missionId = null;
      await npc.save();
    }

    cartel.heat = Math.max(0, cartel.heat + HEAT_PER_ASSASSINATION);
    cartel.reputation += 100;
  } else {
    mission.status = 'failed';
    mission.outcome.success = false;
    log.push('The hit went wrong. Bodyguards opened fire first — your shooters never got close.');

    for (const npc of npcs) {
      if (Math.random() < CASUALTY_CHANCE_LOSS) {
        npc.status = 'dead';
        mission.outcome.casualties.push({ npcId: npc._id, result: 'dead' });
        log.push(`${npc.name} caught a bullet trying to flee the scene. Body dumped in the river.`);
      } else if (Math.random() < 0.35) {
        npc.status = 'arrested';
        npc.arrestedAt = new Date();
        mission.outcome.casualties.push({ npcId: npc._id, result: 'arrested' });
        log.push(`${npc.name} got cornered by responding units. Murder weapon still warm in hand.`);
      } else {
        npc.status = 'idle';
      }
      npc.missionId = null;
      await npc.save();
    }

    cartel.heat = Math.max(0, cartel.heat + Math.floor(HEAT_PER_ASSASSINATION / 2));
  }

  mission.outcome.heatGained = success ? HEAT_PER_ASSASSINATION : Math.floor(HEAT_PER_ASSASSINATION / 2);
  mission.outcome.repGained = success ? 35 : 0;
  mission.outcome.log = log;
  mission.completedAt = new Date();
  await mission.save();
  await cartel.save();
}

// ── Resolve corruption ──

async function resolveCorruption(mission) {
  const cartel = await Cartel.findById(mission.cartelId);
  const npcs = await CartelNPC.find({ _id: { $in: mission.npcIds } });
  const log = [];

  const bribeAmount = mission.payload?.[0]?.quantity || 0;
  const avgIntel = npcs.reduce((s, n) => s + (n.stats?.intelligence || 10), 0) / npcs.length;
  const avgCharisma = npcs.reduce((s, n) => s + (n.stats?.charisma || 10), 0) / npcs.length;

  // Success based on intelligence + charisma + bribe size
  // Higher bribe = better odds; smarter enforcers = better odds
  const bribeFactor = Math.min(1, bribeAmount / 50000); // caps at $50k
  const skillFactor = (avgIntel + avgCharisma) / 150;    // ~0.13 to 1.0
  const successChance = Math.min(0.95, 0.3 + bribeFactor * 0.35 + skillFactor * 0.3);
  const success = Math.random() < successChance;

  log.push(`Envelope: $${bribeAmount.toLocaleString()} in unmarked bills | Odds of acceptance: ${Math.round(successChance * 100)}%`);

  if (success) {
    mission.status = 'completed';
    mission.outcome.success = true;

    // Reduce heat significantly
    const heatReduced = Math.min(cartel.heat, HEAT_CORRUPTION_REDUCE + Math.floor(bribeAmount / 5000));
    cartel.heat = Math.max(0, cartel.heat - heatReduced);
    log.push(`🏛️ The right palms got greased. Case files disappeared, warrants got "lost." Heat dropped by ${heatReduced}.`);

    // If a target cartel exists on this territory, freeze their operations briefly
    const terr = await Territory.findOne({ territoryId: mission.toTerritory });
    if (terr?.controlledBy && terr.controlledBy.toString() !== cartel._id.toString()) {
      const rival = await Cartel.findById(terr.controlledBy);
      if (rival) {
        rival.heat = Math.min(100, rival.heat + 15);
        await rival.save();
        log.push(`Tipped off the DEA about ${rival.name}. Anonymous call from a burner phone. They\'re getting raided tonight. (+15 heat)`);
      }
    }

    for (const npc of npcs) {
      npc.status = 'idle';
      npc.missionId = null;
      await grantXP(npc, 30);
      await adjustLoyalty(npc, NPC_LOYALTY_GAIN_MISSION);
      await npc.save();
    }

    mission.outcome.moneyLost = bribeAmount;
    cartel.reputation += 60;
  } else {
    mission.status = 'failed';
    mission.outcome.success = false;
    log.push('The official took the meeting but it was a setup. IA was listening the whole time. Your money\'s gone.');

    // Bribe is lost AND you gain heat
    cartel.heat = Math.min(100, cartel.heat + 10);
    mission.outcome.moneyLost = bribeAmount;

    for (const npc of npcs) {
      if (Math.random() < 0.25) {
        npc.status = 'arrested';
        npc.arrestedAt = new Date();
        mission.outcome.casualties.push({ npcId: npc._id, result: 'arrested' });
        log.push(`${npc.name} got bagged in the sting operation. Bribery charge, maybe worse.`);
      } else {
        npc.status = 'idle';
      }
      npc.missionId = null;
      await npc.save();
    }
  }

  mission.outcome.heatGained = success ? -HEAT_CORRUPTION_REDUCE : 10;
  mission.outcome.repGained = success ? 20 : 0;
  mission.outcome.log = log;
  mission.completedAt = new Date();
  await mission.save();
  await cartel.save();
}

// ── Resolve sabotage ──

async function resolveSabotage(mission) {
  const cartel = await Cartel.findById(mission.cartelId);
  const npcs = await CartelNPC.find({ _id: { $in: mission.npcIds } });
  const log = [];

  // ── Own-territory variant: "Burn Evidence" ──
  if (!mission.targetCartel) {
    // Always succeeds but costs some inventory — you're destroying your own stuff
    mission.status = 'completed';
    mission.outcome.success = true;
    mission.outcome.attackPower = 0;
    mission.outcome.defensePower = 0;

    // Sacrifice ~20% of a random inventory stack
    let productBurned = 0;
    if (cartel.inventory.length > 0) {
      const invIdx = Math.floor(Math.random() * cartel.inventory.length);
      const burned = Math.floor(cartel.inventory[invIdx].quantity * 0.2);
      if (burned > 0) {
        cartel.inventory[invIdx].quantity -= burned;
        if (cartel.inventory[invIdx].quantity <= 0) cartel.inventory.splice(invIdx, 1);
        cartel.markModified('inventory');
        productBurned = burned;
        log.push(`🔥 Torched ${burned} units of ${cartel.inventory[invIdx]?.drugId || 'product'}. Dumped the ashes in the river.`);
      } else {
        log.push('🔥 Minimal product sacrificed — but the fingerprints are gone.');
      }
    } else {
      log.push('🔥 Nothing to burn, but every trace of evidence went up in flames.');
    }

    // Massive heat reduction
    const heatReduced = Math.min(cartel.heat, HEAT_PER_SABOTAGE + 20 + Math.floor(productBurned / 2));
    cartel.heat = Math.max(0, cartel.heat - heatReduced);
    log.push(`Heat dropped by ${heatReduced}. Ghost protocol. The trail is stone cold dead.`);

    for (const npc of npcs) {
      npc.status = 'idle';
      npc.missionId = null;
      await grantXP(npc, 25);
      await adjustLoyalty(npc, NPC_LOYALTY_GAIN_MISSION);
      await npc.save();
    }

    mission.outcome.productLost = productBurned;
    mission.outcome.heatGained = -heatReduced;
    mission.outcome.repGained = 30;
    mission.outcome.log = log;
    mission.completedAt = new Date();
    cartel.reputation += 30;
    await mission.save();
    await cartel.save();
    return;
  }

  // ── Standard rival sabotage ──
  const saboPower = calcPower(npcs);

  // Defenders
  const bodyguards = await CartelNPC.find({
    cartelId: mission.targetCartel,
    role: 'bodyguard',
    assignedTo: mission.toTerritory,
    status: 'idle',
  });
  const defensePower = Math.floor(calcPower(bodyguards) * DEFENDER_BONUS);

  mission.outcome.attackPower = saboPower;
  mission.outcome.defensePower = defensePower;

  const success = saboPower > defensePower;
  log.push(`Sabotage team in position. Strike power: ${saboPower} vs Guard detail: ${defensePower}`);

  if (success) {
    mission.status = 'completed';
    mission.outcome.success = true;

    // Destroy a random lab from the target cartel
    const defCartel = await Cartel.findById(mission.targetCartel);
    if (defCartel && defCartel.labs.length > 0) {
      const labIdx = Math.floor(Math.random() * defCartel.labs.length);
      const destroyed = defCartel.labs[labIdx];
      defCartel.labs.splice(labIdx, 1);
      defCartel.markModified('labs');
      await defCartel.save();
      log.push(`💣 Rigged the ${destroyed.labId} (Lv${destroyed.level}) with C4. BOOM. Nothing left but a smoking crater in ${destroyed.territoryId}.`);
    } else {
      // No labs — destroy some inventory instead
      if (defCartel && defCartel.inventory.length > 0) {
        const invIdx = Math.floor(Math.random() * defCartel.inventory.length);
        const lost = Math.floor(defCartel.inventory[invIdx].quantity * 0.5);
        defCartel.inventory[invIdx].quantity -= lost;
        if (defCartel.inventory[invIdx].quantity <= 0) defCartel.inventory.splice(invIdx, 1);
        defCartel.markModified('inventory');
        await defCartel.save();
        log.push(`💣 No lab to hit — so we torched their stash instead. ${lost} units of product went up in flames.`);
        mission.outcome.productLost = lost;
      } else {
        log.push('Target had nothing worth destroying. Empty-handed, but at least we sent a message.');
      }
    }

    for (const npc of npcs) {
      if (Math.random() < INJURY_CHANCE_WIN) {
        npc.status = 'injured';
        npc.recoversAt = new Date(Date.now() + INJURY_RECOVERY_HOURS * 3600000);
        mission.outcome.casualties.push({ npcId: npc._id, result: 'injured' });
        log.push(`${npc.name} got burned by the blast. Singed but walking.`);
      } else {
        npc.status = 'idle';
        await grantXP(npc, 45);
        await adjustLoyalty(npc, NPC_LOYALTY_GAIN_MISSION);
      }
      npc.missionId = null;
      await npc.save();
    }

    cartel.heat = Math.max(0, cartel.heat + HEAT_PER_SABOTAGE);
    cartel.reputation += 90;
  } else {
    mission.status = 'failed';
    mission.outcome.success = false;
    log.push('They spotted your team before the charges were set. Guards opened fire — your crew scattered into the dark.');

    for (const npc of npcs) {
      if (Math.random() < CASUALTY_CHANCE_LOSS) {
        npc.status = 'dead';
        mission.outcome.casualties.push({ npcId: npc._id, result: 'dead' });
        log.push(`${npc.name} took a round to the back trying to run. Didn\'t make it.`);
      } else if (Math.random() < 0.3) {
        npc.status = 'injured';
        npc.recoversAt = new Date(Date.now() + INJURY_RECOVERY_HOURS * 3600000);
        mission.outcome.casualties.push({ npcId: npc._id, result: 'injured' });
        log.push(`${npc.name} barely escaped. Shrapnel wounds and a bruised ego.`);
      } else {
        npc.status = 'idle';
      }
      npc.missionId = null;
      await npc.save();
    }
  }

  mission.outcome.heatGained = success ? HEAT_PER_SABOTAGE : 5;
  mission.outcome.repGained = success ? 30 : 0;
  mission.outcome.log = log;
  mission.completedAt = new Date();
  await mission.save();
  await cartel.save();
}

// ── Resolve smuggling ──

async function resolveSmuggling(mission) {
  const cartel = await Cartel.findById(mission.cartelId);
  const npcs = await CartelNPC.find({ _id: { $in: mission.npcIds } });
  const log = [];

  // Higher risk than delivery but the payoff is in-game cash on top of product
  const avgStealth = npcs.reduce((s, n) => s + (n.stats?.stealth || 10), 0) / npcs.length;
  const avgSpeed = npcs.reduce((s, n) => s + (n.stats?.speed || 10), 0) / npcs.length;
  const fromCfg = TERRITORIES[mission.fromTerritory] || {};
  const toCfg = TERRITORIES[mission.toTerritory] || {};

  // Interception: both territories' law levels compound
  const combinedLaw = ((fromCfg.lawLevel || 0.3) + (toCfg.lawLevel || 0.3)) / 2;
  const stealthMod = avgStealth / 120;   // slightly harder to dodge than delivery
  const interceptChance = Math.max(0.05, combinedLaw - stealthMod);
  const intercepted = Math.random() < interceptChance;

  log.push(`Smuggling corridor: ${fromCfg.name || mission.fromTerritory} → ${toCfg.name || mission.toTerritory}`);
  log.push(`Border heat: ${Math.round(interceptChance * 100)}% — ${interceptChance > 0.4 ? 'your mules are sweating' : 'looking clean'}`);

  if (intercepted) {
    mission.status = 'failed';
    mission.outcome.success = false;
    for (const p of mission.payload) {
      mission.outcome.productLost += p.quantity;
      log.push(`Customs ripped the shipment apart. ${p.quantity} units of ${p.drugId} confiscated. It's all over the news.`);
    }

    for (const npc of npcs) {
      if (Math.random() < 0.50) {
        npc.status = 'arrested';
        npc.arrestedAt = new Date();
        mission.outcome.casualties.push({ npcId: npc._id, result: 'arrested' });
        log.push(`${npc.name} got pulled from a shipping container at the border. Federal charges incoming.`);
      } else {
        npc.status = 'idle';
      }
      npc.missionId = null;
      await npc.save();
    }

    cartel.heat = Math.max(0, cartel.heat + Math.floor(HEAT_PER_SMUGGLING / 2));
  } else {
    mission.status = 'completed';
    mission.outcome.success = true;

    // Product delivered + bonus cash (cross-region premium)
    for (const p of mission.payload) {
      const inv = cartel.inventory.find(i => i.drugId === p.drugId);
      if (inv) inv.quantity += p.quantity;
      else cartel.inventory.push({ drugId: p.drugId, quantity: p.quantity, quality: 50 });
      mission.outcome.productGained += p.quantity;
      log.push(`${p.quantity} units of ${p.drugId} crossed the border clean. Stashed safe in ${toCfg.name || mission.toTerritory}.`);

      // Cross-region cash bonus: 2x base street price per unit
      const drug = DRUGS[p.drugId];
      if (drug) {
        const bonus = Math.floor(drug.basePrice * p.quantity * 0.5);
        cartel.treasury += bonus;
        mission.outcome.moneyGained += bonus;
        log.push(`💰 Cross-border premium: +$${bonus.toLocaleString()}. International supply chains pay double.`);
      }
    }

    cartel.markModified('inventory');
    cartel.heat = Math.max(0, cartel.heat + HEAT_PER_SMUGGLING);
    cartel.reputation += 60;

    for (const npc of npcs) {
      npc.status = 'idle';
      npc.missionId = null;
      await grantXP(npc, 35);
      await adjustLoyalty(npc, NPC_LOYALTY_GAIN_MISSION);
      await npc.save();
    }
  }

  mission.outcome.heatGained = intercepted ? Math.floor(HEAT_PER_SMUGGLING / 2) : HEAT_PER_SMUGGLING;
  mission.outcome.repGained = intercepted ? 0 : 20;
  mission.outcome.log = log;
  mission.completedAt = new Date();
  await mission.save();
  await cartel.save();
}

// ── Resolve intimidation ──

async function resolveIntimidation(mission) {
  const cartel = await Cartel.findById(mission.cartelId);
  const npcs = await CartelNPC.find({ _id: { $in: mission.npcIds } });
  const log = [];

  const terrCfg = TERRITORIES[mission.toTerritory] || {};
  const avgCombat = npcs.reduce((s, n) => s + (n.stats?.combat || 10), 0) / npcs.length;
  const avgCharisma = npcs.reduce((s, n) => s + (n.stats?.charisma || 10), 0) / npcs.length;

  // Intimidation power determines payout
  const intimidationPower = avgCombat * 0.6 + avgCharisma * 0.4;
  const demand = terrCfg.demand || 1.0;

  // Base payout: $5k–$50k based on enforcer power × demand
  const basePayout = Math.floor(5000 + intimidationPower * 300 * demand);

  // Success chance — higher lawLevel = harder to extort
  const successChance = Math.min(0.90, 0.5 + (intimidationPower / 100) * 0.3 - (terrCfg.lawLevel || 0.5) * 0.2);
  const success = Math.random() < successChance;

  log.push(`Enforcer muscle: ${Math.round(intimidationPower)} | Shake-down odds: ${Math.round(successChance * 100)}%`);

  if (success) {
    mission.status = 'completed';
    mission.outcome.success = true;

    cartel.treasury += basePayout;
    mission.outcome.moneyGained = basePayout;
    log.push(`👊 Doors got kicked in. Registers got emptied. $${basePayout.toLocaleString()} squeezed out of ${terrCfg.name || mission.toTerritory}. They\'ll pay again next week.`);

    cartel.heat = Math.max(0, cartel.heat + HEAT_PER_INTIMIDATION);
    cartel.reputation += 45;

    for (const npc of npcs) {
      npc.status = 'idle';
      npc.missionId = null;
      await grantXP(npc, 20);
      await adjustLoyalty(npc, NPC_LOYALTY_GAIN_MISSION);
      await npc.save();
    }
  } else {
    mission.status = 'failed';
    mission.outcome.success = false;
    log.push('The locals grew a spine. Someone called the cops — or worse, they were already there. Your enforcers had to bail.');

    for (const npc of npcs) {
      if (Math.random() < 0.20) {
        npc.status = 'injured';
        npc.recoversAt = new Date(Date.now() + INJURY_RECOVERY_HOURS * 3600000);
        mission.outcome.casualties.push({ npcId: npc._id, result: 'injured' });
        log.push(`${npc.name} got ambushed by a shopkeeper with a baseball bat. Pride and ribs — both broken.`);
      } else if (Math.random() < 0.15) {
        npc.status = 'arrested';
        npc.arrestedAt = new Date();
        mission.outcome.casualties.push({ npcId: npc._id, result: 'arrested' });
        log.push(`${npc.name} got collared for extortion. Some witness with a hero complex.`);
      } else {
        npc.status = 'idle';
      }
      npc.missionId = null;
      await npc.save();
    }

    cartel.heat = Math.max(0, cartel.heat + Math.floor(HEAT_PER_INTIMIDATION / 2));
  }

  mission.outcome.heatGained = success ? HEAT_PER_INTIMIDATION : Math.floor(HEAT_PER_INTIMIDATION / 2);
  mission.outcome.repGained = success ? 15 : 0;
  mission.outcome.log = log;
  mission.completedAt = new Date();
  await mission.save();
  await cartel.save();
}

module.exports = {
  calcPower,
  startDelivery,
  startAttack,
  startSeize,
  startAssassination,
  startCorruption,
  startSabotage,
  startSmuggling,
  startIntimidation,
  getActiveMissions,
  getMissionHistory,
  processCompletedMissions,
};
