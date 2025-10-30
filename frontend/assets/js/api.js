// Simple API client for Nizzia City frontend
(() => {
  // Default to 5050 where the backend listens by default; still auto-heals to alternates
  const DEFAULT_API = 'http://localhost:5050/api';
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
    for (let attempt = 0; attempt < 3; attempt++) {
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
        // Auto-heal localhost ports: if first attempt fails and we're on localhost/127.0.0.1,
        // try common alternates (5050, then 5000). This also fixes accidental 8080 overrides.
        if (attempt === 0) {
          try {
            const u = new URL(base);
            const isLocal = (u.hostname === 'localhost' || u.hostname === '127.0.0.1');
            const currentPort = u.port || '';
            if (isLocal) {
              const candidates = ['5050', '5000'];
              for (const p of candidates) {
                if (p !== currentPort) {
                  const altUrl = new URL(u);
                  altUrl.port = p;
                  const altBase = altUrl.toString().replace(/\/$/, '');
                  // Try alternate port once
                  try {
                    const res2 = await fetch(mkUrl(altBase), options);
                    let data2 = null; try { data2 = await res2.json(); } catch (_) {}
                    if (!res2.ok) {
                      throw new Error((data2 && (data2.error || data2.message)) || res2.statusText);
                    }
                    // Success: persist and return
                    try { window.localStorage?.setItem('nc_api', altBase); } catch (_) {}
                    return data2;
                  } catch(_) {
                    // continue to next candidate
                  }
                }
              }
            }
          } catch(_) {}
          // Legacy path: specifically switch :5000 -> :5050 and persist
          if (/\:\s*5000\b/.test(base) || base.includes(':5000/')) {
            const alt = base.replace(':5000', ':5050');
            try { window.localStorage?.setItem('nc_api', alt); } catch (_) {}
            base = alt;
            continue;
          }
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

  async function patch(path, body) {
    return request(path, { method: 'PATCH', headers: headers(), body: JSON.stringify(body || {}) });
  }

  async function del(path, body) {
    const opts = { method: 'DELETE', headers: headers() };
    if (body && Object.keys(body).length) opts.body = JSON.stringify(body);
    return request(path, opts);
  }

  window.NC_API = { API_BASE: getApiBase(), get, post, patch, del };
})();
