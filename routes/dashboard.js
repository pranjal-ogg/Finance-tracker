const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const dashboardController = require('../controllers/dashboardController');

// All dashboard routes are protected
router.use(authMiddleware);

// @route   GET /api/dashboard
// @desc    Get main dashboard metrics for a user
router.get('/', dashboardController.getDashboardSummary);

module.exports = router;
