function formatCurrency(amount, currency = 'INR') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency }).format(amount);
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' });
}

function showToast(message, type = 'success') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  let icon = 'fa-circle-check';
  if (type === 'error') icon = 'fa-circle-exclamation';
  if (type === 'warning') icon = 'fa-triangle-exclamation';
  toast.innerHTML = `<i class="fa-solid ${icon}"></i><span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.add('hiding');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function showConfirm(message) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay active';
    overlay.innerHTML = `
      <div class="modal" style="max-width: 400px;">
        <div class="modal-body" style="text-align: center; padding: 2.5rem 1.5rem;">
          <i class="fa-solid fa-triangle-exclamation text-warning" style="font-size: 3rem; margin-bottom: 1rem;"></i>
          <h3 style="margin-bottom: 1rem; color: var(--text)">Confirm Action</h3>
          <p class="text-muted" style="margin-bottom: 2rem;">${message}</p>
          <div style="display: flex; justify-content: center; gap: 1rem;">
            <button class="btn btn-outline" id="confirmCancel">Cancel</button>
            <button class="btn btn-danger" id="confirmOk">Confirm</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const cleanup = () => {
      overlay.classList.remove('active');
      setTimeout(() => overlay.remove(), 300);
    };

    document.getElementById('confirmCancel').onclick = () => { cleanup(); resolve(false); };
    document.getElementById('confirmOk').onclick = () => { cleanup(); resolve(true); };
  });
}

function showSkeleton(containerId, count) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const el = document.createElement('div');
    el.className = 'skeleton skeleton-row';
    container.appendChild(el);
  }
}
