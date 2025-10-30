(() => {
  const richestEl = document.getElementById('hof-richest');
  const battleEl = document.getElementById('hof-battle');
  const workEl = document.getElementById('hof-work');

  function headerRow(cols){
    const div = document.createElement('div');
    div.className = 'u-flex u-justify-between u-align-center hof-header';
    cols.forEach((c, i) => {
      const span = document.createElement('div');
      span.className = 'hof-col' + (i===0 ? ' rank' : i===1 ? ' player' : ' value');
      span.textContent = c;
      div.appendChild(span);
    });
    return div;
  }

  function entryRow({ rank, playerHtml, valueHtml, subHtml }){
    const div = document.createElement('div');
    div.className = 'u-flex u-justify-between u-align-center card hof-row';
    // rank
    const r = document.createElement('div');
    r.className = 'hof-col rank';
    const badge = document.createElement('span');
    badge.className = `hof-rank ${rank===1?'hof-rank-1':rank===2?'hof-rank-2':rank===3?'hof-rank-3':''}`;
    badge.textContent = `#${rank}`;
    r.appendChild(badge);
    // player
    const p = document.createElement('div');
    p.className = 'hof-col player hof-player';
    p.innerHTML = playerHtml;
    // value
    const v = document.createElement('div');
    v.className = 'hof-col value';
    v.innerHTML = valueHtml || '';
    // optional sub
    if (subHtml) {
      const s = document.createElement('div');
      s.className = 'hof-col sub';
      s.innerHTML = subHtml;
      div.appendChild(r); div.appendChild(p); div.appendChild(v); div.appendChild(s);
    } else {
      div.appendChild(r); div.appendChild(p); div.appendChild(v);
    }
    return div;
  }

  function fmtMoney(n){
    try { return new Intl.NumberFormat(undefined, { style:'currency', currency:'USD', maximumFractionDigits: 0 }).format(n); }
    catch(_) { return `$${(n||0).toLocaleString()}`; }
  }

  async function init(){
    // Ensure topbar and HP are visible
    if (window.NC_UI?.ensureTopbarInserted) window.NC_UI.ensureTopbarInserted();
    if (window.NC_UI?.refreshTopbarStats) window.NC_UI.refreshTopbarStats();

    try {
      const data = await NC_API.get('/hof?limit=25');
      // Richest
      richestEl.innerHTML = '';
      richestEl.appendChild(headerRow(['Rank','Player','Net Worth']));
      if (!data.richest || data.richest.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'card u-p-8 hof-empty';
        empty.textContent = 'No entries yet.';
        richestEl.appendChild(empty);
      }
      (data.richest||[]).forEach(r => {
        const playerHtml = `<a href="profile.html?id=${encodeURIComponent(r.id)}">${r.name} [${r.id}]</a>`;
        const valueHtml = `${fmtMoney(r.netWorth||0)}`;
        richestEl.appendChild(entryRow({ rank: r.rank, playerHtml, valueHtml }));
      });

      // Battle
      battleEl.innerHTML = '';
      battleEl.appendChild(headerRow(['Rank','Player','Total','(STR / SPD / DEX / DEF)']))
      if (!data.battle || data.battle.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'card u-p-8 hof-empty';
        empty.textContent = 'No entries yet.';
        battleEl.appendChild(empty);
      }
      (data.battle||[]).forEach(r => {
        const b = r.battle || {}; 
        const parts = [b.strength||0, b.speed||0, b.dexterity||0, b.defense||0].join(' / ');
        const playerHtml = `<a href="profile.html?id=${encodeURIComponent(r.id)}">${r.name} [${r.id}]</a>`;
        const valueHtml = `${r.total||0}`;
        const subHtml = parts;
        battleEl.appendChild(entryRow({ rank: r.rank, playerHtml, valueHtml, subHtml }));
      });

      // Work
      workEl.innerHTML = '';
      workEl.appendChild(headerRow(['Rank','Player','Total','(LAB / INT / END / EFF)']))
      if (!data.work || data.work.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'card u-p-8 hof-empty';
        empty.textContent = 'No entries yet.';
        workEl.appendChild(empty);
      }
      (data.work||[]).forEach(r => {
        const w = r.work || {}; 
        const parts = [w.manuallabor||0, w.intelligence||0, w.endurance||0, w.employeEfficiency||0].join(' / ');
        const playerHtml = `<a href="profile.html?id=${encodeURIComponent(r.id)}">${r.name} [${r.id}]</a>`;
        const valueHtml = `${r.total||0}`;
        const subHtml = parts;
        workEl.appendChild(entryRow({ rank: r.rank, playerHtml, valueHtml, subHtml }));
      });
    } catch (e){
      richestEl.textContent = battleEl.textContent = workEl.textContent = `Failed to load Hall of Fame: ${e.message||e}`;
    }
  }

  window.addEventListener('DOMContentLoaded', init);
})();
