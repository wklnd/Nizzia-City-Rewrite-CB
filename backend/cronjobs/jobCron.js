// ═══════════════════════════════════════════════════════════════
//  Job Cron — education auto-complete (runs every 5 min)
// ═══════════════════════════════════════════════════════════════

const Player = require('../models/Player');
const cron   = require('node-cron');
const { ALL_COURSES, CATEGORIES } = require('../config/education');
const ts = () => `[${new Date().toTimeString().slice(0,8)}]`;
require('dotenv').config();

/**
 * Auto-complete education courses whose endsAt has passed.
 * Grants stat rewards, marks course completed, clears active enrollment.
 */
const completeExpiredCourses = async () => {
  const now = new Date();
  const players = await Player.find({
    'education.active.courseId': { $ne: null },
    'education.active.endsAt':  { $lte: now },
  });

  let completed = 0;
  for (const player of players) {
    const { courseId } = player.education.active;
    const course = ALL_COURSES[courseId];
    if (!course) { // invalid course — just clear it
      player.education.active = { courseId: null, startedAt: null, endsAt: null };
      await player.save();
      continue;
    }

    // Grant rewards
    const r = course.rewards;
    if (r.intelligence)  player.workStats.intelligence  = Number(player.workStats.intelligence || 0) + r.intelligence;
    if (r.endurance)     player.workStats.endurance     = Number(player.workStats.endurance || 0) + r.endurance;
    if (r.manuallabor)   player.workStats.manuallabor   = Number(player.workStats.manuallabor || 0) + r.manuallabor;

    // Mark completed & clear enrollment
    if (!player.education.completed) player.education.completed = [];
    if (!player.education.completed.includes(courseId)) {
      player.education.completed.push(courseId);
    }
    player.education.active = { courseId: null, startedAt: null, endsAt: null };

    // Check for bachelor
    const cat = CATEGORIES[course.category];
    if (cat) {
      const allDone = cat.courses.every(c => player.education.completed.includes(c.id));
      if (allDone && !(player.education.bachelors || []).includes(cat.id)) {
        if (!player.education.bachelors) player.education.bachelors = [];
        player.education.bachelors.push(cat.id);
        const br = cat.bachelor.rewards || {};
        if (br.manuallabor) player.workStats.manuallabor = Number(player.workStats.manuallabor) + br.manuallabor;
        if (br.intelligence) player.workStats.intelligence = Number(player.workStats.intelligence) + br.intelligence;
        if (br.endurance) player.workStats.endurance = Number(player.workStats.endurance) + br.endurance;
      }
    }

    player.$locals._skipAutoLog = true;
    await player.save();
    completed++;
  }
  if (completed) console.log(`${ts()} [jobCron] auto-completed ${completed} education course(s)`);
};

const scheduleJob = () => {
  // Every 5 minutes, check for expired courses
  cron.schedule('*/5 * * * *', () => {
    completeExpiredCourses().catch(err => console.error('[jobCron] error:', err));
  });
};

module.exports = scheduleJob;