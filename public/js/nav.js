const injectSidebar = (user = null) => {
  const currentPath = window.location.pathname;
  const userName = user?.name || 'User';
  const userInitial = userName.charAt(0).toUpperCase();
  
  const sidebarHTML = `
    <aside class="sidebar" id="sidebar">
      <div class="sidebar-brand">💰 FinTrack</div>
      <nav class="sidebar-nav">
        <a href="/pages/dashboard.html" class="nav-item ${currentPath.includes('dashboard') ? 'active' : ''}">
          <i class="fa-solid fa-house"></i> Dashboard
        </a>
        <a href="/pages/transactions.html" class="nav-item ${currentPath.includes('transactions') ? 'active' : ''}">
          <i class="fa-solid fa-money-bill-wave"></i> Transactions
        </a>
        <a href="/pages/budgets.html" class="nav-item ${currentPath.includes('budgets') ? 'active' : ''}">
          <i class="fa-solid fa-bullseye"></i> Budgets
        </a>
        <a href="/pages/reports.html" class="nav-item ${currentPath.includes('reports') ? 'active' : ''}">
          <i class="fa-solid fa-chart-line"></i> Reports
        </a>
        <a href="/pages/profile.html" class="nav-item ${currentPath.includes('profile') ? 'active' : ''}">
          <i class="fa-solid fa-user"></i> Profile
        </a>
      </nav>
      <div class="sidebar-footer">
        <div class="user-avatar" id="navAvatar">${userInitial}</div>
        <div class="user-info">
          <span id="navUserName">${userName}</span>
        </div>
        <button class="logout-btn" id="navLogoutBtn" title="Logout"><i class="fa-solid fa-right-from-bracket"></i></button>
      </div>
    </aside>

    <nav class="mobile-bottom-nav">
      <a href="/pages/dashboard.html" class="mobile-nav-item ${currentPath.includes('dashboard') ? 'active' : ''}"><i class="fa-solid fa-house"></i><span>Dash</span></a>
      <a href="/pages/transactions.html" class="mobile-nav-item ${currentPath.includes('transactions') ? 'active' : ''}"><i class="fa-solid fa-money-bill-wave"></i><span>Txns</span></a>
      <a href="/pages/budgets.html" class="mobile-nav-item ${currentPath.includes('budgets') ? 'active' : ''}"><i class="fa-solid fa-bullseye"></i><span>Budgets</span></a>
      <a href="/pages/reports.html" class="mobile-nav-item ${currentPath.includes('reports') ? 'active' : ''}"><i class="fa-solid fa-chart-line"></i><span>Reports</span></a>
      <a href="/pages/profile.html" class="mobile-nav-item ${currentPath.includes('profile') ? 'active' : ''}"><i class="fa-solid fa-user"></i><span>Profile</span></a>
    </nav>
  `;

  document.body.insertAdjacentHTML('afterbegin', sidebarHTML);

  document.getElementById('navLogoutBtn').onclick = () => {
    localStorage.removeItem('pft_token');
    window.location.href = '/pages/login.html';
  };
};

const checkAuth = async () => {
  const token = localStorage.getItem('pft_token');
  if (!token) {
    window.location.href = '/pages/login.html';
    return null;
  }
  
  try {
    const user = await window.api.getMe();
    window.currentUser = user;
    return user;
  } catch (err) {
    localStorage.removeItem('pft_token');
    window.location.href = '/pages/login.html';
    return null;
  }
};
