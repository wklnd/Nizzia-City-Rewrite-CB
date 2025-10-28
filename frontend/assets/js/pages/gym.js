(() => {
  const { post } = window.NC_API;
  const { ensurePlayerLoaded, fmtInt, setPlayer } = window.NC_UTILS;

  function pickStat() {
    const el = document.querySelector('input[name="stat"]:checked');
    return el ? el.value : 'strength';
  }

  function renderSidebar(player){
    document.getElementById('ui-name').textContent = `Name: ${player.name}`;
    document.getElementById('ui-money').textContent = `Money: $${fmtInt(player.money)}`;
    document.getElementById('ui-level').textContent = `Level: ${player.level||1}`;
    document.getElementById('ui-points').textContent = `Points: ${player.points||0}`;

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

    document.getElementById('energy-now').textContent = eNow;
  }

  function renderStats(player){
    document.getElementById('st-strength').textContent = fmtInt(player.battleStats?.strength);
    document.getElementById('st-speed').textContent = fmtInt(player.battleStats?.speed);
    document.getElementById('st-dexterity').textContent = fmtInt(player.battleStats?.dexterity);
    document.getElementById('st-defense').textContent = fmtInt(player.battleStats?.defense);
  }

  async function updateEstimate(player){
    const energyPerTrain = Math.max(1, Math.min(100, parseInt(document.getElementById('energy').value || '10', 10)));
    const statType = pickStat();
    const statTotal = Number(player.battleStats?.[statType] || 0);
    const body = {
      statTotal,
      happy: player.happiness?.happy ?? 0,
      gymDots: 10,
      energyPerTrain,
      perkBonus: 0,
      statType,
      randomValue: 0
    };
    const out = document.getElementById('est-gain');
    try {
      const data = await post('/gym/calculate', body);
      out.textContent = data.gain;
    } catch (_) {
      out.textContent = '—';
    }
  }

  async function train(player, user){
    const energyPerTrain = Math.max(1, Math.min(100, parseInt(document.getElementById('energy').value || '10', 10)));
    const body = {
      id: player.id,
      userId: user._id,
      happy: player.happiness?.happy ?? 0,
      gymDots: 10,
      energyPerTrain,
      perkBonus: 0,
      statType: pickStat(),
      randomValue: Math.floor(Math.random()*101) - 50
    };
    const data = await post('/gym/train', body);
    player.battleStats = data.updatedStats;
    player.energyStats = player.energyStats || {};
    player.energyStats.energy = data.remainingEnergy;
    setPlayer(player);
    return { player, data };
  }

  document.addEventListener('DOMContentLoaded', async () => {
    window.NC_UI?.init();
    const ctx = await ensurePlayerLoaded();
    if (!ctx) return;
    let { player, user } = ctx;
    renderSidebar(player);
    window.NC_UI?.updateHP(player);
    window.NC_UI?.attachRegenCountdowns();
    renderStats(player);
    updateEstimate(player);

    document.getElementById('btn-train').addEventListener('click', async () => {
      const last = document.getElementById('last-result');
      last.textContent = '';
      try {
        const result = await train(player, user);
        player = result.player;
  renderSidebar(player);
  window.NC_UI?.updateHP(player);
        renderStats(player);
        last.textContent = `Trained ${pickStat()}! Remaining energy: ${player.energyStats.energy}.`;
        updateEstimate(player);
      } catch (err) {
        last.textContent = err.message;
      }
    });

    document.getElementById('energy').addEventListener('input', () => updateEstimate(player));
    document.querySelectorAll('input[name="stat"]').forEach(r => r.addEventListener('change', () => updateEstimate(player)));
  });
})();
