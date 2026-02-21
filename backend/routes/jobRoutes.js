const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/authUser');
const jc = require('../controllers/jobController');

// ── Public listings ──
router.get('/city-jobs',          jc.listCityJobs);
router.get('/city-jobs/:jobId',   jc.getCityJobDetail);
router.get('/companies',          jc.listCompanies);

// ── Authenticated ──
router.get('/status',             requireAuth, jc.getStatus);
router.post('/hire',              requireAuth, jc.hireCityJob);
router.post('/quit',              requireAuth, jc.quitJob);
router.post('/work',              requireAuth, jc.doWork);
router.post('/promote',           requireAuth, jc.doPromote);
router.post('/ability',           requireAuth, jc.useAbility);
router.post('/join-company',      requireAuth, jc.joinCompany);

module.exports = router;