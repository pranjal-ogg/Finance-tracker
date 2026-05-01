const db = require('../config/db');
const { fetchExchangeRates, convertAmount } = require('../utils/currencyConverter');

exports.getMonthlyReport = async (req, res) => {
  const { month } = req.query;
  if (!month || !/^\d{4}-\d{2}$/.test(month)) return res.status(400).json({ message: 'Valid YYYY-MM required' });

  try {
    const userRes = await db.query('SELECT preferred_currency FROM users WHERE id = $1', [req.user.id]);
    const prefCurrency = userRes.rows[0]?.preferred_currency || 'INR';
    const rates = await fetchExchangeRates(prefCurrency);

    const query = `
      SELECT 
        c.id as category_id, c.name as category_name, c.type,
        t.currency, SUM(t.amount) as actual_amount,
        b.limit_amount as budget_amount
      FROM categories c
      LEFT JOIN transactions t ON t.category_id = c.id 
        AND t.user_id = $1 AND to_char(t.date, 'YYYY-MM') = $2
      LEFT JOIN budgets b ON b.category_id = c.id 
        AND b.user_id = $1 AND to_char(b.month, 'YYYY-MM') = $2
      WHERE c.user_id = $1
      GROUP BY c.id, c.name, c.type, t.currency, b.limit_amount
    `;
    const result = await db.query(query, [req.user.id, month]);

    let total_income = 0;
    let total_expenses = 0;
    const catMap = {};

    result.rows.forEach(row => {
      const actualRaw = parseFloat(row.actual_amount || 0);
      const actual = row.currency ? convertAmount(actualRaw, row.currency, prefCurrency, rates) : 0;
      const budget = row.budget_amount ? parseFloat(row.budget_amount) : 0;
      
      if (!catMap[row.category_name]) {
         catMap[row.category_name] = { type: row.type, actual_amount: 0, budget_amount: budget };
      }
      catMap[row.category_name].actual_amount += actual;
    });

    const income_by_category = [];
    const expenses_by_category = [];
    const budget_vs_actual = [];

    Object.entries(catMap).forEach(([name, data]) => {
      if (data.type === 'income' && data.actual_amount > 0) {
        income_by_category.push({ category_name: name, amount: data.actual_amount.toFixed(2), currency: prefCurrency });
        total_income += data.actual_amount;
      } else if (data.type === 'expense' && (data.actual_amount > 0 || data.budget_amount > 0)) {
        if (data.actual_amount > 0) {
          expenses_by_category.push({ category_name: name, amount: data.actual_amount.toFixed(2), currency: prefCurrency });
        }
        total_expenses += data.actual_amount;
        budget_vs_actual.push({
          category_name: name,
          actual_amount: data.actual_amount.toFixed(2),
          budget_amount: data.budget_amount.toFixed(2),
          variance: (data.budget_amount - data.actual_amount).toFixed(2),
          currency: prefCurrency
        });
      }
    });

    res.json({
      currency: prefCurrency,
      month,
      total_income: total_income.toFixed(2),
      total_expenses: total_expenses.toFixed(2),
      net_savings: (total_income - total_expenses).toFixed(2),
      income_by_category,
      expenses_by_category,
      budget_vs_actual
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

exports.getAnnualReport = async (req, res) => {
  const { year } = req.query;
  if (!year || !/^\d{4}$/.test(year)) return res.status(400).json({ message: 'Valid YYYY required' });

  try {
    const userRes = await db.query('SELECT preferred_currency FROM users WHERE id = $1', [req.user.id]);
    const prefCurrency = userRes.rows[0]?.preferred_currency || 'INR';
    const rates = await fetchExchangeRates(prefCurrency);

    const query = `
      WITH months AS (
        SELECT generate_series(TO_DATE($2 || '-01-01', 'YYYY-MM-DD'), TO_DATE($2 || '-12-01', 'YYYY-MM-DD'), '1 month'::interval) AS month_date
      )
      SELECT 
        to_char(m.month_date, 'YYYY-MM') as month, c.type, t.currency, SUM(t.amount) as amount
      FROM months m
      LEFT JOIN transactions t ON date_trunc('month', t.date) = m.month_date AND t.user_id = $1
      LEFT JOIN categories c ON t.category_id = c.id
      GROUP BY m.month_date, c.type, t.currency
      ORDER BY m.month_date ASC
    `;
    const result = await db.query(query, [req.user.id, year]);

    const monthsMap = {};
    for (let i=1; i<=12; i++) {
      monthsMap[`${year}-${String(i).padStart(2, '0')}`] = { total_income: 0, total_expenses: 0 };
    }

    result.rows.forEach(row => {
      if (!row.type || !row.currency) return;
      const converted = convertAmount(row.amount, row.currency, prefCurrency, rates);
      if (row.type === 'income') monthsMap[row.month].total_income += converted;
      if (row.type === 'expense') monthsMap[row.month].total_expenses += converted;
    });

    let yearly_income = 0; let yearly_expenses = 0;
    const monthly_breakdown = Object.entries(monthsMap).map(([month, data]) => {
      yearly_income += data.total_income;
      yearly_expenses += data.total_expenses;
      return {
        month,
        total_income: data.total_income.toFixed(2),
        total_expenses: data.total_expenses.toFixed(2),
        net_savings: (data.total_income - data.total_expenses).toFixed(2),
        currency: prefCurrency
      };
    }).sort((a, b) => a.month.localeCompare(b.month));

    res.json({
      currency: prefCurrency,
      year,
      yearly_income: yearly_income.toFixed(2),
      yearly_expenses: yearly_expenses.toFixed(2),
      yearly_savings: (yearly_income - yearly_expenses).toFixed(2),
      monthly_breakdown
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

exports.getCategoryReport = async (req, res) => {
  const { category_id, start_date, end_date } = req.query;
  if (!category_id || !start_date || !end_date) return res.status(400).json({ message: 'Missing fields' });

  try {
    const userRes = await db.query('SELECT preferred_currency FROM users WHERE id = $1', [req.user.id]);
    const prefCurrency = userRes.rows[0]?.preferred_currency || 'INR';
    const rates = await fetchExchangeRates(prefCurrency);

    const query = `
      SELECT t.id, t.amount, t.currency, t.description, to_char(t.date, 'YYYY-MM-DD') as date, c.name as category_name
      FROM transactions t JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = $1 AND t.category_id = $2 AND t.date >= $3 AND t.date <= $4
      ORDER BY t.date DESC
    `;
    const result = await db.query(query, [req.user.id, category_id, start_date, end_date]);

    let total = 0;
    const transactions = result.rows.map(row => {
      const converted = convertAmount(row.amount, row.currency, prefCurrency, rates);
      total += converted;
      return {
        ...row,
        converted_amount: converted.toFixed(2),
        preferred_currency: prefCurrency
      };
    });

    res.json({
      currency: prefCurrency,
      category_id,
      category_name: transactions.length > 0 ? transactions[0].category_name : null,
      start_date, end_date,
      total: total.toFixed(2),
      transactions
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};
