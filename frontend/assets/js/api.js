// Simple API client for Nizzia City frontend
(() => {
  const DEFAULT_API = 'http://localhost:5000/api';
  function getApiBase() {
    try {
      return window.localStorage?.getItem('nc_api') || DEFAULT_API;
    } catch (_) {
      return DEFAULT_API;
    }
  }

  function headers(extra) {
    const h = { 'Content-Type': 'application/json', ...(extra || {}) };
    try {
      const token = localStorage.getItem('nc_token');
      if (token) h['Authorization'] = `Bearer ${token}`;
    } catch (_) {}
    return h;
  }

  async function request(path, options = {}) {
    let base = getApiBase();
    const mkUrl = (b) => `${b}${path.startsWith('/') ? '' : '/'}${path}`;
    let lastErr;
    for (let attempt = 0; attempt < 2; attempt++) {
      const url = mkUrl(base);
      try {
        const res = await fetch(url, options);
        let data = null;
        try { data = await res.json(); } catch (_) {}
        if (!res.ok) {
          const err = new Error((data && (data.error || data.message)) || res.statusText);
          err.status = res.status;
          throw err;
        }
        return data;
      } catch (err) {
        lastErr = err;
        // If first attempt failed to reach server (e.g., macOS reserves :5000), try :5050 and persist
        if (attempt === 0 && /:\s*5000\b/.test(base) || (attempt === 0 && base.includes(':5000/'))) {
          const alt = base.replace(':5000', ':5050');
          try { window.localStorage?.setItem('nc_api', alt); } catch (_) {}
          base = alt;
          continue;
        }
        throw err;
      }
    }
    throw lastErr;
  }

  async function get(path) {
    return request(path, { method: 'GET', headers: headers() });
  }

  async function post(path, body) {
    return request(path, { method: 'POST', headers: headers(), body: JSON.stringify(body || {}) });
  }

  window.NC_API = { API_BASE: getApiBase(), get, post };
})();
