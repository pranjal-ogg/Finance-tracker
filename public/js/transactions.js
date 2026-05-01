let allCategories = [];
let currentPage = 1;
let totalPages = 1;
let currentFilters = {};

const openModal = () => {
  document.getElementById('txnModal').classList.add('active');
  document.body.style.overflow = 'hidden';
};
const closeModal = () => {
  document.getElementById('txnModal').classList.remove('active');
  document.body.style.overflow = '';
  document.getElementById('txnForm').reset();
  document.getElementById('txnId').value = '';
  document.getElementById('filePreview').textContent = '';
  document.getElementById('modalTitle').textContent = 'Add Transaction';
};

const populateCategoryDropdown = (type) => {
  const sel = document.getElementById('txnCategory');
  const filtered = allCategories.filter(c => c.type === type);
  sel.innerHTML = filtered.length
    ? filtered.map(c => `<option value="${c.id}">${c.name}</option>`).join('')
    : '<option value="">No categories found</option>';
};

const loadTransactions = async () => {
  const container = document.getElementById('transactionsTableContainer');
  showSkeleton('transactionsTableContainer', 5);
  document.getElementById('resultsCount').textContent = 'Loading...';

  try {
    const params = { ...currentFilters, page: currentPage, limit: 10 };
    const data = await window.api.getTransactions(params);
    const txns = data.transactions || data;
    const total = data.total || txns.length;
    totalPages = data.pages || 1;
    const curr = window.currentUser?.preferred_currency || 'INR';

    document.getElementById('resultsCount').textContent = `Showing ${txns.length} of ${total} transactions`;
    renderPagination();

    if (!txns.length) {
      container.innerHTML = `<div class="empty-state"><i class="fa-solid fa-receipt" style="font-size:3rem;opacity:0.4;display:block;margin-bottom:1rem;"></i><p>No transactions yet. Add your first one! ➕</p></div>`;
      return;
    }

    let html = `<table class="table"><thead><tr><th>Date</th><th>Description</th><th>Category</th><th style="text-align:right;">Amount</th><th>Currency</th><th>Receipt</th><th>Actions</th></tr></thead><tbody>`;
    txns.forEach(t => {
      const isIncome = t.type === 'income';
      const receiptLink = t.receipt_url
        ? `<a href="${window.ROOT_URL}/${t.receipt_url}" target="_blank" title="View receipt">📎</a>`
        : '—';
      html += `<tr>
        <td class="text-muted">${formatDate(t.date)}</td>
        <td>${t.description || '—'}</td>
        <td><span class="badge ${isIncome ? 'badge-income' : 'badge-expense'}">${t.category_name || '—'}</span></td>
        <td class="${isIncome ? 'text-success' : 'text-danger'} font-weight-bold" style="text-align:right;">${isIncome ? '+' : '-'}${formatCurrency(Math.abs(t.amount), t.currency || curr)}</td>
        <td class="text-muted">${t.currency || curr}</td>
        <td style="text-align:center;">${receiptLink}</td>
        <td>
          <button class="action-btn text-primary" onclick="editTransaction(${JSON.stringify(t).replace(/"/g, '&quot;')})" title="Edit">✏️</button>
          <button class="action-btn text-danger" onclick="deleteTransaction(${t.id})" title="Delete">🗑️</button>
        </td>
      </tr>`;
    });
    html += `</tbody></table>`;
    container.innerHTML = html;
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><p class="text-danger">Failed to load transactions.</p><button class="btn btn-outline mt-2" onclick="loadTransactions()">Retry</button></div>`;
  }
};

const renderPagination = () => {
  const el = document.getElementById('pagination');
  if (totalPages <= 1) { el.innerHTML = ''; return; }
  el.innerHTML = `
    <button class="btn btn-outline" onclick="changePage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>← Previous</button>
    <span class="text-muted">Page ${currentPage} of ${totalPages}</span>
    <button class="btn btn-outline" onclick="changePage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>Next →</button>
  `;
};

const changePage = (page) => {
  if (page < 1 || page > totalPages) return;
  currentPage = page;
  loadTransactions();
};

window.editTransaction = (t) => {
  document.getElementById('txnId').value = t.id;
  document.getElementById('modalTitle').textContent = 'Edit Transaction';
  const type = t.type || 'income';
  document.querySelector(`input[name="type"][value="${type}"]`).checked = true;
  populateCategoryDropdown(type);
  setTimeout(() => { document.getElementById('txnCategory').value = t.category_id; }, 50);
  document.getElementById('txnAmount').value = t.amount;
  document.getElementById('txnCurrency').value = t.currency || 'INR';
  document.getElementById('txnDate').value = t.date ? t.date.slice(0, 10) : '';
  document.getElementById('txnDescription').value = t.description || '';
  openModal();
};

window.deleteTransaction = async (id) => {
  const confirmed = await showConfirm('Delete this transaction? This cannot be undone.');
  if (!confirmed) return;
  try {
    await window.api.deleteTransaction(id);
    showToast('Transaction deleted.', 'success');
    loadTransactions();
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

  try {
    allCategories = await window.api.getCategories();
    const filterSel = document.getElementById('filterCategory');
    filterSel.innerHTML = '<option value="">All Categories</option>' +
      allCategories.map(c => `<option value="${c.id}">${c.name} (${c.type})</option>`).join('');
  } catch (e) { /* silently fail */ }

  // Set today in modal date picker
  document.getElementById('txnDate').value = new Date().toISOString().slice(0, 10);

  // Type radio change: reload categories
  document.querySelectorAll('input[name="type"]').forEach(radio => {
    radio.addEventListener('change', () => populateCategoryDropdown(radio.value));
  });

  // File preview
  document.getElementById('txnReceipt').addEventListener('change', (e) => {
    const file = e.target.files[0];
    document.getElementById('filePreview').textContent = file ? `📎 ${file.name}` : '';
  });

  // Add button
  document.getElementById('addTransactionBtn').onclick = () => {
    populateCategoryDropdown(document.querySelector('input[name="type"]:checked').value);
    openModal();
  };

  // Close modal
  document.getElementById('closeTxnModal').onclick = closeModal;
  document.getElementById('cancelTxnBtn').onclick = closeModal;
  document.getElementById('txnModal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeModal();
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

  // Save transaction
  document.getElementById('saveTxnBtn').addEventListener('click', async () => {
    const form = document.getElementById('txnForm');
    if (!form.checkValidity()) { form.reportValidity(); return; }

    const id = document.getElementById('txnId').value;
    const btn = document.getElementById('saveTxnBtn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<div class="spinner"></div>';
    btn.disabled = true;

    const formData = new FormData();
    formData.append('type', document.querySelector('input[name="type"]:checked').value);
    formData.append('category_id', document.getElementById('txnCategory').value);
    formData.append('amount', document.getElementById('txnAmount').value);
    formData.append('currency', document.getElementById('txnCurrency').value);
    formData.append('date', document.getElementById('txnDate').value);
    formData.append('description', document.getElementById('txnDescription').value);
    const file = document.getElementById('txnReceipt').files[0];
    if (file) formData.append('receipt', file);

    try {
      if (id) {
        await window.api.updateTransaction(id, formData);
        showToast('Transaction updated!', 'success');
      } else {
        await window.api.createTransaction(formData);
        showToast('Transaction added!', 'success');
      }
      closeModal();
      loadTransactions();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      btn.innerHTML = originalText;
      btn.disabled = false;
    }
  });

  // Filters
  document.getElementById('applyFiltersBtn').onclick = () => {
    currentFilters = {};
    const type = document.getElementById('filterType').value;
    const cat = document.getElementById('filterCategory').value;
    const start = document.getElementById('filterStartDate').value;
    const end = document.getElementById('filterEndDate').value;
    if (type) currentFilters.type = type;
    if (cat) currentFilters.category_id = cat;
    if (start) currentFilters.start_date = start;
    if (end) currentFilters.end_date = end;
    currentPage = 1;
    loadTransactions();
  };

  document.getElementById('resetFiltersBtn').onclick = () => {
    document.getElementById('filterType').value = '';
    document.getElementById('filterCategory').value = '';
    document.getElementById('filterStartDate').value = '';
    document.getElementById('filterEndDate').value = '';
    currentFilters = {};
    currentPage = 1;
    loadTransactions();
  };

  loadTransactions();
};

checkAuth().then(user => { if (user) initPage(user); });
