let annualChart = null;

// Tab switching
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
  });
});

const getCurrentMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const renderMonthlyReport = (data, curr) => {
  const savings_rate = data.total_income > 0 ? ((data.net_savings / data.total_income) * 100).toFixed(1) : 0;

  const breakdownRow = (item, total) => {
    const pct = total > 0 ? ((item.total_amount / total) * 100).toFixed(1) : 0;
    return `<tr>
      <td>${item.category_name}</td>
      <td class="font-weight-bold">${formatCurrency(item.total_amount, curr)}</td>
      <td><div class="text-muted" style="font-size:0.8rem;">${pct}%</div><div class="prop-bar" style="width:${pct}%;max-width:100%;"></div></td>
    </tr>`;
  };

  const budgetRows = (data.budget_variance || []).map(b => {
    const diff = parseFloat(b.limit_amount) - parseFloat(b.actual_spent);
    const over = diff < 0;
    return `<tr>
      <td>${b.category_name}</td>
      <td>${formatCurrency(b.limit_amount, curr)}</td>
      <td>${formatCurrency(b.actual_spent, curr)}</td>
      <td class="${over ? 'text-danger' : 'text-success'} font-weight-bold">${over ? '-' : '+'}${formatCurrency(Math.abs(diff), curr)}</td>
      <td><span class="badge ${over ? 'badge-expense' : 'badge-income'}">${over ? 'Over Budget' : 'Under Budget'}</span></td>
    </tr>`;
  }).join('');

  document.getElementById('monthlyReportContent').innerHTML = `
    <div class="summary-cards" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:1rem;margin-bottom:1.5rem;">
      <div class="summary-card"><div class="text-muted mb-1" style="font-size:0.875rem;">Total Income</div><div class="font-weight-bold text-success" style="font-size:1.5rem;">${formatCurrency(data.total_income, curr)}</div></div>
      <div class="summary-card"><div class="text-muted mb-1" style="font-size:0.875rem;">Total Expenses</div><div class="font-weight-bold text-danger" style="font-size:1.5rem;">${formatCurrency(data.total_expenses, curr)}</div></div>
      <div class="summary-card"><div class="text-muted mb-1" style="font-size:0.875rem;">Net Savings</div><div class="font-weight-bold text-primary" style="font-size:1.5rem;">${formatCurrency(data.net_savings, curr)}</div></div>
      <div class="summary-card"><div class="text-muted mb-1" style="font-size:0.875rem;">Savings Rate</div><div class="font-weight-bold" style="font-size:1.5rem;">${savings_rate}%</div></div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;margin-bottom:1.5rem;" class="two-cols-report">
      <div class="card">
        <h3 class="card-title mb-3">Income Breakdown</h3>
        ${data.income_breakdown?.length ? `<table class="table"><thead><tr><th>Category</th><th>Amount</th><th>% of Total</th></tr></thead><tbody>${data.income_breakdown.map(i => breakdownRow(i, data.total_income)).join('')}</tbody></table>` : '<p class="text-muted">No income this month.</p>'}
      </div>
      <div class="card">
        <h3 class="card-title mb-3">Expense Breakdown</h3>
        ${data.expense_breakdown?.length ? `<table class="table"><thead><tr><th>Category</th><th>Amount</th><th>% of Total</th></tr></thead><tbody>${data.expense_breakdown.map(i => breakdownRow(i, data.total_expenses)).join('')}</tbody></table>` : '<p class="text-muted">No expenses this month.</p>'}
      </div>
    </div>

    ${data.budget_variance?.length ? `
    <div class="card">
      <h3 class="card-title mb-3">Budget vs Actual</h3>
      <div class="table-container">
        <table class="table"><thead><tr><th>Category</th><th>Budget</th><th>Actual</th><th>Difference</th><th>Status</th></tr></thead><tbody>${budgetRows}</tbody></table>
      </div>
    </div>` : ''}
  `;

  // Add responsive style for two-cols
  const style = document.getElementById('two-cols-style') || document.createElement('style');
  style.id = 'two-cols-style';
  style.textContent = `@media(max-width:768px){.two-cols-report{grid-template-columns:1fr!important;}}`;
  document.head.appendChild(style);
};

const renderAnnualReport = (data, curr) => {
  if (!data.monthly_summary || !data.monthly_summary.length) {
    document.getElementById('annualReportContent').innerHTML = `<div class="empty-state"><i class="fa-solid fa-chart-line" style="font-size:3rem;opacity:0.4;display:block;margin-bottom:1rem;"></i><p>No financial data available for this period.</p></div>`;
    return;
  }

  const months = data.monthly_summary;
  const maxSavings = Math.max(...months.map(m => m.net_savings));
  const minSavings = Math.min(...months.map(m => m.net_savings));

  const tableRows = months.map(m => {
    const isBest = m.net_savings === maxSavings;
    const isWorst = m.net_savings === minSavings && minSavings < 0;
    const rate = m.total_income > 0 ? ((m.net_savings / m.total_income) * 100).toFixed(1) : 0;
    return `<tr class="${isBest ? 'best-month' : ''} ${isWorst ? 'worst-month' : ''}">
      <td class="font-weight-500">${m.month} ${isBest ? '⭐' : ''} ${isWorst ? '⚠️' : ''}</td>
      <td class="text-success">${formatCurrency(m.total_income, curr)}</td>
      <td class="text-danger">${formatCurrency(m.total_expenses, curr)}</td>
      <td class="${m.net_savings >= 0 ? 'text-success' : 'text-danger'} font-weight-bold">${formatCurrency(m.net_savings, curr)}</td>
      <td class="text-muted">${rate}%</td>
    </tr>`;
  }).join('');

  document.getElementById('annualReportContent').innerHTML = `
    <div class="card mb-3">
      <h3 class="card-title mb-3">Income vs Expenses — ${data.year || ''}</h3>
      <div style="height:300px;position:relative;"><canvas id="annualChart"></canvas></div>
    </div>
    <div class="card">
      <h3 class="card-title mb-3">Monthly Breakdown</h3>
      <div class="table-container">
        <table class="table"><thead><tr><th>Month</th><th>Income</th><th>Expenses</th><th>Savings</th><th>Savings Rate</th></tr></thead><tbody>${tableRows}</tbody></table>
      </div>
      <p class="text-muted mt-2" style="font-size:0.8rem;">⭐ Best month &nbsp;&nbsp; ⚠️ Worst month</p>
    </div>
  `;

  if (annualChart) annualChart.destroy();
  annualChart = new Chart(document.getElementById('annualChart').getContext('2d'), {
    type: 'line',
    data: {
      labels: months.map(m => m.month),
      datasets: [
        {
          label: 'Income', data: months.map(m => m.total_income),
          borderColor: '#22C55E', backgroundColor: 'rgba(34,197,94,0.1)',
          fill: true, tension: 0.4, pointRadius: 4
        },
        {
          label: 'Expenses', data: months.map(m => m.total_expenses),
          borderColor: '#EF4444', backgroundColor: 'rgba(239,68,68,0.1)',
          fill: true, tension: 0.4, pointRadius: 4
        }
      ]
    },
    options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, grid: { color: '#E2E8F0' } }, x: { grid: { display: false } } } }
  });
};

const initPage = async (user) => {
  injectSidebar(user);
  setTimeout(() => {
    const btn = document.getElementById('mobileMenuBtn');
    const sidebar = document.getElementById('sidebar');
    if (btn && sidebar) btn.onclick = () => sidebar.classList.toggle('open');
  }, 100);

  const curr = user.preferred_currency || 'INR';
  document.getElementById('monthlyPicker').value = getCurrentMonth();
  document.getElementById('yearPicker').value = new Date().getFullYear();

  document.getElementById('generateMonthlyBtn').addEventListener('click', async () => {
    const month = document.getElementById('monthlyPicker').value;
    if (!month) return showToast('Select a month first.', 'warning');
    const btn = document.getElementById('generateMonthlyBtn');
    const orig = btn.innerHTML;
    btn.innerHTML = '<div class="spinner"></div>';
    btn.disabled = true;
    try {
      const data = await window.api.getMonthlyReport(month);
      renderMonthlyReport(data, curr);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      btn.innerHTML = orig; btn.disabled = false;
    }
  });

  document.getElementById('generateAnnualBtn').addEventListener('click', async () => {
    const year = document.getElementById('yearPicker').value;
    if (!year) return showToast('Select a year first.', 'warning');
    const btn = document.getElementById('generateAnnualBtn');
    const orig = btn.innerHTML;
    btn.innerHTML = '<div class="spinner"></div>';
    btn.disabled = true;
    try {
      const data = await window.api.getAnnualReport(year);
      renderAnnualReport(data, curr);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      btn.innerHTML = orig; btn.disabled = false;
    }
  });
};

checkAuth().then(user => { if (user) initPage(user); });
