const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const budgetController = require('../controllers/budgetController');

router.use(authMiddleware);

// @route   GET /api/budgets
router.get('/', budgetController.getBudgets);

// @route   POST /api/budgets
router.post('/', budgetController.setBudget);

// @route   PUT /api/budgets/:id
router.put('/:id', budgetController.updateBudget);

// @route   DELETE /api/budgets/:id
router.delete('/:id', budgetController.deleteBudget);

module.exports = router;
