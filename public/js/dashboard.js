const initPage = async (user) => {
  injectSidebar(user);
  
  setTimeout(() => {
    const btn = document.getElementById('mobileMenuBtn');
    const sidebar = document.getElementById('sidebar');
    if(btn && sidebar) btn.onclick = () => sidebar.classList.toggle('open');
  }, 100);

  try {
    const data = await window.api.getDashboard();
    renderSummaryCards(data);
    renderExpensesChart(data.top_expense_categories);
    renderTrendChart(data.income_vs_expense_last_6_months);
    renderRecentTransactions(data.recent_transactions);
    
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    const budgets = await window.api.getBudgets(`${yyyy}-${mm}`);
    renderBudgetProgress(budgets, data.currency);

  } catch (err) {
    showToast('Failed to load dashboard data. Please try again.', 'error');
  }
};

const renderSummaryCards = (data) => {
  const container = document.getElementById('summaryCards');
  const curr = data.currency;
  
  container.innerHTML = `
    <div class="card" style="border-left: 4px solid var(--success)">
      <div class="text-muted mb-1 font-weight-500"><i class="fa-solid fa-arrow-down text-success"></i> Total Income</div>
      <h2 style="font-size: 2rem;">${formatCurrency(data.total_income, curr)}</h2>
    </div>
    <div class="card" style="border-left: 4px solid var(--danger)">
      <div class="text-muted mb-1 font-weight-500"><i class="fa-solid fa-arrow-up text-danger"></i> Total Expenses</div>
      <h2 style="font-size: 2rem;">${formatCurrency(data.total_expenses, curr)}</h2>
    </div>
    <div class="card" style="border-left: 4px solid var(--primary)">
      <div class="text-muted mb-1 font-weight-500"><i class="fa-solid fa-piggy-bank text-primary"></i> Net Savings</div>
      <h2 style="font-size: 2rem;">${formatCurrency(data.net_savings, curr)}</h2>
    </div>
  `;
};

let expensesChartInstance = null;
let trendChartInstance = null;

const renderExpensesChart = (categories) => {
  const canvas = document.getElementById('expensesChart');
  if (expensesChartInstance) expensesChartInstance.destroy();
  
  if (!categories || categories.length === 0) {
    canvas.parentElement.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;"><p class="text-muted">No expenses this month. 📈</p></div>';
    return;
  }

  expensesChartInstance = new Chart(canvas.getContext('2d'), {
    type: 'doughnut',
    data: {
      labels: categories.map(c => c.name),
      datasets: [{
        data: categories.map(c => c.amount),
        backgroundColor: ['#6C63FF','#22C55E','#F59E0B','#EF4444','#06B6D4'],
        borderWidth: 2,
        borderColor: '#ffffff'
      }]
    },
    options: { 
      responsive: true, 
      maintainAspectRatio: false, 
      cutout: '65%', 
      plugins: { 
        legend: { 
          position: 'bottom',
          labels: { padding: 20, usePointStyle: true, font: { size: 12, weight: '500' } }
        },
        tooltip: {
          callbacks: {
            label: (context) => ` ${context.label}: ${formatCurrency(context.raw, categories[0].currency)}`
          }
        }
      } 
    }
  });
};

const renderTrendChart = (months) => {
  const canvas = document.getElementById('trendChart');
  if (trendChartInstance) trendChartInstance.destroy();

  if (!months || months.length === 0) {
     canvas.parentElement.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;"><p class="text-muted">No data available.</p></div>';
     return;
  }

  // Format month labels (e.g. 2023-05 -> May)
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const labels = months.map(m => {
    const [year, month] = m.month.split('-');
    return monthNames[parseInt(month) - 1];
  });

  trendChartInstance = new Chart(canvas.getContext('2d'), {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        { label: 'Income', data: months.map(m => m.total_income), backgroundColor: '#22C55E', borderRadius: 6 },
        { label: 'Expenses', data: months.map(m => m.total_expenses), backgroundColor: '#EF4444', borderRadius: 6 }
      ]
    },
    options: { 
      responsive: true, 
      maintainAspectRatio: false, 
      scales: { 
        y: { beginAtZero: true, grid: { color: 'rgba(226, 232, 240, 0.5)', drawBorder: false } }, 
        x: { grid: { display: false } } 
      },
      plugins: {
        legend: { position: 'top', align: 'end', labels: { usePointStyle: true, padding: 15 } }
      }
    }
  });
};

const renderRecentTransactions = (txns) => {
  const container = document.getElementById('recentTransactions');
  if (!txns || txns.length === 0) {
    container.innerHTML = '<div style="padding: 1rem 0;"><p class="text-muted">No transactions yet. Add your first one! ➕</p></div>';
    return;
  }

  let html = `<table class="table"><thead><tr><th>Date</th><th>Description</th><th>Category</th><th>Amount</th></tr></thead><tbody>`;
  txns.forEach(t => {
    const isIncome = t.type === 'income';
    // Use converted amount for dashboard consistency
    const displayAmount = t.converted_amount || t.amount;
    const displayCurrency = t.preferred_currency || t.currency;

    html += `
      <tr>
        <td class="text-muted">${formatDate(t.date)}</td>
        <td class="font-weight-500">${t.description || '-'}</td>
        <td><span class="badge ${isIncome ? 'badge-income' : 'badge-expense'}">${t.category_name}</span></td>
        <td class="${isIncome ? 'text-success' : 'text-danger'} font-weight-bold" style="text-align: right;">
          ${isIncome ? '+' : '-'}${formatCurrency(Math.abs(displayAmount), displayCurrency)}
        </td>
      </tr>
    `;
  });
  html += `</tbody></table>`;
  container.innerHTML = html;
};

const renderBudgetProgress = (budgets, fallbackCurrency) => {
  const container = document.getElementById('budgetProgress');
  if (!budgets || budgets.length === 0) {
    container.innerHTML = '<div style="padding: 1rem 0;"><p class="text-muted">No budgets set for this month. Set one to start tracking! 🎯</p></div>';
    return;
  }

  let html = '';
  budgets.forEach(b => {
    const pct = parseFloat(b.percentage_used);
    let colorClass = 'bg-success';
    let statusText = '';
    
    if (pct >= 100) { colorClass = 'bg-danger'; statusText = '<span class="badge badge-expense" style="margin-left: 10px;">EXCEEDED</span>'; }
    else if (pct >= 70) { colorClass = 'bg-warning'; }

    html += `
      <div class="mb-3">
        <div class="d-flex justify-between mb-1">
          <span class="font-weight-500">${b.category_name} ${statusText}</span>
          <span class="text-muted font-weight-500" style="font-size: 0.875rem;">${formatCurrency(b.amount_spent, b.currency)} of ${formatCurrency(b.limit_amount, b.currency)} used (${pct.toFixed(0)}%)</span>
        </div>
        <div style="height: 8px; background: var(--bg); border: 1px solid var(--border); border-radius: 4px; overflow: hidden;">
          <div style="height: 100%; width: ${Math.min(pct, 100)}%; background-color: var(--${colorClass.split('-')[1]}); transition: width 1s ease-in-out;"></div>
        </div>
      </div>
    `;
  });
  container.innerHTML = html;
};

checkAuth().then(user => {
  if (user) initPage(user);
});
