// Simple API client for Nizzia City frontend
(() => {
  const DEFAULT_API = 'http://localhost:5000/api';
  const API_BASE = window.localStorage?.getItem('nc_api') || DEFAULT_API;

  function headers(extra) {
    const h = { 'Content-Type': 'application/json', ...(extra || {}) };
    try {
      const token = localStorage.getItem('nc_token');
      if (token) h['Authorization'] = `Bearer ${token}`;
    } catch (_) {}
    return h;
  }

  async function request(path, options = {}) {
    const url = `${API_BASE}${path.startsWith('/') ? '' : '/'}${path}`;
    const res = await fetch(url, options);
    let data = null;
    try { data = await res.json(); } catch (_) {}
    if (!res.ok) {
      const err = new Error((data && data.error) || res.statusText);
      err.status = res.status;
      throw err;
    }
    return data;
  }

  async function get(path) {
    return request(path, { method: 'GET', headers: headers() });
  }

  async function post(path, body) {
    return request(path, { method: 'POST', headers: headers(), body: JSON.stringify(body || {}) });
  }

  window.NC_API = { API_BASE, get, post };
})();
