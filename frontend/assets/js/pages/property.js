(() => {
  const { get, post } = window.NC_API;
  const { ensureAuth, fetchPlayerByUser, setPlayer, getPlayerCached } = window.NC_UTILS;

  function pill(text){ const s = document.createElement('span'); s.className='stat-pill'; s.textContent=text; return s; }
  function fmtMoney(n){ return Number(n||0).toLocaleString(); }

  async function load(){
    window.NC_UI?.init();
    const user = await ensureAuth();
    if (!user) return;
    try {
      const p = await fetchPlayerByUser(user._id); setPlayer(p); window.NC_UI?.updateHP(p);
    } catch(_){}
    const player = getPlayerCached();
    const userId = (player && typeof player.id !== 'undefined') ? player.id : user._id;

    const container = document.getElementById('property');
    container.textContent = 'Loading…';

    try {
      const data = await get(`/realestate/home?userId=${encodeURIComponent(userId)}`);
      container.innerHTML = '';
      const img = document.createElement('img');
      img.src = data.image;
      img.alt = data.name;
      img.onerror = () => { img.style.background = '#ddd url(assets/images/placeholder.png) center/cover no-repeat'; img.src=''; };

      const right = document.createElement('div');
      right.innerHTML = `
        <div class="u-flex u-align-center u-gap-8">
          <h3 style="margin:0;">${data.name}</h3>
          <span class="stat-pill">Happy Max: ${data.happyMax}</span>
          <span class="stat-pill">Happy: ${data.happy}</span>
          <span class="stat-pill">Daily Upkeep: $${fmtMoney(data.upkeep)}</span>
          <span class="stat-pill">Due: $${fmtMoney(data.upkeepDue||0)}</span>
        </div>
        <div class="u-mt-8">
          <strong>Upgrades</strong>
          <div class="upgrades u-mt-8" id="upgrades"></div>
        </div>
        <div class="u-mt-12">
          <button id="btn-upkeep" class="btn">Pay Upkeep</button>
          <span id="upkeep-msg" class="msg u-ml-8"></span>
        </div>
      `;

      container.appendChild(img);
      container.appendChild(right);

      // render upgrades
      const upEl = right.querySelector('#upgrades');
      const ups = data.upgrades || {};
      const entries = Object.keys(ups);
      if (!entries.length) {
        upEl.appendChild(pill('No upgrades yet'));
      } else {
        entries.forEach(k => { if (Number(ups[k])) upEl.appendChild(pill(`${k.replace(/_/g,' ')} ✓`)); });
      }

      // upkeep button
      const btn = right.querySelector('#btn-upkeep');
      const msg = right.querySelector('#upkeep-msg');
      // Disable button if no due
      if (!Number(data.upkeepDue)) {
        btn.disabled = true;
        msg.textContent = 'No upkeep due';
      }
      btn.addEventListener('click', async () => {
        btn.disabled = true; msg.textContent = 'Paying…';
        try {
          const resp = await post('/realestate/pay-upkeep', { userId });
          msg.textContent = `Paid $${fmtMoney(resp.paid)}. Thanks!`;
          // refresh
          const fresh = await get(`/realestate/home?userId=${encodeURIComponent(userId)}`);
          right.querySelectorAll('.stat-pill')[2].textContent = `Daily Upkeep: $${fmtMoney(fresh.upkeep)}`;
          right.querySelectorAll('.stat-pill')[3].textContent = `Due: $${fmtMoney(fresh.upkeepDue||0)}`;
          if (!Number(fresh.upkeepDue)) {
            btn.disabled = true;
          }
        } catch (e) {
          msg.textContent = e.message || 'Failed to pay upkeep';
        } finally { btn.disabled = false; }
      });

    } catch (e) {
      container.textContent = e.message || 'Failed to load property';
    }
  }

  document.addEventListener('DOMContentLoaded', load);
})();
