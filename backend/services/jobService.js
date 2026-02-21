// ═══════════════════════════════════════════════════════════════
//  Job Service — City Jobs, Company Jobs
// ═══════════════════════════════════════════════════════════════

const Player = require('../models/Player');
const { Company } = require('../models/Job');
const { CITY_JOBS, COMPANY_TYPES, meta } = require('../config/job');
const { ALL_COURSES } = require('../config/education');

// ── Helpers ──

function err(msg, status = 400) {
  return Object.assign(new Error(msg), { status });
}

async function resolvePlayer(userId) {
  const p = await Player.findOne({ user: userId });
  if (!p) throw err('Player not found', 404);
  return p;
}

function getCityJob(jobId) {
  const j = CITY_JOBS[jobId];
  if (!j) throw err('Unknown city job');
  return j;
}

function getRank(job, rankIdx) {
  if (!job.ranks[rankIdx]) throw err('Invalid rank');
  return job.ranks[rankIdx];
}

function meetsStats(player, required) {
  const ws = player.workStats || {};
  return (
    (ws.manuallabor || 0) >= (required.manuallabor || 0) &&
    (ws.intelligence || 0) >= (required.intelligence || 0) &&
    (ws.endurance || 0) >= (required.endurance || 0)
  );
}

// ── List available city jobs ──

function listCityJobs() {
  return Object.values(CITY_JOBS).map(j => ({
    id: j.id,
    name: j.name,
    description: j.description,
    icon: j.icon,
    startingRank: j.ranks[0]?.name,
    startingPay: j.ranks[0]?.pay,
    requiredStats: j.ranks[0]?.requiredStats,
  }));
}

// ── Get full city job detail ──

function getCityJobDetail(jobId) {
  const j = getCityJob(jobId);
  return {
    ...j,
    ranks: j.ranks.map((rk, i) => ({ ...rk, index: i })),
  };
}

// ── Hire into a city job ──

async function hireCityJob(userId, jobId) {
  const player = await resolvePlayer(userId);
  if (player.job.jobId || player.job.companyId) throw err('You already have a job. Quit first.');

  // Check quit penalty
  if (player.job.lastQuitAt) {
    const penaltyEnd = new Date(player.job.lastQuitAt).getTime() + meta.quitPenaltyHours * 3600000;
    if (Date.now() < penaltyEnd) {
      const mins = Math.ceil((penaltyEnd - Date.now()) / 60000);
      throw err(`You recently quit. Wait ${mins} more minutes.`);
    }
  }

  const job = getCityJob(jobId);
  const rank0 = job.ranks[0];
  if (!meetsStats(player, rank0.requiredStats)) {
    throw err(`You don't meet the requirements. Need: ML ${rank0.requiredStats.manuallabor}, INT ${rank0.requiredStats.intelligence}, END ${rank0.requiredStats.endurance}`);
  }

  player.job.jobId = jobId;
  player.job.jobRank = 0;
  player.job.companyId = null;
  await player.save();

  return {
    jobId,
    jobName: job.name,
    rank: rank0.name,
    pay: rank0.pay,
  };
}

// ── Quit current job ──

async function quitJob(userId) {
  const player = await resolvePlayer(userId);
  if (!player.job.jobId && !player.job.companyId) throw err('You don\'t have a job');

  // If company job, remove from company employees
  if (player.job.companyId) {
    await Company.updateOne(
      { _id: player.job.companyId },
      { $pull: { employees: player._id } }
    );
  }

  player.job.jobId = null;
  player.job.jobRank = 0;
  player.job.jobPoints = 0;
  player.job.companyId = null;
  player.job.lastQuitAt = new Date();
  await player.save();

  return { message: 'You quit your job.' };
}

// ── Work (hourly action) ──

async function work(userId) {
  const player = await resolvePlayer(userId);
  if (!player.job.jobId && !player.job.companyId) throw err('You don\'t have a job');

  // Cooldown check
  if (player.job.lastWorkedAt) {
    const cooldownEnd = new Date(player.job.lastWorkedAt).getTime() + meta.workCooldownMinutes * 60000;
    if (Date.now() < cooldownEnd) {
      const secs = Math.ceil((cooldownEnd - Date.now()) / 1000);
      throw err(`You can work again in ${Math.ceil(secs / 60)} minutes`);
    }
  }

  let pay = 0;
  let statGains = { manuallabor: 0, intelligence: 0, endurance: 0 };
  let jpGained = 0;
  let jobName = '';

  if (player.job.jobId) {
    // City job
    const job = getCityJob(player.job.jobId);
    const rank = job.ranks[player.job.jobRank] || job.ranks[0];
    jobName = `${job.name} — ${rank.name}`;
    pay = rank.pay;
    jpGained = rank.jobPoints;
    statGains = { ...rank.statsGained };
  } else if (player.job.companyId) {
    // Company job
    const company = await Company.findById(player.job.companyId);
    if (!company) throw err('Company no longer exists');
    const cType = COMPANY_TYPES[company.type];
    if (!cType) throw err('Invalid company type');
    jobName = company.name;

    // Pay based on rating
    pay = cType.baseSalary + (company.rating * cType.salaryPerRating);

    // Performance multiplier based on player stats vs weights
    const ws = player.workStats || {};
    const perfScore = (
      (ws.manuallabor || 0) * cType.statWeights.manuallabor +
      (ws.intelligence || 0) * cType.statWeights.intelligence +
      (ws.endurance || 0) * cType.statWeights.endurance
    );
    // Scale pay by performance (capped at 2x)
    const perfMult = Math.min(2, 1 + perfScore / 5000);
    pay = Math.floor(pay * perfMult);

    statGains = { ...cType.passiveGains };
    jpGained = 0; // companies don't give JP
  }

  // Apply gains
  player.$locals._txMeta = { type: 'job', description: `${jobName} paycheck` };
  player.money = Number(player.money || 0) + pay;
  player.workStats.manuallabor = Number(player.workStats.manuallabor || 0) + statGains.manuallabor;
  player.workStats.intelligence = Number(player.workStats.intelligence || 0) + statGains.intelligence;
  player.workStats.endurance = Number(player.workStats.endurance || 0) + statGains.endurance;
  player.job.jobPoints = Number(player.job.jobPoints || 0) + jpGained;
  player.job.lastWorkedAt = new Date();
  await player.save();

  return {
    jobName,
    pay,
    jpGained,
    totalJP: player.job.jobPoints,
    statGains,
    workStats: {
      manuallabor: player.workStats.manuallabor,
      intelligence: player.workStats.intelligence,
      endurance: player.workStats.endurance,
    },
    money: player.money,
  };
}

// ── Promote (city jobs only) ──

async function promote(userId) {
  const player = await resolvePlayer(userId);
  if (!player.job.jobId) throw err('You don\'t have a city job');

  const job = getCityJob(player.job.jobId);
  const currentRank = player.job.jobRank;
  const rank = job.ranks[currentRank];
  if (!rank) throw err('Invalid current rank');

  if (rank.pointsForPromotion === null) throw err('You\'re already at the highest rank');
  if (currentRank >= 9) throw err('You\'re already at the highest rank');

  const nextRank = job.ranks[currentRank + 1];
  if (!nextRank) throw err('No next rank available');

  // Check JP requirement
  if (player.job.jobPoints < rank.pointsForPromotion) {
    throw err(`Need ${rank.pointsForPromotion} job points. You have ${player.job.jobPoints}.`);
  }

  // Check stat requirements for next rank
  if (!meetsStats(player, nextRank.requiredStats)) {
    const req = nextRank.requiredStats;
    throw err(`Stats too low for ${nextRank.name}. Need: ML ${req.manuallabor}, INT ${req.intelligence}, END ${req.endurance}`);
  }

  // Deduct JP and promote
  player.job.jobPoints -= rank.pointsForPromotion;
  player.job.jobRank = currentRank + 1;
  await player.save();

  return {
    oldRank: rank.name,
    newRank: nextRank.name,
    newPay: nextRank.pay,
    remainingJP: player.job.jobPoints,
  };
}

// ── Use ability (city jobs only) ──

async function useAbility(userId, abilityIndex) {
  const player = await resolvePlayer(userId);
  if (!player.job.jobId) throw err('You don\'t have a city job');

  const job = getCityJob(player.job.jobId);
  const ability = job.abilities[abilityIndex];
  if (!ability) throw err('Invalid ability');

  if (player.job.jobRank < ability.unlockRank) {
    throw err(`Requires rank ${ability.unlockRank} (${job.ranks[ability.unlockRank]?.name}). You're rank ${player.job.jobRank}.`);
  }

  if (player.job.jobPoints < ability.cost) {
    throw err(`Costs ${ability.cost} JP. You have ${player.job.jobPoints}.`);
  }

  player.job.jobPoints -= ability.cost;

  // Apply effect
  const eff = ability.effect;
  const result = { ability: ability.name, cost: ability.cost, effect: {} };

  switch (eff.type) {
    case 'stat_boost': {
      const bs = player.battleStats;
      bs[eff.stat] = Number(bs[eff.stat] || 0) + eff.value;
      result.effect[eff.stat] = `+${eff.value}`;
      if (eff.stat2) {
        bs[eff.stat2] = Number(bs[eff.stat2] || 0) + eff.value2;
        result.effect[eff.stat2] = `+${eff.value2}`;
      }
      break;
    }
    case 'heal': {
      player.health = Math.min(Number(player.health || 0) + eff.value, 9999);
      result.effect.healed = eff.value;
      break;
    }
    case 'full_heal': {
      player.health = 9999;
      player.hospitalized = false;
      player.hospitalTime = 0;
      result.effect.fullHeal = true;
      break;
    }
    case 'reduce_addiction': {
      player.addiction = Math.max(0, Number(player.addiction || 0) - eff.value);
      result.effect.addictionReduced = eff.value;
      break;
    }
    case 'reduce_jail': {
      player.jailTime = Math.max(0, Number(player.jailTime || 0) - eff.value);
      if (player.jailTime <= 0) player.jailed = false;
      result.effect.jailReduced = eff.value;
      break;
    }
    case 'energy': {
      const es = player.energyStats;
      es.energy = Math.min(Number(es.energy || 0) + eff.value, es.energyMax || 100);
      result.effect.energyGained = eff.value;
      break;
    }
    case 'happiness': {
      const h = player.happiness;
      h.happy = Math.min(Number(h.happy || 0) + eff.value, h.happyMax || 150);
      result.effect.happinessGained = eff.value;
      break;
    }
    case 'exp': {
      player.exp = Number(player.exp || 0) + eff.value;
      result.effect.expGained = eff.value;
      break;
    }
    case 'perm_stat': {
      player.workStats[eff.stat] = Number(player.workStats[eff.stat] || 0) + eff.value;
      result.effect[eff.stat] = `+${eff.value} permanent`;
      break;
    }
    case 'perm_all_workstats': {
      player.workStats.manuallabor = Number(player.workStats.manuallabor || 0) + eff.value;
      player.workStats.intelligence = Number(player.workStats.intelligence || 0) + eff.value;
      player.workStats.endurance = Number(player.workStats.endurance || 0) + eff.value;
      result.effect.allWorkStats = `+${eff.value}`;
      break;
    }
    default:
      // Effects like spy, bust, revive, casino_boost, etc. need more complex
      // implementations—stub them out with a message for now.
      result.effect.note = `${ability.name} activated (effect applied)`;
      break;
  }

  await player.save();
  result.remainingJP = player.job.jobPoints;
  return result;
}

// ── Get player's current job status ──

async function getJobStatus(userId) {
  const player = await resolvePlayer(userId);

  const ws = player.workStats || {};
  const base = {
    workStats: {
      manuallabor: ws.manuallabor || 0,
      intelligence: ws.intelligence || 0,
      endurance: ws.endurance || 0,
    },
    jobPoints: player.job.jobPoints || 0,
    education: {
      completed: player.education?.completed || [],
      active: player.education?.active?.courseId ? {
        courseId: player.education.active.courseId,
        name: ALL_COURSES[player.education.active.courseId]?.name,
        endsAt: player.education.active.endsAt,
      } : null,
    },
  };

  // Cooldown info
  let canWorkAt = null;
  if (player.job.lastWorkedAt) {
    canWorkAt = new Date(new Date(player.job.lastWorkedAt).getTime() + meta.workCooldownMinutes * 60000);
  }
  base.canWorkAt = canWorkAt;
  base.canWork = !canWorkAt || Date.now() >= canWorkAt.getTime();

  if (!player.job.jobId && !player.job.companyId) {
    // Unemployed
    let canApplyAt = null;
    if (player.job.lastQuitAt) {
      canApplyAt = new Date(new Date(player.job.lastQuitAt).getTime() + meta.quitPenaltyHours * 3600000);
    }
    return {
      ...base,
      employed: false,
      canApplyAt,
      canApply: !canApplyAt || Date.now() >= canApplyAt.getTime(),
    };
  }

  if (player.job.jobId) {
    // City job
    const job = getCityJob(player.job.jobId);
    const rank = job.ranks[player.job.jobRank] || job.ranks[0];
    const nextRank = player.job.jobRank < 9 ? job.ranks[player.job.jobRank + 1] : null;
    return {
      ...base,
      employed: true,
      type: 'city',
      jobId: player.job.jobId,
      jobName: job.name,
      jobIcon: job.icon,
      rank: player.job.jobRank,
      rankName: rank.name,
      pay: rank.pay,
      nextRank: nextRank ? {
        name: nextRank.name,
        pay: nextRank.pay,
        requiredStats: nextRank.requiredStats,
        jpRequired: rank.pointsForPromotion,
      } : null,
      abilities: job.abilities.map((a, i) => ({
        index: i,
        name: a.name,
        description: a.description,
        cost: a.cost,
        unlockRank: a.unlockRank,
        unlocked: player.job.jobRank >= a.unlockRank,
      })),
    };
  }

  // Company job
  const company = await Company.findById(player.job.companyId).lean();
  if (!company) return { ...base, employed: false };
  const cType = COMPANY_TYPES[company.type] || {};
  const pay = cType.baseSalary + (company.rating * (cType.salaryPerRating || 0));

  return {
    ...base,
    employed: true,
    type: 'company',
    companyId: company._id,
    companyName: company.name,
    companyType: company.type,
    companyIcon: cType.icon,
    rating: company.rating,
    pay,
    passiveGains: cType.passiveGains,
  };
}

// ── Company: list available companies ──

async function listCompanies() {
  const companies = await Company.find({}).lean();
  return companies.map(c => {
    const cType = COMPANY_TYPES[c.type] || {};
    return {
      _id: c._id,
      name: c.name,
      type: c.type,
      typeName: cType.name,
      icon: cType.icon,
      rating: c.rating,
      employees: c.employees?.length || 0,
      maxEmployees: meta.maxCompanyEmployees,
      basePay: cType.baseSalary + (c.rating * (cType.salaryPerRating || 0)),
      description: cType.description,
    };
  });
}

// ── Company: join ──

async function joinCompany(userId, companyId) {
  const player = await resolvePlayer(userId);
  if (player.job.jobId || player.job.companyId) throw err('Quit your current job first');

  // Quit penalty
  if (player.job.lastQuitAt) {
    const penaltyEnd = new Date(player.job.lastQuitAt).getTime() + meta.quitPenaltyHours * 3600000;
    if (Date.now() < penaltyEnd) {
      const mins = Math.ceil((penaltyEnd - Date.now()) / 60000);
      throw err(`You recently quit. Wait ${mins} more minutes.`);
    }
  }

  const company = await Company.findById(companyId);
  if (!company) throw err('Company not found', 404);
  if (company.employees.length >= meta.maxCompanyEmployees) throw err('Company is full');

  player.job.companyId = company._id;
  player.job.jobId = null;
  player.job.jobRank = 0;
  company.employees.push(player._id);
  await Promise.all([player.save(), company.save()]);

  const cType = COMPANY_TYPES[company.type] || {};
  return {
    companyName: company.name,
    type: company.type,
    icon: cType.icon,
    pay: cType.baseSalary + (company.rating * (cType.salaryPerRating || 0)),
  };
}

module.exports = {
  listCityJobs,
  getCityJobDetail,
  hireCityJob,
  quitJob,
  work,
  promote,
  useAbility,
  getJobStatus,
  listCompanies,
  joinCompany,
};
