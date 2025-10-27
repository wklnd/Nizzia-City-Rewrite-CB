(() => {
  const { get, post } = window.NC_API;
  const { ensureAuth } = window.NC_UTILS;
  let currentSymbol = 'NIZZ';
  let chart;

  function fmt(n) { return Number(n||0).toLocaleString(undefined, { maximumFractionDigits: 2 }); }
  function signClass(v) { return v >= 0 ? 'chg-up' : 'chg-down'; }

  async function loadList() {
    const list = await get('/stocks');
    const wrap = document.getElementById('stock-list');
    wrap.innerHTML = '';
    list.forEach(s => {
      const card = document.createElement('div');
      card.className = 'stock-card';
      card.innerHTML = `
        <div class="name">${s.name}</div>
        <div class="symbol">${s.symbol}</div>
        <div class="price">$${fmt(s.price)}</div>
        <div class="change ${signClass(s.change)}">${signClass(s.change) === 'chg-up' ? '+' : ''}${fmt(s.change)} (${fmt(s.changePct)}%)</div>
      `;
      card.addEventListener('click', () => selectSymbol(s.symbol));
      wrap.appendChild(card);
    });
  }

  async function drawChart(symbol, range) {
    const data = await get(`/stocks/${symbol}?range=${range}`);
    document.getElementById('detail-title').textContent = `${data.name} (${symbol}) — $${fmt(data.price)}`;
    const labels = data.history.map(p => {
      const d = new Date(p.ts);
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      const m = d.getMonth()+1, day = d.getDate();
      // compact label: M/D HH:MM
      return `${m}/${day} ${hh}:${mm}`;
    });
    const prices = data.history.map(p => p.price);
    const ctx = document.getElementById('chart').getContext('2d');
    if (chart) chart.destroy();
    chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: symbol,
          data: prices,
          fill: false,
          borderColor: '#4caf50',
          tension: 0.1,
          pointRadius: 0
        }]
      },
      options: {
        responsive: true,
        scales: { y: { beginAtZero: false } },
        plugins: { legend: { display: false } }
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
    const user = await ensureAuth();
    if (!user) return;
    await loadList();
    await selectSymbol(currentSymbol);
    await loadPortfolio(user);

    document.getElementById('range').addEventListener('change', () => drawChart(currentSymbol, document.getElementById('range').value));
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
