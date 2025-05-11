const express = require('express');
const router = express.Router();

const { hirePlayer, promotePlayer, leaveJob  } = require('../controllers/jobController');

router.post('/hire', hirePlayer);

router.post('/promote', promotePlayer);

router.post('/leave', leaveJob);


module.exports = router;