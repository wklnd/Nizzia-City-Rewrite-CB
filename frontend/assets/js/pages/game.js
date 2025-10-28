(() => {
  const { get, post } = window.NC_API;
  const { ensurePlayerLoaded, fmtMoney, clearSession, setPlayer } = window.NC_UTILS;

  function renderSidebar(player){
    if (!player) return;
    document.getElementById('ui-name').textContent = `Name: ${player.name}`;
    document.getElementById('ui-money').textContent = `Money: ${fmtMoney(player.money || 0)}`;
    document.getElementById('ui-level').textContent = `Level: ${player.level || 1}`;
    document.getElementById('ui-points').textContent = `Points: ${player.points || 0}`;

    const eNow = player.energyStats?.energy ?? 0;
    const eMax = player.energyStats?.energyMax ?? 0;
    const nNow = player.nerveStats?.nerve ?? 0;
    const nMax = player.nerveStats?.nerveMax ?? 0;
    const hNow = player.happiness?.happy ?? 0;
    const hMax = player.happiness?.happyMax ?? 0;
  const hpNow = typeof player.health === 'number' ? player.health : 0;
  const hpMax = 100;

    document.getElementById('ui-energy-label').textContent = `Energy: ${eNow}/${eMax}`;
    document.getElementById('ui-nerve-label').textContent = `Nerve: ${nNow}/${nMax}`;
    document.getElementById('ui-happy-label').textContent = `Happy: ${hNow}/${hMax}`;
  const hpLabel = document.getElementById('ui-hp-label');
  if (hpLabel) hpLabel.textContent = `HP: ${hpNow}/${hpMax}`;

    const pct = (cur, max) => max > 0 ? Math.min(100, Math.round(cur/max*100)) : 0;
    document.getElementById('ui-energy-bar').style.width = pct(eNow, eMax) + '%';
    document.getElementById('ui-nerve-bar').style.width = pct(nNow, nMax) + '%';
    document.getElementById('ui-happy-bar').style.width = pct(hNow, hMax) + '%';
  const hpBar = document.getElementById('ui-hp-bar');
  if (hpBar) hpBar.style.width = pct(hpNow, hpMax) + '%';

    // Toggle developer menu
    const isDev = player.playerRole === 'Developer';
    const devMenu = document.getElementById('dev-menu');
    if (devMenu) devMenu.style.display = isDev ? 'block' : 'none';
  }

  document.addEventListener('DOMContentLoaded', async () => {
    // Initialize shared topbar
    window.NC_UI?.init();
    const ctx = await ensurePlayerLoaded();
    if (!ctx) return;
    const { user } = ctx;

    // Always fetch latest player
    let player = null;
    try {
      player = await get(`/player/by-user/${user._id}`);
      setPlayer(player);
    } catch (_) {}
    renderSidebar(player);
    // Update HP in topbar and attach regen countdowns for bars
    window.NC_UI?.updateHP(player);
    window.NC_UI?.attachRegenCountdowns();

    // Developer controls
    const msg = document.getElementById('dev-msg');
    const setMsg = (t, ok=true) => { if (msg) { msg.textContent = t; msg.className = ok ? 'msg ok' : 'msg err'; } };
    const handle = async (path, amount) => {
      setMsg('');
      const data = await post(`/dev/${path}`, { userId: user._id, amount: Number(amount) });
      try {
        const fresh = await get(`/player/by-user/${user._id}`);
        setPlayer(fresh);
        renderSidebar(fresh);
        window.NC_UI?.updateHP(fresh);
      } catch (_) {}
      return data;
    };
    const byId = (id) => document.getElementById(id);
    const btnMoney = byId('dev-add-money');
    const btnEnergy = byId('dev-add-energy');
    const btnNerve = byId('dev-add-nerve');
    if (btnMoney) btnMoney.addEventListener('click', async () => {
      try { await handle('add-money', byId('dev-money').value); setMsg('Money added.'); }
      catch (e) { setMsg(e.message, false); }
    });
    if (btnEnergy) btnEnergy.addEventListener('click', async () => {
      try { await handle('add-energy', byId('dev-energy').value); setMsg('Energy added.'); }
      catch (e) { setMsg(e.message, false); }
    });
    if (btnNerve) btnNerve.addEventListener('click', async () => {
      try { await handle('add-nerve', byId('dev-nerve').value); setMsg('Nerve added.'); }
      catch (e) { setMsg(e.message, false); }
    });
  });
})();
