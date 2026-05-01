let budgetsList = [];
let expenseCategories = [];

const getCurrentMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const openBudgetModal = (budget = null) => {
  const modal = document.getElementById('budgetModal');
  const catGroup = document.getElementById('categoryGroup');
  const monthGroup = document.getElementById('monthGroup');
  const title = document.getElementById('budgetModalTitle');

  document.getElementById('budgetId').value = budget ? budget.id : '';
  document.getElementById('budgetLimit').value = budget ? budget.limit_amount : '';

  if (budget) {
    title.textContent = 'Edit Budget';
    catGroup.style.display = 'none';
    monthGroup.style.display = 'none';
  } else {
    title.textContent = 'Add Budget';
    catGroup.style.display = 'block';
    monthGroup.style.display = 'block';
    document.getElementById('budgetCategory').innerHTML = expenseCategories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    document.getElementById('budgetMonth').value = document.getElementById('monthPicker').value || getCurrentMonth();
  }

  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
};

const closeBudgetModal = () => {
  document.getElementById('budgetModal').classList.remove('active');
  document.body.style.overflow = '';
  document.getElementById('budgetForm').reset();
};

const loadBudgets = async () => {
  const month = document.getElementById('monthPicker').value || getCurrentMonth();
  const grid = document.getElementById('budgetGrid');
  grid.innerHTML = `<div class="skeleton skeleton-card"></div><div class="skeleton skeleton-card"></div><div class="skeleton skeleton-card"></div>`;
  document.getElementById('budgetSummary').style.display = 'none';

  try {
    budgetsList = await window.api.getBudgets(month);

    if (!budgetsList || !budgetsList.length) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><i class="fa-solid fa-bullseye" style="font-size:3rem;opacity:0.4;display:block;margin-bottom:1rem;"></i><p>No budgets set for this month. Set one to start tracking! 🎯</p></div>`;
      return;
    }

    renderBudgetCards(budgetsList);
    renderBudgetSummary(budgetsList);
  } catch (err) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><p class="text-danger">Failed to load budgets.</p><button class="btn btn-outline mt-2" onclick="loadBudgets()">Retry</button></div>`;
  }
};

const renderBudgetCards = (budgets) => {
  const grid = document.getElementById('budgetGrid');
  const curr = window.currentUser?.preferred_currency || 'INR';

  grid.innerHTML = budgets.map(b => {
    const pct = parseFloat(b.percentage_used) || 0;
    const exceeded = pct >= 100;
    const warning = pct >= 70 && pct < 100;
    const barColor = exceeded ? 'var(--danger)' : warning ? 'var(--warning)' : 'var(--success)';
    const remaining = parseFloat(b.limit_amount) - parseFloat(b.amount_spent);

    return `
      <div class="budget-card">
        <div class="budget-card-header">
          <div>
            <div class="font-weight-bold">${b.category_name}</div>
            <span class="badge badge-expense" style="margin-top:4px;">EXPENSE</span>
            ${exceeded ? '<span class="badge badge-expense" style="margin-left:4px;background:rgba(239,68,68,0.2);">EXCEEDED</span>' : ''}
          </div>
          <div style="display:flex;gap:0.5rem;">
            <button class="action-btn text-primary" onclick="openBudgetModal(${JSON.stringify(b).replace(/"/g, '&quot;')})" title="Edit">✏️</button>
            <button class="action-btn text-danger" onclick="deleteBudget(${b.id})" title="Delete">🗑️</button>
          </div>
        </div>
        <div class="progress-bar-wrap">
          <div class="progress-bar-fill" style="width:0%;background-color:${barColor};" data-width="${Math.min(pct, 100)}"></div>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:0.875rem;" class="text-muted">
          <span>${formatCurrency(b.amount_spent, b.currency || curr)} spent</span>
          <span>${pct.toFixed(0)}% used</span>
        </div>
        <div style="font-size:0.875rem;margin-top:0.5rem;" class="${remaining >= 0 ? 'text-success' : 'text-danger'} font-weight-500">
          ${remaining >= 0 ? `${formatCurrency(remaining, b.currency || curr)} remaining` : `${formatCurrency(Math.abs(remaining), b.currency || curr)} overspent`}
        </div>
        <div class="text-muted" style="font-size:0.8rem;margin-top:0.25rem;">Limit: ${formatCurrency(b.limit_amount, b.currency || curr)}</div>
      </div>
    `;
  }).join('');

  // Animate progress bars after render
  setTimeout(() => {
    document.querySelectorAll('.progress-bar-fill').forEach(bar => {
      bar.style.width = bar.dataset.width + '%';
    });
  }, 100);
};

const renderBudgetSummary = (budgets) => {
  const curr = window.currentUser?.preferred_currency || 'INR';
  const totalBudgeted = budgets.reduce((s, b) => s + parseFloat(b.limit_amount), 0);
  const totalSpent = budgets.reduce((s, b) => s + parseFloat(b.amount_spent), 0);
  const exceeded = budgets.filter(b => parseFloat(b.percentage_used) >= 100).length;

  document.getElementById('totalBudgeted').textContent = formatCurrency(totalBudgeted, curr);
  document.getElementById('totalSpent').textContent = formatCurrency(totalSpent, curr);
  document.getElementById('categoriesExceeded').textContent = exceeded;
  document.getElementById('budgetSummary').style.display = 'grid';
};

window.deleteBudget = async (id) => {
  const confirmed = await showConfirm('Delete this budget?');
  if (!confirmed) return;
  try {
    await window.api.deleteBudget(id);
    showToast('Budget deleted.', 'success');
    loadBudgets();
  } catch (err) {
    showToast(err.message, 'error');
  }
};

const initPage = async (user) => {
  injectSidebar(user);
  setTimeout(() => {
    const btn = document.getElementById('mobileMenuBtn');
    const sidebar = document.getElementById('sidebar');
    if (btn && sidebar) btn.onclick = () => sidebar.classList.toggle('open');
  }, 100);

  // Set default month
  document.getElementById('monthPicker').value = getCurrentMonth();

  try {
    const cats = await window.api.getCategories();
    expenseCategories = cats.filter(c => c.type === 'expense');
  } catch (e) { /* silently fail */ }

  // Month change
  document.getElementById('monthPicker').addEventListener('change', loadBudgets);

  // Add budget
  document.getElementById('addBudgetBtn').onclick = () => openBudgetModal();

  // Close modal
  document.getElementById('closeBudgetModal').onclick = closeBudgetModal;
  document.getElementById('cancelBudgetBtn').onclick = closeBudgetModal;
  document.getElementById('budgetModal').addEventListener('click', e => { if (e.target === e.currentTarget) closeBudgetModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeBudgetModal(); });

  // Save budget
  document.getElementById('saveBudgetBtn').addEventListener('click', async () => {
    const id = document.getElementById('budgetId').value;
    const limit = document.getElementById('budgetLimit').value;
    if (!limit) return showToast('Enter a budget limit.', 'warning');

    const btn = document.getElementById('saveBudgetBtn');
    const orig = btn.innerHTML;
    btn.innerHTML = '<div class="spinner"></div>';
    btn.disabled = true;

    try {
      if (id) {
        await window.api.updateBudget(id, parseFloat(limit));
        showToast('Budget updated!', 'success');
      } else {
        const category_id = document.getElementById('budgetCategory').value;
        const month = document.getElementById('budgetMonth').value;
        await window.api.createBudget(category_id, parseFloat(limit), month);
        showToast('Budget created!', 'success');
      }
      closeBudgetModal();
      loadBudgets();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      btn.innerHTML = orig;
      btn.disabled = false;
    }
  });

  loadBudgets();
};

checkAuth().then(user => { if (user) initPage(user); });
