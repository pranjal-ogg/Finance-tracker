const db = require('../config/db');
const { validationResult } = require('express-validator');

// @route   GET /api/categories
// @desc    Get all user categories
// @access  Private
exports.getCategories = async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM categories WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// @route   POST /api/categories
// @desc    Create a category
// @access  Private
exports.createCategory = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, type } = req.body;

  try {
    const result = await db.query(
      'INSERT INTO categories (user_id, name, type) VALUES ($1, $2, $3) RETURNING *',
      [req.user.id, name, type]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// @route   PUT /api/categories/:id
// @desc    Update a category name
// @access  Private
exports.updateCategory = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name } = req.body;
  const categoryId = req.params.id;

  try {
    // Verify that category belongs to user
    const checkResult = await db.query(
      'SELECT * FROM categories WHERE id = $1 AND user_id = $2',
      [categoryId, req.user.id]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: 'Category not found or unauthorized' });
    }

    const result = await db.query(
      'UPDATE categories SET name = $1 WHERE id = $2 RETURNING *',
      [name, categoryId]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// @route   DELETE /api/categories/:id
// @desc    Delete a category
// @access  Private
exports.deleteCategory = async (req, res) => {
  const categoryId = req.params.id;

  try {
    // Verify that category belongs to user
    const checkResult = await db.query(
      'SELECT * FROM categories WHERE id = $1 AND user_id = $2',
      [categoryId, req.user.id]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: 'Category not found or unauthorized' });
    }

    // Check if category has existing transactions
    const transResult = await db.query(
      'SELECT COUNT(*) FROM transactions WHERE category_id = $1',
      [categoryId]
    );
    
    if (parseInt(transResult.rows[0].count) > 0) {
      return res.status(400).json({ message: 'Category has existing transactions. Reassign or delete them first.' });
    }

    // Delete category
    await db.query('DELETE FROM categories WHERE id = $1', [categoryId]);

    res.json({ message: 'Category removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};
