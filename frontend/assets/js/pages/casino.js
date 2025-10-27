(() => {
  const { post } = window.NC_API;
  const { ensureAuth } = window.NC_UTILS;

  document.addEventListener('DOMContentLoaded', async () => {
    const user = await ensureAuth();
    if (!user) return;
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
