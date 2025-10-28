(() => {
  const { post } = window.NC_API;
  const { ensureAuth } = window.NC_UTILS;

  document.addEventListener('DOMContentLoaded', async () => {
    window.NC_UI?.init();
    const user = await ensureAuth();
    if (!user) return;
    try {
      const p = await window.NC_UTILS.fetchPlayerByUser(user._id);
      window.NC_UTILS.setPlayer(p);
      window.NC_UI?.updateHP(p);
    } catch(_) {}
    const select = document.getElementById('wheel');
    const result = document.getElementById('spin-result');
    document.getElementById('btn-spin').addEventListener('click', async () => {
      result.textContent = 'Spinning…';
      try {
        const data = await post('/casino/spin', { userId: user._id, wheel: select.value });
        result.textContent = `Result: ${data.reward?.type || 'unknown'} - ${data.reward?.value}. Remaining money: ${data.remainingMoney}`;
      } catch (e) {
        result.textContent = e.message;
      }
    });
  });
})();
