const db = require('../config/db');

const commonCategories = [
  { name: 'Groceries', type: 'expense' },
  { name: 'Rent', type: 'expense' },
  { name: 'Utilities', type: 'expense' },
  { name: 'Transport', type: 'expense' },
  { name: 'Dining Out', type: 'expense' },
  { name: 'Entertainment', type: 'expense' },
  { name: 'Shopping', type: 'expense' },
  { name: 'Health', type: 'expense' },
  { name: 'Insurance', type: 'expense' },
  { name: 'Other Expense', type: 'expense' },
  { name: 'Salary', type: 'income' },
  { name: 'Freelance', type: 'income' },
  { name: 'Gift', type: 'income' },
  { name: 'Other Income', type: 'income' }
];

exports.createDefaultCategories = async (userId) => {
  try {
    for (const cat of commonCategories) {
      await db.query(
        'INSERT INTO categories (user_id, name, type) VALUES ($1, $2, $3)',
        [userId, cat.name, cat.type]
      );
    }
  } catch (err) {
    console.error(`Failed to create default categories for user ${userId}:`, err);
    // We don't want to fail the whole registration if categories fail, 
    // but we should probably log it.
  }
};
