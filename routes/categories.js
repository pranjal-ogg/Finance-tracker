const express = require('express');
const { check } = require('express-validator');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const categoryController = require('../controllers/categoryController');

// All categories routes require authentication
router.use(authMiddleware);

// @route   GET /api/categories
router.get('/', categoryController.getCategories);

// @route   POST /api/categories
router.post(
  '/',
  [
    check('name', 'Name is required').not().isEmpty(),
    check('type', 'Type must be strictly income or expense').isIn(['income', 'expense'])
  ],
  categoryController.createCategory
);

// @route   PUT /api/categories/:id
router.put(
  '/:id',
  [
    check('name', 'Name is required').not().isEmpty()
  ],
  categoryController.updateCategory
);

// @route   DELETE /api/categories/:id
router.delete('/:id', categoryController.deleteCategory);

module.exports = router;
