(() => {
  const { get } = window.NC_API;
  const { ensureAuth } = window.NC_UTILS;

  function itemCard(entry) {
    const card = document.createElement('div');
    card.className = 'card';
    const item = entry.item || {};
    card.innerHTML = `
      <h3>${item.name || 'Unknown Item'}</h3>
      <div class="meta">Type: ${item.type || 'n/a'}${item.type2 ? ' • ' + item.type2 : ''}</div>
      <div class="meta">Qty: ${entry.qty || 0}</div>
    `;
    return card;
  }

  document.addEventListener('DOMContentLoaded', async () => {
    window.NC_UI?.init();
    const user = await ensureAuth();
    if (!user) return;
    try {
      const p = await window.NC_UTILS.fetchPlayerByUser(user._id);
      window.NC_UTILS.setPlayer(p);
      window.NC_UI?.updateHP(p);
    } catch(_) {}
    try {
      const data = await get(`/inventory/${user._id}`);
      const inv = Array.isArray(data.inventory) ? data.inventory : [];
      const container = document.getElementById('inv');
      container.innerHTML = '';
      if (!inv.length) {
        const empty = document.createElement('div');
        empty.className = 'card';
        empty.textContent = 'Your inventory is empty. Visit the City to buy some items.';
        container.appendChild(empty);
      } else {
        inv.forEach(entry => container.appendChild(itemCard(entry)));
      }
    } catch (e) {
      console.error(e);
    }
  });
})();
