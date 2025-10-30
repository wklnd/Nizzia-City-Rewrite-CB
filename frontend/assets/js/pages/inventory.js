(() => {
  const { get, post } = window.NC_API;
  const { ensureAuth } = window.NC_UTILS;

  function itemCard(entry, user, player) {
    const card = document.createElement('div');
    card.className = 'card';
    const item = entry.item || {};
    card.innerHTML = `
      <h3>${item.name || 'Unknown Item'}</h3>
      <div class="meta">Type: ${item.type || 'n/a'}${item.type2 ? ' • ' + item.type2 : ''}</div>
      <div class="meta">Qty: ${entry.qty || 0}</div>
    `;
    if (item.usable) {
      const btn = document.createElement('button');
      btn.textContent = 'Use';
      // Determine cooldown type and remaining for this item
      const effect = item.effect || {};
      const t = String((effect.cooldownType || '').toLowerCase() || (item.type === 'drugs' ? 'drug' : item.type === 'enhancers' ? 'booster' : (item.type === 'medicine' || item.type === 'alchool') ? 'medical' : ''));
      const playerCds = (player && player.cooldowns) ? player.cooldowns : {};
      const remaining = t === 'drug' ? Number(playerCds.drugCooldown||0)
                        : t === 'booster' ? Number(playerCds.boosterCooldown||0)
                        : t === 'medical' ? Number(playerCds.medicalCooldown||0)
                        : 0;
      const cdEl = document.createElement('div');
      cdEl.className = 'meta';
      if (remaining > 0) {
        btn.disabled = true;
        const mm = String(Math.floor(remaining/60)).padStart(2,'0');
        const ss = String(remaining%60).padStart(2,'0');
        cdEl.textContent = `Cooldown: ${mm}:${ss}`;
      }
      btn.addEventListener('click', async () => {
        btn.disabled = true;
        try {
          const res = await post('/inventory/use', { userId: user._id, itemId: item._id, qty: 1 });
          // Refresh list with updated inventory
          try {
            // Update cached player vitals and cooldowns if present
            const cached = window.NC_UTILS.getPlayerCached() || {};
            if (res.energy != null) cached.energyStats = { ...(cached.energyStats||{}), energy: res.energy };
            if (res.nerve != null) cached.nerveStats = { ...(cached.nerveStats||{}), nerve: res.nerve };
            if (res.happy != null) cached.happiness = { ...(cached.happiness||{}), happy: res.happy };
            if (res.cooldowns) {
              cached.cooldowns = {
                ...(cached.cooldowns||{}),
                drugCooldown: Number(res.cooldowns.drug||0),
                boosterCooldown: Number(res.cooldowns.booster||0),
                medicalCooldown: Number(res.cooldowns.medical||0),
              };
            }
            window.NC_UTILS.setPlayer(cached);
            window.NC_UI?.updateHP?.(cached);
          } catch(_) {}
          renderInventory(res.inventory || [], user);
          window.NC_UI?.flash?.('Item used successfully');
        } catch (e) {
          console.error(e);
          if (e && e.status === 429) {
            const msg = e.message || 'On cooldown';
            alert(`${msg}. Please wait and try again.`);
          } else {
            alert(e.message || 'Failed to use item');
          }
        } finally {
          btn.disabled = false;
        }
      });
      card.appendChild(btn);
      if (remaining > 0) card.appendChild(cdEl);
    }
    return card;
  }

  function renderInventory(inv, user){
    const container = document.getElementById('inv');
    container.innerHTML = '';
    if (!inv.length) {
      const empty = document.createElement('div');
      empty.className = 'card';
      empty.textContent = 'Your inventory is empty. Visit the City to buy some items.';
      container.appendChild(empty);
    } else {
      const player = window.NC_UTILS.getPlayerCached();
      inv.forEach(entry => container.appendChild(itemCard(entry, user, player)));
    }
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
      renderInventory(inv, user);
    } catch (e) {
      console.error(e);
    }
  });
})();
