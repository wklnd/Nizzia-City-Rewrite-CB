const express = require('express');
const router = express.Router();
const { attachAuth } = require('../middleware/authUser');
const ec = require('../controllers/educationController');

// All education endpoints require auth
router.get('/status',                  attachAuth, ec.getStatus);
router.get('/categories',             attachAuth, ec.listCategories);
router.get('/categories/:categoryId', attachAuth, ec.getCategoryDetail);
router.post('/enroll',                attachAuth, ec.enrollCourse);
router.post('/complete',              attachAuth, ec.completeCourse);

module.exports = router;
