(() => {
  const { get, post } = window.NC_API;
  const { ensureAuth, setPlayer } = window.NC_UTILS;

  function money(n){ return Number(n||0).toLocaleString(); }

  function renderItem(container, item, user) {
    const row = document.createElement('div');
    row.className = 'item';
    row.innerHTML = `
      <div>
        <div><strong>${item.name}</strong></div>
        <div class="meta">${item.type}${item.type2 ? ' • ' + item.type2 : ''}</div>
        <div class="meta">$${money(item.price)}</div>
      </div>
      <div class="buy">
        <input type="number" min="1" value="1" class="qty-input"/>
        <button class="btn-buy">Buy</button>
      </div>
    `;
    const qtyInput = row.querySelector('.qty-input');
    const btn = row.querySelector('.btn-buy');
    btn.addEventListener('click', async () => {
      const qty = Math.max(1, parseInt(qtyInput.value||'1', 10));
      try {
        const data = await post('/inventory/buy', { userId: user._id, itemId: item._id, qty });
        alert(`Purchased ${qty}x ${item.name}. Remaining money: $${money(data.money)}`);
        try {
          const fresh = await get(`/player/by-user/${user._id}`);
          setPlayer(fresh);
        } catch(_){}
      } catch (e) {
        alert(e.message);
      }
    });
    container.appendChild(row);
  }

  document.addEventListener('DOMContentLoaded', async () => {
    const user = await ensureAuth();
    if (!user) return;
    try {
      const all = await get('/items');
      const items = (all || []).filter(i => i.sellable !== false);
      const candy = items.filter(i => ['medicine','enhancers','alchool','drugs'].includes(i.type));
      const weapons = items.filter(i => ['weapon','armor','clothes'].includes(i.type));
      const bnb = items.filter(i => ['tools','collectibles'].includes(i.type));
      const c1 = document.querySelector('#shop-candy .items');
      const c2 = document.querySelector('#shop-weapons .items');
      const c3 = document.querySelector('#shop-bnb .items');
      candy.forEach(it => renderItem(c1, it, user));
      weapons.forEach(it => renderItem(c2, it, user));
      bnb.forEach(it => renderItem(c3, it, user));
    } catch (e) {
      console.error(e);
    }
  });
})();
