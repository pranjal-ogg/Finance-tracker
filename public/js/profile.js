let currentCatTab = 'income';
let allCategories = [];

const loadProfile = async () => {
  const user = window.currentUser;
  document.getElementById('profileView').innerHTML = `
    <div class="mb-2"><span class="text-muted" style="font-size:0.8rem;text-transform:uppercase;letter-spacing:0.5px;">Name</span><div class="font-weight-500 mt-1">${user.name}</div></div>
    <div class="mb-2"><span class="text-muted" style="font-size:0.8rem;text-transform:uppercase;letter-spacing:0.5px;">Email</span><div class="font-weight-500 mt-1">${user.email}</div></div>
    <div class="mb-2"><span class="text-muted" style="font-size:0.8rem;text-transform:uppercase;letter-spacing:0.5px;">Preferred Currency</span><div class="font-weight-500 mt-1">${user.preferred_currency || 'INR'}</div></div>
    <div><span class="text-muted" style="font-size:0.8rem;text-transform:uppercase;letter-spacing:0.5px;">Member Since</span><div class="font-weight-500 mt-1">${formatDate(user.created_at)}</div></div>
  `;
  document.getElementById('profileName').value = user.name;
  document.getElementById('profileCurrency').value = user.preferred_currency || 'INR';
};

const loadCategories = async () => {
  try {
    allCategories = await window.api.getCategories();
    renderCategoryList('income');
    renderCategoryList('expense');
  } catch (err) {
    showToast('Failed to load categories.', 'error');
  }
};

const renderCategoryList = (type) => {
  const listId = type === 'income' ? 'incomeCategoryList' : 'expenseCategoryList';
  const container = document.getElementById(listId);
  const cats = allCategories.filter(c => c.type === type);

  if (!cats.length) {
    container.innerHTML = `<div class="empty-state" style="padding:1.5rem;"><p class="text-muted">No ${type} categories yet. Add one!</p></div>`;
    return;
  }

  container.innerHTML = `<table class="table">
    <tbody>
      ${cats.map(c => `
        <tr id="cat-row-${c.id}">
          <td id="cat-name-${c.id}" class="font-weight-500">${c.name}</td>
          <td style="width:120px;text-align:right;">
            <button class="action-btn" onclick="startEditCategory(${c.id}, '${c.name.replace(/'/g, "\\'")}')" title="Edit">✏️</button>
            <button class="action-btn text-danger" onclick="deleteCategory(${c.id})" title="Delete">🗑️</button>
          </td>
        </tr>
      `).join('')}
    </tbody>
  </table>`;
};

window.startEditCategory = (id, name) => {
  const cell = document.getElementById(`cat-name-${id}`);
  cell.innerHTML = `
    <div class="inline-edit">
      <input type="text" class="form-control" value="${name}" id="editCatInput-${id}" style="padding:0.4rem;">
      <button class="btn btn-primary" style="padding:0.4rem 0.75rem;" onclick="saveEditCategory(${id})">✓</button>
      <button class="btn btn-outline" style="padding:0.4rem 0.75rem;" onclick="renderCategoryList('${allCategories.find(c=>c.id===id)?.type || 'income'}')">✗</button>
    </div>
  `;
  document.getElementById(`editCatInput-${id}`).focus();
};

window.saveEditCategory = async (id) => {
  const input = document.getElementById(`editCatInput-${id}`);
  const newName = input.value.trim();
  if (!newName) return showToast('Name cannot be empty.', 'warning');
  try {
    await window.api.updateCategory(id, newName);
    showToast('Category updated!', 'success');
    loadCategories();
  } catch (err) {
    showToast(err.message, 'error');
  }
};

window.deleteCategory = async (id) => {
  const confirmed = await showConfirm('Delete this category? This cannot be undone.');
  if (!confirmed) return;
  try {
    await window.api.deleteCategory(id);
    showToast('Category deleted.', 'success');
    loadCategories();
  } catch (err) {
    showToast('Cannot delete — this category has existing transactions.', 'error');
  }
};

const loadPrefs = () => {
  document.getElementById('prefBudgetAlerts').checked = localStorage.getItem('pref_budget_alerts') !== 'false';
  document.getElementById('prefWeeklySummary').checked = localStorage.getItem('pref_weekly_summary') === 'true';
  document.getElementById('prefTxnConfirmations').checked = localStorage.getItem('pref_txn_confirmations') === 'true';
};

const initPage = async (user) => {
  injectSidebar(user);
  setTimeout(() => {
    const btn = document.getElementById('mobileMenuBtn');
    const sidebar = document.getElementById('sidebar');
    if (btn && sidebar) btn.onclick = () => sidebar.classList.toggle('open');
  }, 100);

  loadProfile();
  loadCategories();
  loadPrefs();

  // Profile edit toggle
  document.getElementById('editProfileBtn').onclick = () => {
    document.getElementById('profileView').style.display = 'none';
    document.getElementById('profileForm').style.display = 'block';
    document.getElementById('editProfileBtn').style.display = 'none';
  };

  document.getElementById('cancelEditBtn').onclick = () => {
    document.getElementById('profileView').style.display = 'block';
    document.getElementById('profileForm').style.display = 'none';
    document.getElementById('editProfileBtn').style.display = 'inline-flex';
  };

  document.getElementById('profileForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('saveProfileBtn');
    const orig = btn.innerHTML;
    btn.innerHTML = '<div class="spinner"></div>';
    btn.disabled = true;
    try {
      await window.api.updateProfile({
        name: document.getElementById('profileName').value,
        preferred_currency: document.getElementById('profileCurrency').value
      });
      showToast('Profile updated!', 'success');
      const freshUser = await window.api.getMe();
      window.currentUser = freshUser;
      loadProfile();
      document.getElementById('cancelEditBtn').click();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      btn.innerHTML = orig;
      btn.disabled = false;
    }
  });

  // Category tabs
  document.querySelectorAll('.cat-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.cat-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.cat-content').forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      currentCatTab = tab.dataset.cat;
      document.getElementById(`cat-${currentCatTab}`).classList.add('active');
      document.getElementById('newCategoryType').textContent = currentCatTab;
    });
  });

  // Add category form
  document.getElementById('addCategoryBtn').onclick = () => {
    const form = document.getElementById('addCategoryForm');
    form.style.display = form.style.display === 'none' ? 'block' : 'none';
    document.getElementById('newCategoryType').textContent = currentCatTab;
  };

  document.getElementById('cancelCategoryBtn').onclick = () => {
    document.getElementById('addCategoryForm').style.display = 'none';
    document.getElementById('newCategoryName').value = '';
  };

  document.getElementById('saveCategoryBtn').addEventListener('click', async () => {
    const name = document.getElementById('newCategoryName').value.trim();
    if (!name) return showToast('Enter a category name.', 'warning');
    const btn = document.getElementById('saveCategoryBtn');
    const orig = btn.innerHTML;
    btn.innerHTML = '<div class="spinner"></div>';
    btn.disabled = true;
    try {
      await window.api.createCategory(name, currentCatTab);
      showToast('Category added!', 'success');
      document.getElementById('newCategoryName').value = '';
      document.getElementById('addCategoryForm').style.display = 'none';
      loadCategories();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      btn.innerHTML = orig; btn.disabled = false;
    }
  });

  // Preferences
  document.getElementById('savePrefsBtn').addEventListener('click', () => {
    localStorage.setItem('pref_budget_alerts', document.getElementById('prefBudgetAlerts').checked);
    localStorage.setItem('pref_weekly_summary', document.getElementById('prefWeeklySummary').checked);
    localStorage.setItem('pref_txn_confirmations', document.getElementById('prefTxnConfirmations').checked);
    showToast('Preferences saved!', 'success');
  });
};

checkAuth().then(user => { if (user) initPage(user); });
