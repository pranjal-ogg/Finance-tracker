const db = require('../config/db');
const { fetchExchangeRates, convertAmount } = require('../utils/currencyConverter');

exports.getBudgets = async (req, res) => {
  let { month } = req.query;
  
  if (!month) {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    month = `${yyyy}-${mm}`;
  }

  try {
    const userRes = await db.query('SELECT preferred_currency FROM users WHERE id = $1', [req.user.id]);
    const prefCurrency = userRes.rows[0]?.preferred_currency || 'INR';
    const rates = await fetchExchangeRates(prefCurrency);

    const query = `
      SELECT 
        b.id,
        b.category_id,
        c.name as category_name,
        b.limit_amount,
        b.month,
        t.currency,
        SUM(t.amount) as amount_spent
      FROM budgets b
      JOIN categories c ON b.category_id = c.id
      LEFT JOIN transactions t 
        ON t.category_id = b.category_id 
        AND t.user_id = b.user_id 
        AND to_char(t.date, 'YYYY-MM') = to_char(b.month, 'YYYY-MM')
      WHERE b.user_id = $1 
        AND to_char(b.month, 'YYYY-MM') = $2
      GROUP BY b.id, b.category_id, c.name, b.limit_amount, b.month, t.currency
    `;
    
    const result = await db.query(query, [req.user.id, month]);

    const budgetMap = {};
    result.rows.forEach(row => {
      if (!budgetMap[row.id]) {
        budgetMap[row.id] = {
          id: row.id,
          category_id: row.category_id,
          category_name: row.category_name,
          limit_amount: parseFloat(row.limit_amount),
          month: row.month,
          amount_spent: 0
        };
      }
      if (row.currency) {
        const spent = convertAmount(parseFloat(row.amount_spent), row.currency, prefCurrency, rates);
        budgetMap[row.id].amount_spent += spent;
      }
    });

    const budgets = Object.values(budgetMap).map(b => {
      const remaining = b.limit_amount - b.amount_spent;
      const percentage_used = b.limit_amount > 0 ? (b.amount_spent / b.limit_amount) * 100 : 0;
      return {
        ...b,
        limit_amount: b.limit_amount.toFixed(2),
        amount_spent: b.amount_spent.toFixed(2),
        remaining: remaining.toFixed(2),
        percentage_used: percentage_used.toFixed(2),
        is_exceeded: b.amount_spent > b.limit_amount,
        currency: prefCurrency
      };
    });

    res.json(budgets);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

exports.setBudget = async (req, res) => {
  const { category_id, limit_amount, month } = req.body;
  if (!category_id || limit_amount === undefined || !month) return res.status(400).json({ message: 'Missing fields' });

  try {
    const catResult = await db.query('SELECT type FROM categories WHERE id = $1 AND user_id = $2', [category_id, req.user.id]);
    if (catResult.rows.length === 0) return res.status(404).json({ message: 'Category not found' });
    if (catResult.rows[0].type !== 'expense') return res.status(400).json({ message: 'Budgets must be expense categories' });

    const formattedMonth = `${month}-01`;
    const upsertQuery = `
      INSERT INTO budgets (user_id, category_id, limit_amount, month)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id, category_id, month) 
      DO UPDATE SET limit_amount = EXCLUDED.limit_amount, created_at = CURRENT_TIMESTAMP
      RETURNING *
    `;
    const result = await db.query(upsertQuery, [req.user.id, category_id, limit_amount, formattedMonth]);
    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

exports.updateBudget = async (req, res) => {
  const { limit_amount } = req.body;
  if (limit_amount === undefined) return res.status(400).json({ message: 'limit_amount required' });
  try {
    const updateQuery = `UPDATE budgets SET limit_amount = $1 WHERE id = $2 AND user_id = $3 RETURNING *`;
    const result = await db.query(updateQuery, [limit_amount, req.params.id, req.user.id]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'Budget not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

exports.deleteBudget = async (req, res) => {
  try {
    const result = await db.query('DELETE FROM budgets WHERE id = $1 AND user_id = $2 RETURNING id', [req.params.id, req.user.id]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'Budget not found' });
    res.json({ message: 'Budget removed successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};
