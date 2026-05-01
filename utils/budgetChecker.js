const db = require('../config/db');
const emailService = require('./emailService');
const { fetchExchangeRates, convertAmount } = require('./currencyConverter');

exports.checkBudgetAfterTransaction = async (userId, categoryId, transactionDate) => {
  try {
    const d = new Date(transactionDate);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    const formattedMonth = `${yyyy}-${mm}`;

    const budgetQuery = `
      SELECT b.id, b.limit_amount, c.name as category_name
      FROM budgets b
      JOIN categories c ON b.category_id = c.id
      WHERE b.user_id = $1 
        AND b.category_id = $2 
        AND to_char(b.month, 'YYYY-MM') = $3
    `;
    const budgetResult = await db.query(budgetQuery, [userId, categoryId, formattedMonth]);

    if (budgetResult.rows.length === 0) return null; 

    const budget = budgetResult.rows[0];
    const limit = parseFloat(budget.limit_amount);

    const spentQuery = `
      SELECT currency, SUM(amount) as total_spent
      FROM transactions
      WHERE user_id = $1 
        AND category_id = $2 
        AND to_char(date, 'YYYY-MM') = $3
      GROUP BY currency
    `;
    const spentResult = await db.query(spentQuery, [userId, categoryId, formattedMonth]);
    
    // Fetch User Currency and Email
    const userResult = await db.query('SELECT email, preferred_currency FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) return null;
    const userEmail = userResult.rows[0].email;
    const prefCurrency = userResult.rows[0].preferred_currency || 'INR';

    // Apply currency conversions to spent
    const rates = await fetchExchangeRates(prefCurrency);
    let spent = 0;
    spentResult.rows.forEach(row => {
      spent += convertAmount(parseFloat(row.total_spent), row.currency, prefCurrency, rates);
    });

    const percentage = limit > 0 ? (spent / limit) * 100 : 0;
    const exceeded = spent > limit;
    
    if (exceeded) {
      const subject = `Budget Exceeded for ${budget.category_name}`;
      const html = `<p>Alert: You have exceeded your budget of <strong>${limit.toFixed(2)} ${prefCurrency}</strong> for the category <strong>${budget.category_name}</strong>. Your current spending is ${spent.toFixed(2)} ${prefCurrency}.</p>`;
      await emailService.sendEmail(userId, userEmail, subject, html);
    } else if (percentage >= 80) {
      const subject = `Budget Warning: ${budget.category_name} is ${percentage.toFixed(0)}% used`;
      const html = `<p>Warning: You have utilized <strong>${percentage.toFixed(0)}%</strong> of your ${limit.toFixed(2)} ${prefCurrency} budget for <strong>${budget.category_name}</strong>. You have ${(limit - spent).toFixed(2)} ${prefCurrency} remaining for this month.</p>`;
      await emailService.sendEmail(userId, userEmail, subject, html);
    }

    return { exceeded, percentage, budget };
  } catch (error) {
    console.error('Budget check logic error:', error.message);
    return null;
  }
};
