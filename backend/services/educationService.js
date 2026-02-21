// ═══════════════════════════════════════════════════════════════
//  Education Service — enroll, complete, list, bachelor's
// ═══════════════════════════════════════════════════════════════

const Player = require('../models/Player');
const { CATEGORIES, CATEGORY_LIST, ALL_COURSES } = require('../config/education');

function err(msg, status = 400) {
  return Object.assign(new Error(msg), { status });
}

async function resolvePlayer(userId) {
  const p = await Player.findOne({ user: userId });
  if (!p) throw err('Player not found', 404);
  return p;
}

// ── List all categories with progress ──

async function listCategories(userId) {
  const player = await resolvePlayer(userId);
  const completed = player.education?.completed || [];
  const bachelors = player.education?.bachelors || [];
  const active = player.education?.active;

  return CATEGORY_LIST.map(cat => {
    const done = cat.courses.filter(c => completed.includes(c.id)).length;
    return {
      id: cat.id,
      name: cat.name,
      icon: cat.icon,
      totalCourses: cat.courses.length,
      completedCourses: done,
      hasBachelor: bachelors.includes(cat.id),
      bachelorName: cat.bachelor.name,
    };
  });
}

// ── Get category detail with all courses + status ──

async function getCategoryDetail(userId, categoryId) {
  const cat = CATEGORIES[categoryId];
  if (!cat) throw err('Unknown category');

  const player = await resolvePlayer(userId);
  const completed = player.education?.completed || [];
  const active = player.education?.active;
  const bachelors = player.education?.bachelors || [];

  const courses = cat.courses.map(c => {
    const isCompleted = completed.includes(c.id);
    const isActive = active?.courseId === c.id;
    const prereqsMet = c.prereqs.every(p => completed.includes(p));

    return {
      ...c,
      completed: isCompleted,
      active: isActive,
      endsAt: isActive ? active.endsAt : null,
      prereqsMet,
    };
  });

  return {
    id: cat.id,
    name: cat.name,
    icon: cat.icon,
    courses,
    bachelor: {
      ...cat.bachelor,
      earned: bachelors.includes(cat.id),
    },
    completedCount: courses.filter(c => c.completed).length,
  };
}

// ── Get current education status (active course, stats, etc.) ──

async function getStatus(userId) {
  const player = await resolvePlayer(userId);
  const completed = player.education?.completed || [];
  const bachelors = player.education?.bachelors || [];
  const active = player.education?.active;

  let activeCourse = null;
  if (active?.courseId) {
    const course = ALL_COURSES[active.courseId];
    if (course) {
      const cat = CATEGORIES[course.category];
      activeCourse = {
        courseId: active.courseId,
        name: course.name,
        categoryName: cat?.name,
        categoryIcon: cat?.icon,
        endsAt: active.endsAt,
        startedAt: active.startedAt,
      };
    }
  }

  return {
    totalCompleted: completed.length,
    totalCourses: Object.keys(ALL_COURSES).length,
    bachelors: bachelors.map(bId => {
      const cat = CATEGORIES[bId];
      return { id: bId, name: cat?.bachelor.name || bId };
    }),
    activeCourse,
    workStats: {
      manuallabor: player.workStats?.manuallabor || 0,
      intelligence: player.workStats?.intelligence || 0,
      endurance: player.workStats?.endurance || 0,
    },
  };
}

// ── Enroll in a course ──

async function enrollCourse(userId, courseId) {
  const player = await resolvePlayer(userId);
  const course = ALL_COURSES[courseId];
  if (!course) throw err('Unknown course');

  const completed = player.education?.completed || [];
  if (completed.includes(courseId)) throw err('Already completed this course');
  if (player.education?.active?.courseId) throw err('Already enrolled in a course. Wait for it to finish.');

  // Check prereqs
  for (const p of course.prereqs) {
    if (!completed.includes(p)) {
      const pCourse = ALL_COURSES[p];
      throw err(`Prerequisite not met: ${pCourse?.name || p}`);
    }
  }

  // Check cost
  if (Number(player.money || 0) < course.cost) throw err(`This course costs $${course.cost.toLocaleString()}`);

  player.$locals._txMeta = { type: 'purchase', description: `Education: ${course.name}` };
  player.money = Number(player.money) - course.cost;

  const now = new Date();
  const endsAt = new Date(now.getTime() + course.durationDays * 24 * 3600000);
  if (!player.education) player.education = {};
  player.education.active = { courseId, startedAt: now, endsAt };
  await player.save();

  return { courseId, name: course.name, category: course.category, endsAt, cost: course.cost, durationDays: course.durationDays };
}

// ── Complete active course ──

async function completeCourse(userId) {
  const player = await resolvePlayer(userId);
  const active = player.education?.active;
  if (!active?.courseId) throw err('No active course');

  if (new Date(active.endsAt) > new Date()) {
    throw err('Course not finished yet');
  }

  const course = ALL_COURSES[active.courseId];
  if (!course) throw err('Unknown course');

  // Grant rewards
  const rewards = course.rewards || {};
  if (rewards.manuallabor) player.workStats.manuallabor = Number(player.workStats.manuallabor || 0) + rewards.manuallabor;
  if (rewards.intelligence) player.workStats.intelligence = Number(player.workStats.intelligence || 0) + rewards.intelligence;
  if (rewards.endurance) player.workStats.endurance = Number(player.workStats.endurance || 0) + rewards.endurance;

  // Mark completed
  if (!player.education.completed) player.education.completed = [];
  if (!player.education.completed.includes(active.courseId)) {
    player.education.completed.push(active.courseId);
  }
  player.education.active = { courseId: null, startedAt: null, endsAt: null };

  // Check if bachelor is earned
  let bachelorEarned = null;
  const cat = CATEGORIES[course.category];
  if (cat) {
    const allDone = cat.courses.every(c => player.education.completed.includes(c.id));
    if (allDone && !(player.education.bachelors || []).includes(cat.id)) {
      if (!player.education.bachelors) player.education.bachelors = [];
      player.education.bachelors.push(cat.id);

      // Grant bachelor rewards
      const br = cat.bachelor.rewards || {};
      if (br.manuallabor) player.workStats.manuallabor = Number(player.workStats.manuallabor) + br.manuallabor;
      if (br.intelligence) player.workStats.intelligence = Number(player.workStats.intelligence) + br.intelligence;
      if (br.endurance) player.workStats.endurance = Number(player.workStats.endurance) + br.endurance;

      bachelorEarned = {
        name: cat.bachelor.name,
        rewards: br,
        passive: cat.bachelor.passive,
        unlocks: cat.bachelor.unlocks,
      };
    }
  }

  player.$locals._skipAutoLog = true;
  await player.save();

  return {
    courseId: course.id,
    name: course.name,
    rewards,
    bachelorEarned,
    workStats: {
      manuallabor: player.workStats.manuallabor,
      intelligence: player.workStats.intelligence,
      endurance: player.workStats.endurance,
    },
  };
}

module.exports = {
  listCategories,
  getCategoryDetail,
  getStatus,
  enrollCourse,
  completeCourse,
};
