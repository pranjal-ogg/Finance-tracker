const BASE_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:5001/api' 
  : 'https://finance-tracker-xp0c.onrender.com/api';

const request = async (endpoint, options = {}) => {
  const token = localStorage.getItem('pft_token');
  const headers = { ...options.headers };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, { ...options, headers });
    
    if (res.status === 401) {
      localStorage.removeItem('pft_token');
      window.location.href = '/pages/login.html';
      return null;
    }

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || data.errors?.[0]?.msg || 'API Request Failed');
    }
    return data;
  } catch (err) {
    throw err; // Allow individual views to catch or showToast
  }
};

window.api = {
  register: (name, email, password) => request('/auth/register', { method: 'POST', body: JSON.stringify({name, email, password}) }),
  login: (email, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({email, password}) }),
  getMe: () => request('/auth/me', { method: 'GET' }),
  updateProfile: (data) => request('/auth/profile', { method: 'PUT', body: JSON.stringify(data) }),

  getCategories: () => request('/categories', { method: 'GET' }),
  createCategory: (name, type) => request('/categories', { method: 'POST', body: JSON.stringify({name, type}) }),
  updateCategory: (id, name) => request(`/categories/${id}`, { method: 'PUT', body: JSON.stringify({name}) }),
  deleteCategory: (id) => request(`/categories/${id}`, { method: 'DELETE' }),

  getTransactions: (filters = {}) => {
    const query = new URLSearchParams(filters).toString();
    return request(`/transactions${query ? '?'+query : ''}`, { method: 'GET' });
  },
  createTransaction: (formData) => request('/transactions', { method: 'POST', body: formData }),
  updateTransaction: (id, formData) => request(`/transactions/${id}`, { method: 'PUT', body: formData }),
  deleteTransaction: (id) => request(`/transactions/${id}`, { method: 'DELETE' }),

  getBudgets: (month) => request(`/budgets?month=${month}`, { method: 'GET' }),
  createBudget: (category_id, limit_amount, month) => request('/budgets', { method: 'POST', body: JSON.stringify({category_id, limit_amount, month}) }),
  updateBudget: (id, limit_amount) => request(`/budgets/${id}`, { method: 'PUT', body: JSON.stringify({limit_amount}) }),
  deleteBudget: (id) => request(`/budgets/${id}`, { method: 'DELETE' }),

  getDashboard: () => request('/dashboard', { method: 'GET' }),

  getMonthlyReport: (month) => request(`/reports/monthly?month=${month}`, { method: 'GET' }),
  getAnnualReport: (year) => request(`/reports/annual?year=${year}`, { method: 'GET' })
};
