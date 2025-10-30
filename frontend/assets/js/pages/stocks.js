(() => {
  const { get, post } = window.NC_API;
  const { ensureAuth } = window.NC_UTILS;
  let currentSymbol = 'NIZZ';
  let chart;

  function fmt(n, maxFrac = 2) { return Number(n||0).toLocaleString(undefined, { maximumFractionDigits: maxFrac }); }
  function signClass(v) { return v >= 0 ? 'chg-up' : 'chg-down'; }

  let allStocks = [];
  async function loadList() {
    allStocks = await get('/stocks');
    renderTable();
  }

  function renderTable() {
    const tbody = document.getElementById('stock-table-body');
    const filter = (document.getElementById('stock-filter')?.value || '').trim().toLowerCase();
    tbody.innerHTML = '';
    let rows = allStocks;
    if (filter) {
      rows = rows.filter(s => s.symbol.toLowerCase().includes(filter) || (s.name||'').toLowerCase().includes(filter));
    }
    // Sort by absolute % change desc to surface movers
    rows = rows.slice().sort((a,b) => Math.abs(b.changePct||0) - Math.abs(a.changePct||0));
    rows.forEach(s => {
      const tr = document.createElement('tr');
      if (s.symbol === currentSymbol) tr.classList.add('selected');
      tr.innerHTML = `
        <td>${s.symbol}</td>
        <td>${s.name}</td>
        <td class="u-text-right">$${fmt(s.price, s.decimals || 2)}</td>
        <td class="u-text-right ${signClass(s.change)}">${s.change>=0?'+':''}${fmt(s.change, s.decimals || 2)}</td>
        <td class="u-text-right ${signClass(s.changePct)}">${s.changePct>=0?'+':''}${fmt(s.changePct, 2)}%</td>
      `;
      tr.addEventListener('click', async () => {
        currentSymbol = s.symbol;
        renderTable();
        await selectSymbol(s.symbol);
      });
      tbody.appendChild(tr);
    });
  }

  let currentDecimals = 2;
  function timeUnitFor(range){
    switch(range){
      case '1d': return 'hour';
      case '7d': return 'day';
      case '30d': return 'day';
      case '90d': return 'week';
      default: return 'day';
    }
  }

  async function drawChart(symbol, range) {
    const data = await get(`/stocks/${symbol}?range=${range}`);
    currentDecimals = data.decimals || 2;
    document.getElementById('detail-title').textContent = `${data.name} (${symbol}) — $${fmt(data.price, currentDecimals)}`;
    // Build a clean, sorted series and guard against undefined points
    const series = (data.history||[])
      .map(p => ({ x: new Date(p.ts), y: Number(p.price) }))
      .filter(pt => pt.x instanceof Date && !isNaN(pt.x) && Number.isFinite(pt.y))
      .sort((a,b) => a.x - b.x);
    const ctx = document.getElementById('chart').getContext('2d');
    if (chart) chart.destroy();
    if (!series.length) {
      // Nothing to plot yet; leave the canvas empty without initializing Chart.js
      return;
    }
    chart = new Chart(ctx, {
      type: 'line',
      data: {
        datasets: [{
          label: symbol,
          data: series,
          borderColor: '#2563eb',
          borderWidth: 2,
          tension: 0.2,
          pointRadius: 0,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 150 },
        normalized: true,
        plugins: {
          legend: { display: false },
          tooltip: {
            mode: 'index', intersect: false,
            callbacks: {
              label(ctx){
                const v = ctx.parsed.y;
                return ` $${fmt(v, currentDecimals)}`;
              },
              title(items){
                if (!items || !items.length) return '';
                const d = items[0].parsed.x;
                try { return new Date(d).toLocaleString(); } catch { return ''; }
              }
            }
          }
        },
        scales: {
          x: {
            type: 'time',
            time: { unit: timeUnitFor(range) },
            grid: { color: 'rgba(0,0,0,0.04)' },
            ticks: { maxTicksLimit: 7 }
          },
          y: {
            beginAtZero: false,
            grid: { color: 'rgba(0,0,0,0.06)' },
            ticks: {
              callback: (v) => `$${fmt(v, currentDecimals)}`
            }
          }
        }
      }
    });
  }

  async function loadPortfolio(user) {
    const out = document.getElementById('portfolio');
    out.innerHTML = 'Loading…';
    try {
      const data = await get(`/stocks/portfolio/${user._id}`);
      out.innerHTML = '';
      if (!data.holdings.length) { out.textContent = 'No holdings yet.'; return; }
      data.holdings.forEach(h => {
        const el = document.createElement('div');
        el.className = 'holding';
        const gain = (h.currentPrice - h.avgPrice) * h.shares;
        el.innerHTML = `
          <div class="head">
            <div><strong>${h.symbol}</strong> — ${fmt(h.shares)} shares</div>
            <div class="${signClass(gain)}">${gain>=0?'+':''}${fmt(gain)}</div>
          </div>
          <div>Avg Price: $${fmt(h.avgPrice)}</div>
          <div>Current: $${fmt(h.currentPrice)} • Value: $${fmt(h.value)}</div>
        `;
        out.appendChild(el);
      });
    } catch (e) { out.textContent = e.message; }
  }

  async function selectSymbol(symbol) {
    currentSymbol = symbol;
    await drawChart(symbol, document.getElementById('range').value);
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
    await loadList();
    await selectSymbol(currentSymbol);
    await loadPortfolio(user);

    document.getElementById('range').addEventListener('change', () => drawChart(currentSymbol, document.getElementById('range').value));
    const filterInput = document.getElementById('stock-filter');
    if (filterInput) filterInput.addEventListener('input', renderTable);
    const msg = document.getElementById('trade-msg');
    const buySell = async (path) => {
      msg.textContent = '';
      try {
        const qty = Math.max(1, parseInt(document.getElementById('shares').value||'1', 10));
        const r = await post(`/stocks/${path}`, { userId: user._id, symbol: currentSymbol, shares: qty });
        msg.textContent = 'Success';
        await loadPortfolio(user);
        await loadList();
        await selectSymbol(currentSymbol);
      } catch (e) { msg.textContent = e.message; }
    };
    document.getElementById('btn-buy').addEventListener('click', () => buySell('buy'));
    document.getElementById('btn-sell').addEventListener('click', () => buySell('sell'));
  });
})();
