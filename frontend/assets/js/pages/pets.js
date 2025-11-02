(() => {
  const { get, post } = window.NC_API;
  const { ensureAuth, fetchPlayerByUser, setPlayer, getPlayerCached } = window.NC_UTILS;

  function fmtMoney(n){ return `$${Number(n||0).toLocaleString()}`; }

  async function load(){
    window.NC_UI?.init();
    const user = await ensureAuth();
    if (!user) return;
    try { const p = await fetchPlayerByUser(user._id); setPlayer(p); window.NC_UI?.updateHP(p); } catch(_){ }
    const player = getPlayerCached();
    const userId = (player && typeof player.id !== 'undefined') ? player.id : user._id;

    const ownedBox = document.getElementById('owned');
    const catalogBox = document.getElementById('catalog');
    ownedBox.textContent = 'Loading…';
    catalogBox.textContent = 'Loading…';

    try {
      const [mine, cat] = await Promise.all([
        get(`/pets/my?userId=${encodeURIComponent(userId)}`),
        get('/pets/catalog'),
      ]);

      // Owned status
      ownedBox.innerHTML = '';
      if (!mine.pet) {
        ownedBox.innerHTML = '<div class="note">You don\'t own a pet yet. Pick one below!</div>';
      } else {
        const p = mine.pet;
        const wrap = document.createElement('div');
        wrap.className = 'pet-card';
        wrap.innerHTML = `
          <h3 style="margin:0;">Your Pet</h3>
          <div class="meta">
            <span class="stat-pill">${p.name} (${p.type})</span>
            <span class="stat-pill">Happy Bonus: +${p.happyBonus}</span>
            <span class="stat-pill">Age: ${p.age}d</span>
          </div>
          <div class="u-flex u-gap-8">
            <button id="btn-release" class="btn btn-danger">Release Pet</button>
            <a class="btn" href="property.html">Go to Property</a>
          </div>
        `;
        ownedBox.appendChild(wrap);
        wrap.querySelector('#btn-release').addEventListener('click', async () => {
          if (!confirm('Are you sure you want to release your pet?')) return;
          try {
            await post('/pets/release', { userId });
            location.reload();
          } catch (e) { alert(e.message || 'Failed to release'); }
        });
      }

      // Catalog
      catalogBox.innerHTML = '';
      const money = player?.money; // might be stale; we won\'t rely on it for blocking
      (cat.pets || []).forEach((p) => {
        const card = document.createElement('div');
        card.className = 'pet-card';
        card.innerHTML = `
          <h4>${p.name}</h4>
          <div class="meta">
            <span class="stat-pill">Happiness Bonus: +${p.happyBonus}</span>
            <span class="stat-pill">Price: ${fmtMoney(p.cost)}</span>
          </div>
          <div class="u-flex u-gap-8">
            <button class="btn" data-type="${p.id}">Buy</button>
          </div>
        `;
        const btn = card.querySelector('button');
        btn.addEventListener('click', async () => {
          btn.disabled = true; btn.textContent = 'Buying…';
          try {
            await post('/pets/buy', { userId, type: p.id, name: p.name });
            // After purchase, reflect ownership
            location.reload();
          } catch (e) {
            alert(e.message || 'Failed to buy');
            btn.disabled = false; btn.textContent = 'Buy';
          }
        });
        catalogBox.appendChild(card);
      });

    } catch (e) {
      ownedBox.textContent = e.message || 'Failed to load';
      catalogBox.textContent = '';
    }
  }

  document.addEventListener('DOMContentLoaded', load);
})();
