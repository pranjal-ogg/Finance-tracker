const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const reportController = require('../controllers/reportController');

// All report routes are protected
router.use(authMiddleware);

// @route   GET /api/reports/monthly
router.get('/monthly', reportController.getMonthlyReport);

// @route   GET /api/reports/annual
router.get('/annual', reportController.getAnnualReport);

// @route   GET /api/reports/category
router.get('/category', reportController.getCategoryReport);

module.exports = router;
