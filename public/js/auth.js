document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const urlToken = urlParams.get('token');
  if (urlToken) {
    localStorage.setItem('pft_token', urlToken);
    window.history.replaceState({}, document.title, '/pages/dashboard.html');
    window.location.href = '/pages/dashboard.html';
    return;
  }

  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;
      const btn = loginForm.querySelector('button[type="submit"]');
      const originalText = btn.innerHTML;
      
      try {
        btn.innerHTML = '<div class="spinner"></div>';
        btn.disabled = true;
        const data = await window.api.login(email, password);
        localStorage.setItem('pft_token', data.token);
        window.location.href = '/pages/dashboard.html';
      } catch (err) {
        showToast(err.message, 'error');
        btn.innerHTML = originalText;
        btn.disabled = false;
      }
    });
  }

  const registerForm = document.getElementById('registerForm');
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('name').value;
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;
      const confirmPassword = document.getElementById('confirmPassword').value;

      if (password !== confirmPassword) {
        return showToast('Passwords do not match', 'error');
      }
      if (password.length < 8) {
        return showToast('Password must be at least 8 characters', 'warning');
      }

      const btn = registerForm.querySelector('button[type="submit"]');
      const originalText = btn.innerHTML;
      
      try {
        btn.innerHTML = '<div class="spinner"></div>';
        btn.disabled = true;
        const data = await window.api.register(name, email, password);
        localStorage.setItem('pft_token', data.token);
        window.location.href = '/pages/dashboard.html';
      } catch (err) {
        showToast(err.message, 'error');
        btn.innerHTML = originalText;
        btn.disabled = false;
      }
    });
  }
});
