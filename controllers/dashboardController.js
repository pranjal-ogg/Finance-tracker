const db = require('../config/db');
const { fetchExchangeRates, convertAmount } = require('../utils/currencyConverter');

exports.getDashboardSummary = async (req, res) => {
  const userId = req.user.id;

  try {
    const userRes = await db.query('SELECT preferred_currency FROM users WHERE id = $1', [userId]);
    const prefCurrency = userRes.rows[0]?.preferred_currency || 'INR';
    const rates = await fetchExchangeRates(prefCurrency);

    // 1. Total Income & Expenses
    const totalsQuery = `
      SELECT 
        c.type, 
        t.currency,
        SUM(t.amount) as total 
      FROM transactions t
      JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = $1 
        AND t.date >= date_trunc('month', CURRENT_DATE)
      GROUP BY c.type, t.currency
    `;
    const totalsResult = await db.query(totalsQuery, [userId]);
    
    let total_income = 0;
    let total_expenses = 0;

    totalsResult.rows.forEach(row => {
      const converted = convertAmount(row.total, row.currency, prefCurrency, rates);
      if (row.type === 'income') total_income += converted;
      if (row.type === 'expense') total_expenses += converted;
    });

    const net_savings = total_income - total_expenses;

    // 2. Top 5 Expense Categories
    const topExpensesQuery = `
      SELECT 
        c.name, 
        t.currency,
        SUM(t.amount) as amount 
      FROM transactions t
      JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = $1 
        AND c.type = 'expense'
        AND t.date >= date_trunc('month', CURRENT_DATE)
      GROUP BY c.id, c.name, t.currency
    `;
    const topExpensesResult = await db.query(topExpensesQuery, [userId]);
    
    const categoryTotals = {};
    topExpensesResult.rows.forEach(row => {
      const converted = convertAmount(row.amount, row.currency, prefCurrency, rates);
      if (!categoryTotals[row.name]) categoryTotals[row.name] = 0;
      categoryTotals[row.name] += converted;
    });

    const top_expense_categories = Object.entries(categoryTotals)
      .map(([name, amount]) => ({ name, amount: parseFloat(amount.toFixed(2)), currency: prefCurrency }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    // 3. Income vs Expense last 6 months
    const last6MonthsQuery = `
      WITH months AS (
        SELECT generate_series(
          date_trunc('month', CURRENT_DATE) - INTERVAL '5 months',
          date_trunc('month', CURRENT_DATE),
          '1 month'::interval
        ) AS month_date
      )
      SELECT 
        to_char(m.month_date, 'YYYY-MM') as month,
        c.type,
        t.currency,
        SUM(t.amount) as amount
      FROM months m
      LEFT JOIN transactions t 
        ON date_trunc('month', t.date) = m.month_date AND t.user_id = $1
      LEFT JOIN categories c 
        ON t.category_id = c.id
      GROUP BY m.month_date, c.type, t.currency
      ORDER BY m.month_date ASC
    `;
    const last6MonthsResult = await db.query(last6MonthsQuery, [userId]);
    
    const monthsMap = {};
    for(let i=5; i>=0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      monthsMap[`${yyyy}-${mm}`] = { total_income: 0, total_expenses: 0 };
    }

    last6MonthsResult.rows.forEach(row => {
      if (!row.type || !row.currency) return;
      const converted = convertAmount(row.amount, row.currency, prefCurrency, rates);
      if (!monthsMap[row.month]) monthsMap[row.month] = { total_income: 0, total_expenses: 0 };
      if (row.type === 'income') monthsMap[row.month].total_income += converted;
      if (row.type === 'expense') monthsMap[row.month].total_expenses += converted;
    });

    const income_vs_expense_last_6_months = Object.entries(monthsMap)
      .map(([month, data]) => ({
        month,
        total_income: parseFloat(data.total_income.toFixed(2)),
        total_expenses: parseFloat(data.total_expenses.toFixed(2)),
        currency: prefCurrency
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // 4. Recent Transactions
    const recentQuery = `
      SELECT t.id, t.amount, t.currency, t.description, t.date, c.name as category_name, c.type
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = $1
      ORDER BY t.date DESC, t.created_at DESC
      LIMIT 5
    `;
    const recentResult = await db.query(recentQuery, [userId]);
    
    const recent_transactions = recentResult.rows.map(row => ({
      ...row,
      converted_amount: convertAmount(row.amount, row.currency, prefCurrency, rates).toFixed(2),
      preferred_currency: prefCurrency
    }));

    res.json({
      currency: prefCurrency,
      total_income: parseFloat(total_income.toFixed(2)),
      total_expenses: parseFloat(total_expenses.toFixed(2)),
      net_savings: parseFloat(net_savings.toFixed(2)),
      top_expense_categories,
      income_vs_expense_last_6_months,
      recent_transactions
    });
    
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};
