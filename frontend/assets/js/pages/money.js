(() => {
  const { post } = window.NC_API;
  const { ensureAuth } = window.NC_UTILS;

  function fmt(n){ return Number(n||0).toLocaleString(); }

  document.addEventListener('DOMContentLoaded', async () => {
    const user = await ensureAuth();
    if (!user) return;
    const bal = document.getElementById('balance');
    const msg = document.getElementById('money-msg');
    const amountEl = document.getElementById('amount');
    const refresh = async () => {
      try {
        const data = await post('/money/get', { userId: user._id });
        bal.textContent = `$${fmt(data.money)}`;
      } catch (e) { bal.textContent = e.message; }
    };
    await refresh();

    const act = async (path) => {
      msg.textContent = '';
      const amount = Number(amountEl.value || 0);
      try {
        const data = await post(`/money/${path}`, { userId: user._id, amount });
        bal.textContent = `$${fmt(data.money)}`;
        msg.textContent = 'Success';
      } catch (e) { msg.textContent = e.message; }
    };

    document.getElementById('btn-add').addEventListener('click', () => act('add'));
    document.getElementById('btn-remove').addEventListener('click', () => act('remove'));
    document.getElementById('btn-spend').addEventListener('click', () => act('spend'));
  });
})();
