// Frontend utilities: auth/session, formatting, and player helpers
(() => {
  function fmtInt(n) { return Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 }); }
  function fmtMoney(n) { return `$${fmtInt(n)}`; }

  function getUser() {
    try { return JSON.parse(localStorage.getItem('nc_user') || 'null'); } catch(_) { return null; }
  }
  function setUser(u) {
    try { localStorage.setItem('nc_user', JSON.stringify(u)); } catch(_) {}
  }
  function clearSession() {
    try {
      localStorage.removeItem('nc_token');
      localStorage.removeItem('nc_user');
      localStorage.removeItem('nc_player');
    } catch(_) {}
  }

  function getPlayerCached() {
    try { return JSON.parse(localStorage.getItem('nc_player') || 'null'); } catch(_) { return null; }
  }
  function setPlayer(p) {
    try { localStorage.setItem('nc_player', JSON.stringify(p)); } catch(_) {}
  }

  async function ensureAuth(redirect = 'auth/login.html') {
    const u = getUser();
    if (!u || !u._id) { window.location.href = redirect; return null; }
    return u;
  }

  async function fetchPlayerByUser(userId) {
    const { get } = window.NC_API;
    return get(`/player/by-user/${userId}`);
  }

  async function ensurePlayerLoaded() {
    const user = await ensureAuth();
    if (!user) return null;
    // Try to refresh from backend; fall back to cached
    try {
      const player = await fetchPlayerByUser(user._id);
      setPlayer(player);
      return { user, player };
    } catch (e) {
      if (e.status === 404) {
        window.location.href = 'auth/create-player.html';
        return null;
      }
      const cached = getPlayerCached();
      return { user, player: cached };
    }
  }

  window.NC_UTILS = {
    fmtInt,
    fmtMoney,
    getUser,
    setUser,
    clearSession,
    getPlayerCached,
    setPlayer,
    ensureAuth,
    ensurePlayerLoaded,
    fetchPlayerByUser,
  };
})();
