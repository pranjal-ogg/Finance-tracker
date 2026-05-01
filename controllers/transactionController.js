const db = require('../config/db');
const { validationResult } = require('express-validator');
const { checkBudgetAfterTransaction } = require('../utils/budgetChecker');
const { fetchExchangeRates, convertAmount } = require('../utils/currencyConverter');
const fs = require('fs');
const path = require('path');

exports.getTransactions = async (req, res) => {
  try {
    const userRes = await db.query('SELECT preferred_currency FROM users WHERE id = $1', [req.user.id]);
    const prefCurrency = userRes.rows[0]?.preferred_currency || 'INR';
    const rates = await fetchExchangeRates(prefCurrency);

    const query = `
      SELECT t.*, c.name as category_name, c.type
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = $1
      ORDER BY t.date DESC, t.created_at DESC
    `;
    const result = await db.query(query, [req.user.id]);
    
    const transactions = result.rows.map(row => ({
      ...row,
      converted_amount: convertAmount(row.amount, row.currency, prefCurrency, rates).toFixed(2),
      preferred_currency: prefCurrency
    }));

    res.json(transactions);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

exports.createTransaction = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { category_id, amount, currency, description, date } = req.body;
  const receipt_url = req.file ? `/uploads/receipts/${req.file.filename}` : null;

  try {
    if (category_id) {
      const catCheck = await db.query('SELECT * FROM categories WHERE id = $1 AND user_id = $2', [category_id, req.user.id]);
      if (catCheck.rows.length === 0) {
        return res.status(404).json({ message: 'Category not found or unauthorized' });
      }
    }

    const query = `
      INSERT INTO transactions (user_id, category_id, amount, currency, description, date, receipt_url)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    
    const userCurrency = currency || 'INR'; 
    const values = [req.user.id, category_id || null, amount, userCurrency, description || '', date, receipt_url];
    
    const result = await db.query(query, values);
    res.status(201).json(result.rows[0]);
    
    if (category_id) {
      checkBudgetAfterTransaction(req.user.id, category_id, date).catch(err => 
        console.error('Async budget check failed:', err)
      );
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

exports.updateTransaction = async (req, res) => {
  const { category_id, amount, currency, description, date } = req.body;
  const receipt_url = req.file ? `/uploads/receipts/${req.file.filename}` : null;
  const transactionId = req.params.id;

  try {
    const checkResult = await db.query('SELECT * FROM transactions WHERE id = $1 AND user_id = $2', [transactionId, req.user.id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: 'Transaction not found or unauthorized' });
    }

    if (category_id) {
      const catCheck = await db.query('SELECT * FROM categories WHERE id = $1 AND user_id = $2', [category_id, req.user.id]);
      if (catCheck.rows.length === 0) {
        return res.status(404).json({ message: 'Category not found or unauthorized' });
      }
    }

    const query = `
      UPDATE transactions 
      SET 
        category_id = COALESCE($1, category_id),
        amount = COALESCE($2, amount),
        currency = COALESCE($3, currency),
        description = COALESCE($4, description),
        date = COALESCE($5, date),
        receipt_url = COALESCE($6, receipt_url),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $7 AND user_id = $8
      RETURNING *
    `;
    const values = [category_id, amount, currency, description, date, receipt_url, transactionId, req.user.id];

    const result = await db.query(query, values);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

exports.deleteTransaction = async (req, res) => {
  const transactionId = req.params.id;

  try {
    const checkResult = await db.query('SELECT receipt_url FROM transactions WHERE id = $1 AND user_id = $2', [transactionId, req.user.id]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: 'Transaction not found or unauthorized' });
    }

    const receiptUrl = checkResult.rows[0].receipt_url;
    await db.query('DELETE FROM transactions WHERE id = $1 AND user_id = $2', [transactionId, req.user.id]);
    
    if (receiptUrl) {
      const filePath = path.join(__dirname, '..', receiptUrl);
      if (fs.existsSync(filePath)) {
        fs.unlink(filePath, (err) => {
          if (err) console.error('Error deleting receipt file:', err);
        });
      }
    }

    res.json({ message: 'Transaction deleted successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};
