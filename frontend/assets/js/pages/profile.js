(() => {
  function q(id){ return document.getElementById(id); }

  function fmtMoney(n){
    try { return new Intl.NumberFormat(undefined, { style:'currency', currency:'USD', maximumFractionDigits: 0 }).format(n||0); }
    catch(_) { return `$${(n||0).toLocaleString()}`; }
  }

  function renderKeyVals(container, obj, labels){
    container.innerHTML = '';
    const grid = document.createElement('div');
    grid.className = 'kv-grid';
    for (const [k, v] of Object.entries(labels)){
      const row = document.createElement('div');
      row.className = 'kv-row';
      const l = document.createElement('div'); l.className = 'k'; l.textContent = v;
      const r = document.createElement('div'); r.className = 'v'; r.textContent = obj?.[k] ?? 0;
      row.appendChild(l); row.appendChild(r);
      grid.appendChild(row);
    }
    container.appendChild(grid);
  }

  function renderHeader(el, p){
    el.innerHTML = '';
    const imgWrap = document.createElement('div');
    const img = document.createElement('img');
    img.className = 'profile-avatar';
    img.alt = 'Profile avatar';
    img.src = 'https://media.istockphoto.com/id/1152265821/vector/person-gray-photo-placeholder-man.jpg?s=170667a&w=0&k=20&c=sDEkzolIkXkZTlDPfoSB9gB8dOlPrLjB54YaZnNJUZc=';
    imgWrap.appendChild(img);

    const info = document.createElement('div');
    const title = document.createElement('div');
    title.className = 'profile-title';
    title.textContent = `${p.name} [${p.id}]${p.npc ? ' (NPC)' : ''}`;
    const sub = document.createElement('div');
    sub.className = 'profile-sub u-mt-8';
    sub.textContent = `${p.gender||'-'} • Level ${p.level} • Age ${p.age}d`;
    const tags = document.createElement('div');
    tags.className = 'profile-tags';
    const mk = (t) => { const s=document.createElement('span'); s.className='profile-tag'; s.textContent=t; return s; };
    tags.appendChild(mk(`Title: ${p.playerTitle}`));
    tags.appendChild(mk(`Status: ${p.playerStatus}`));
    tags.appendChild(mk(`Role: ${p.playerRole}`));

    info.appendChild(title); info.appendChild(sub); info.appendChild(tags);
    el.appendChild(imgWrap); el.appendChild(info);
  }

  function renderVitals(el, v){
    el.innerHTML = '';
    const mk = (label, cur, max) => {
      const wrap = document.createElement('div');
      wrap.className = 'stat-row';
      const l = document.createElement('div'); l.className = 'stat-label'; l.innerHTML = `<span>${label}</span><span>${cur}/${max}</span>`;
      const bar = document.createElement('div');
      bar.className = 'stat-bar';
      const fill = document.createElement('div');
      const pct = max ? Math.max(0, Math.min(100, Math.round((cur/max)*100))) : 0;
      fill.style.width = pct + '%';
      fill.className = 'stat-bar-fill';
      bar.appendChild(fill); wrap.appendChild(l); wrap.appendChild(bar);
      return wrap;
    };
    el.appendChild(mk('Health', v.health||0, 100));
    el.appendChild(mk('Energy', v.energy||0, v.energyMax||0));
    el.appendChild(mk('Nerve', v.nerve||0, v.nerveMax||0));
    el.appendChild(mk('Happy', v.happy||0, v.happyMax||0));
  }

  function renderFinances(el, f){
    el.innerHTML = '';
    const pairs = [
      ['Cash', fmtMoney(f.money||0)],
      ['Bank (locked)', fmtMoney(f.bankLocked||0)],
      ['Portfolio', fmtMoney(f.portfolioValue||0)],
      ['Net Worth', fmtMoney(f.netWorth||0)],
    ];
    for (const [k,v] of pairs){
      const row = document.createElement('div'); row.className = 'fin-row';
      const l = document.createElement('div'); l.textContent = k;
      const r = document.createElement('div'); r.textContent = v;
      row.appendChild(l); row.appendChild(r); el.appendChild(row);
    }
  }

  function renderPortfolio(el, holdings){
    el.innerHTML = '';
    const head = document.createElement('div'); head.className = 'port-head u-mb-6';
    head.innerHTML = '<div>Symbol</div><div>Shares</div><div>Avg</div><div>Price</div><div>Value</div>';
    el.appendChild(head);
    (holdings||[]).forEach(h => {
      const row = document.createElement('div');
      row.className = 'port-row u-mb-4';
      const cells = [h.symbol, h.shares, `$${h.avgPrice}`, `$${h.currentPrice}`, fmtMoney(h.value)];
      cells.forEach(c => { const d=document.createElement('div'); d.textContent = c; row.appendChild(d); });
      el.appendChild(row);
    });
    if (!holdings || holdings.length === 0){
      const empty = document.createElement('div'); empty.className='port-empty'; empty.textContent = 'No holdings';
      el.appendChild(empty);
    }
  }

  function compact(n){
    if (n === null || n === undefined) return '0';
    const abs = Math.abs(n);
    if (abs >= 1e12) return (n/1e12).toFixed(2)+'T';
    if (abs >= 1e9) return (n/1e9).toFixed(2)+'B';
    if (abs >= 1e6) return (n/1e6).toFixed(2)+'M';
    if (abs >= 1e3) return (n/1e3).toFixed(2)+'K';
    return String(Math.round(n));
  }

  function renderGrowthChart(ctx, history){
    const labels = history.points.map(p => {
      const d = new Date(p.ts);
      return d.toLocaleDateString(undefined, { month:'short', day:'numeric' }) + ' ' + d.toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'});
    });
    const net = history.points.map(p => p.netWorth||0);
    const battle = history.points.map(p => p.battleTotal||0);
    if (!window.Chart || labels.length === 0){
      ctx.parentElement.innerHTML = '<div class="port-empty">No history yet. Come back later.</div>';
      return;
    }
    const chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          { label: 'Net Worth', data: net, yAxisID: 'yMoney', borderColor: '#2b8a3e', backgroundColor: 'rgba(43,138,62,0.1)', tension: 0.2, pointRadius: 0 },
          { label: 'Battle Total', data: battle, yAxisID: 'yStats', borderColor: '#1c7ed6', backgroundColor: 'rgba(28,126,214,0.1)', tension: 0.2, pointRadius: 0 },
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        scales: {
          x: { grid: { display: false } },
          yMoney: { type: 'linear', position: 'left', ticks: { callback: (v)=>'$'+compact(v) } },
          yStats: { type: 'linear', position: 'right', grid: { drawOnChartArea: false }, ticks: { callback: (v)=>compact(v) } },
        },
        plugins: {
          legend: { position: 'top' },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                if (ctx.dataset.yAxisID === 'yMoney') return `${ctx.dataset.label}: ${fmtMoney(ctx.raw)}`;
                return `${ctx.dataset.label}: ${compact(ctx.raw)}`;
              }
            }
          }
        }
      }
    });
    return chart;
  }

  async function init(){
    if (window.NC_UI?.ensureTopbarInserted) window.NC_UI.ensureTopbarInserted();
    if (window.NC_UI?.refreshTopbarStats) window.NC_UI.refreshTopbarStats();
    const params = new URLSearchParams(window.location.search);
    let id = params.get('id');
    // If id not provided, try to resolve the current logged-in user's player id
    if (!id) {
      try {
        const ctx = await window.NC_UTILS?.ensurePlayerLoaded?.();
        if (ctx?.player?.id) {
          id = String(ctx.player.id);
          const u = new URL(window.location.href);
          u.searchParams.set('id', id);
          window.history.replaceState({}, '', u.toString());
        }
      } catch(_) {}
    }
    if (!id){
      q('profile-title').textContent = 'Profile - Missing id';
      q('profile-header').textContent = 'Open from a link with ?id=<numeric Player.id> or log in to auto-resolve your profile.';
      return;
    }
    try {
      const p = await NC_API.get(`/player/profile/${encodeURIComponent(id)}`);
      q('profile-title').textContent = `Profile: ${p.name} [${p.id}]`;
      renderHeader(q('profile-header'), p);
      renderVitals(q('profile-vitals'), p.vitals||{});
      renderKeyVals(q('profile-battle'), p.battleStats||{}, { strength:'Strength', speed:'Speed', dexterity:'Dexterity', defense:'Defense' });
      renderKeyVals(q('profile-work'), p.workStats||{}, { manuallabor:'Manual Labor', intelligence:'Intelligence', endurance:'Endurance', employeEfficiency:'Efficiency' });
      renderFinances(q('profile-finances'), p.finances||{});
      renderPortfolio(q('profile-portfolio'), (p.finances||{}).holdings||[]);

      // History chart (last 30 days by default)
      try {
        const history = await NC_API.get(`/player/profile/${encodeURIComponent(id)}/history?days=30`);
        const canvas = document.getElementById('profile-growth-chart');
        renderGrowthChart(canvas.getContext('2d'), history);
      } catch(e){
        const canvas = document.getElementById('profile-growth-chart');
        const holder = canvas.parentElement;
        holder.innerHTML = `<div class="port-empty">No history yet or failed to load (${e.status||''} ${e.message||e}). Try again later.</div>`;
      }
    } catch (e){
      q('profile-header').textContent = `Failed to load profile: ${e.message||e}`;
    }
  }

  window.addEventListener('DOMContentLoaded', init);
})();
