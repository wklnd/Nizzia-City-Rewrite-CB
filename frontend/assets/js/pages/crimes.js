(() => {
  const { ensureAuth, fetchPlayerByUser, setPlayer } = window.NC_UTILS;
  document.addEventListener('DOMContentLoaded', async () => {
    window.NC_UI?.init();
    const user = await ensureAuth();
    if (!user) return;
    try {
      const p = await fetchPlayerByUser(user._id);
      setPlayer(p);
      window.NC_UI?.updateHP(p);
    } catch(_) {}
  });
})();
