(() => {
  const { get, post } = window.NC_API;
  const { ensureAuth, fetchPlayerByUser, setPlayer, getPlayerCached } = window.NC_UTILS;

  function fmtMoney(n){ return Number(n||0).toLocaleString(undefined, { minimumFractionDigits: 0 }); }

  function render(catalog){
    const list = document.getElementById('list');
    list.innerHTML = '';
    catalog.properties.forEach(p => {
      const div = document.createElement('div');
      div.className = 'card u-p-12 u-mb-12';
      const ownedUpg = p.upgrades || {};
      const uHot = Number(ownedUpg.hot_tub||0) >= 1;
      const uTheater = Number(ownedUpg.home_theater||0) >= 1;
      const uGarden = Number(ownedUpg.garden||0) >= 1;
      div.innerHTML = `
        <div class="u-flex u-justify-between u-align-center u-gap-12">
          <div>
            <div style="font-weight:700">${p.name}</div>
            <div>Cost: $${fmtMoney(p.cost)} • Base Happy Max: ${p.baseHappyMax}</div>
            <div>Upgrade capacity: ${p.upgradeCapacity}</div>
          </div>
          <div class="u-flex u-gap-8">
            ${p.owned ? (p.active ? '<span class="stat-pill" title="Active home">Active</span>' : `<button class="btn-set" data-id="${p.id}">Set Active</button>`) : `<button class="btn-buy" data-id="${p.id}">Buy</button>`}
            ${p.owned && !p.active && p.id!=='trailer' ? `<button class="btn-sell" data-id="${p.id}">Sell</button>` : ''}
          </div>
        </div>
        ${p.owned ? `
          <div class="u-mt-8">
            <label>Upgrades:</label>
            <div class="u-flex u-gap-8 u-mt-8">
              ${uHot ? '<span class="stat-pill" title="Owned">Hot Tub ✓</span>' : `<button class="btn-upg" data-upg="hot_tub" data-id="${p.id}">Add Hot Tub</button>`}
              ${uTheater ? '<span class="stat-pill" title="Owned">Home Theater ✓</span>' : `<button class="btn-upg" data-upg="home_theater" data-id="${p.id}">Add Home Theater</button>`}
              ${uGarden ? '<span class="stat-pill" title="Owned">Zen Garden ✓</span>' : `<button class="btn-upg" data-upg="garden" data-id="${p.id}">Add Zen Garden</button>`}
            </div>
          </div>
        ` : ''}
      `;
      list.appendChild(div);
    });

    // Wire buttons
    list.querySelectorAll('.btn-buy').forEach(btn => btn.addEventListener('click', async (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      const user = getPlayerCached();
      const userId = (user && typeof user.id !== 'undefined') ? user.id : (await ensureAuth())._id;
      try {
        await post('/realestate/buy', { userId, propertyId: id, setActive: true });
        await load();
      } catch (err) { alert(err.message); }
    }));
    list.querySelectorAll('.btn-sell').forEach(btn => btn.addEventListener('click', async (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      const user = getPlayerCached();
      const userId = (user && typeof user.id !== 'undefined') ? user.id : (await ensureAuth())._id;
      try {
        await post('/realestate/sell', { userId, propertyId: id });
        await load();
      } catch (err) { alert(err.message); }
    }));
    list.querySelectorAll('.btn-set').forEach(btn => btn.addEventListener('click', async (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      const user = getPlayerCached();
      const userId = (user && typeof user.id !== 'undefined') ? user.id : (await ensureAuth())._id;
      try {
        await post('/realestate/set-active', { userId, propertyId: id });
        await load();
      } catch (err) { alert(err.message); }
    }));
    list.querySelectorAll('.btn-upg').forEach(btn => btn.addEventListener('click', async (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      const upg = e.currentTarget.getAttribute('data-upg');
      const user = getPlayerCached();
      const userId = (user && typeof user.id !== 'undefined') ? user.id : (await ensureAuth())._id;
      try {
        await post('/realestate/upgrade', { userId, propertyId: id, upgradeId: upg });
        await load();
      } catch (err) { alert(err.message); }
    }));
  }

  async function load(){
    window.NC_UI?.init();
    const user = await ensureAuth();
    if (!user) return;
    try {
      const p = await fetchPlayerByUser(user._id); setPlayer(p); window.NC_UI?.updateHP(p);
    } catch(_){}
    const player = getPlayerCached();
    const userId = (player && typeof player.id !== 'undefined') ? player.id : user._id;
    try {
      const cat = await get(`/realestate/catalog?userId=${encodeURIComponent(userId)}`);
      document.getElementById('money').textContent = `Money: $${fmtMoney(cat.money)}`;
      document.getElementById('home').textContent = `Active home: ${cat.home}`;
      render(cat);
    } catch (e) {
      document.getElementById('list').textContent = e.message || 'Failed to load catalog';
    }
  }

  document.addEventListener('DOMContentLoaded', load);
})();
