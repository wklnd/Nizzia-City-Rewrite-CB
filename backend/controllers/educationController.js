// ═══════════════════════════════════════════════════════════════
//  Education Controller
// ═══════════════════════════════════════════════════════════════

const educationService = require('../services/educationService');

function wrap(fn) {
  return async (req, res) => {
    try { return res.json(await fn(req)); }
    catch (e) { return res.status(e.status || 500).json({ error: e.message }); }
  };
}

const getStatus         = wrap(req => educationService.getStatus(req.authUserId));
const listCategories    = wrap(req => educationService.listCategories(req.authUserId));
const getCategoryDetail = wrap(req => educationService.getCategoryDetail(req.authUserId, req.params.categoryId));
const enrollCourse      = wrap(req => educationService.enrollCourse(req.authUserId, req.body.courseId));
const completeCourse    = wrap(req => educationService.completeCourse(req.authUserId));

module.exports = {
  getStatus,
  listCategories,
  getCategoryDetail,
  enrollCourse,
  completeCourse,
};
