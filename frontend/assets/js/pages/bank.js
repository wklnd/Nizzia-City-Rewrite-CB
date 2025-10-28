(function(){
  const { get, post } = window.NC_API;
  const { ensurePlayerLoaded, setPlayer, fmtMoney, fmtInt } = window.NC_UTILS;

  const PERIOD_LABELS = { '1w': '1 Week', '2w': '2 Weeks', '1m': '1 Month', '3m': '3 Months', '6m': '6 Months' };

  function renderSidebar(player){
    document.getElementById('ui-name').textContent = `Name: ${player.name}`;
    document.getElementById('ui-money').textContent = `Money: ${fmtMoney(player.money)}`;
  }

  function pct(n){ return (Number(n||0)*100).toFixed(2) + '%'; }
  function fmtDate(d){
    const dt = new Date(d);
    try {
      return dt.toLocaleString(undefined, {
        year: 'numeric', month: 'short', day: '2-digit',
        hour: '2-digit', minute: '2-digit', hour12: false
      });
    } catch(_) {
      // Fallback ISO-like without seconds
      const y = dt.getFullYear();
      const m = String(dt.getMonth()+1).padStart(2,'0');
      const da = String(dt.getDate()).padStart(2,'0');
      const h = String(dt.getHours()).padStart(2,'0');
      const mi = String(dt.getMinutes()).padStart(2,'0');
      return `${y}-${m}-${da} ${h}:${mi}`;
    }
  }

  function renderRates(data){
    const box = document.getElementById('rates');
    box.innerHTML = '';
    const rates = data?.rates || {};
    const rows = Object.keys(rates).map(k => {
      const item = document.createElement('div');
      item.className = 'rate-item';
      item.innerHTML = `<div class="label">${PERIOD_LABELS[k]||k}</div><div class="val">${pct(rates[k])} APR</div>`;
      return item;
    });
    rows.forEach(r => box.appendChild(r));
    const up = document.getElementById('rates-updated');
    up.textContent = data?.updatedAt ? `Updated: ${fmtDate(data.updatedAt)}` : '';
  }

  const PERIODS = { '1w': 7, '2w': 14, '1m': 30, '3m': 90, '6m': 180 };
  function calcProjection(amount, apr, periodKey){
    const days = PERIODS[periodKey] || 0;
    const interest = amount * apr * (days/365);
    const total = amount + interest;
    return { interest: Math.max(0, Math.round(interest*100)/100), total: Math.max(0, Math.round(total*100)/100) };
  }

  function renderProjections(rates){
    const box = document.getElementById('projections');
    if (!box) return;
    const amount = Math.max(0, Math.floor(Number(document.getElementById('amount').value || 0)));
    box.innerHTML = '';
    if (!amount) { box.innerHTML = '<div class="muted">Enter an amount to see projections.</div>'; return; }
    Object.keys(PERIODS).forEach(key => {
      const r = rates[key];
      if (typeof r !== 'number') return;
      const { interest, total } = calcProjection(amount, r, key);
      const row = document.createElement('div');
      row.className = 'proj-row';
      row.innerHTML = `<div class="proj-term">${PERIOD_LABELS[key]} @ ${pct(r)}</div><div class="proj-val">$${fmtInt(total)} <span class="muted">(+${fmtInt(interest)})</span></div>`;
      box.appendChild(row);
    });
  }

  function renderAccounts(accounts){
    const box = document.getElementById('accounts');
    box.innerHTML = '';
    if (!accounts || accounts.length === 0) {
      box.textContent = 'No active or past investments yet.';
      return;
    }
    let hasActive = false;
    for (const a of accounts){
      const isMature = new Date(a.endDate) <= new Date();
      const status = a.isWithdrawn ? 'Withdrawn' : (isMature ? 'Matured' : 'Locked');
      if (!a.isWithdrawn && !isMature) hasActive = true;
      const card = document.createElement('div');
      card.className = 'account-row';
      card.innerHTML = `
        <div>
          <div><strong>${PERIOD_LABELS[a.period]||a.period}</strong> • ${pct(a.interestRate)} APR</div>
          <div class="muted">Amount: $${fmtInt(a.depositedAmount)} • Start: ${fmtDate(a.startDate)} • End: ${fmtDate(a.endDate)}</div>
        </div>
        <div>
          <span class="badge ${status.toLowerCase()}">${status}</span>
          ${(!a.isWithdrawn && isMature) ? `<button class="btn-withdraw" data-id="${a._id}">Withdraw</button>` : ''}
        </div>
      `;
      box.appendChild(card);
    }

    const warn = document.getElementById('active-warning');
    const depositBtn = document.getElementById('btn-deposit');
    const amountEl = document.getElementById('amount');
    const periodEl = document.getElementById('period');
    if (hasActive) {
      warn.className = 'alert info';
      warn.textContent = 'You already have an active investment. You can withdraw at maturity, then create a new one.';
      if (depositBtn) depositBtn.disabled = true;
      if (amountEl) amountEl.disabled = true;
      if (periodEl) periodEl.disabled = true;
    } else {
      warn.classList.add('hidden');
      if (depositBtn) depositBtn.disabled = false;
      if (amountEl) amountEl.disabled = false;
      if (periodEl) periodEl.disabled = false;
    }

    box.querySelectorAll('.btn-withdraw').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        await doWithdraw(id);
      });
    });
  }

  async function refreshAll(ctx){
    const { user } = ctx;
    const rates = await get('/bank/rates');
    renderRates(rates);
    renderProjections(rates.rates || {});
    const list = await get(`/bank/accounts/${user._id}`);
    renderAccounts(list.accounts);
  }

  async function doDeposit(ctx){
    const { user, player } = ctx;
    const amount = Math.floor(Number(document.getElementById('amount').value || 0));
    const period = document.getElementById('period').value;
    const msg = document.getElementById('deposit-msg');
    msg.textContent = '';
    try {
      const res = await post('/bank/deposit', { userId: user._id, amount, period });
      player.money = res.money;
      setPlayer(player);
      renderSidebar(player);
      await refreshAll(ctx);
      msg.textContent = 'Deposit successful';
    } catch (e) { msg.textContent = e.message; }
  }

  async function doWithdraw(accountId){
    const ctx = await window._bankCtx; // use cached from load
    const { user, player } = ctx;
    try {
      const res = await post('/bank/withdraw', { userId: user._id, accountId });
      player.money = res.money;
      setPlayer(player);
      renderSidebar(player);
      await refreshAll(ctx);
    } catch (e) {
      alert(e.message);
    }
  }

  document.addEventListener('DOMContentLoaded', async () => {
    window.NC_UI?.init();
    const ctx = await ensurePlayerLoaded();
    if (!ctx) return;
    window._bankCtx = Promise.resolve(ctx);
    renderSidebar(ctx.player);
    window.NC_UI?.updateHP(ctx.player);
    await refreshAll(ctx);
    document.getElementById('btn-deposit').addEventListener('click', () => doDeposit(ctx));
    document.getElementById('amount').addEventListener('input', async () => {
      try { const { rates } = await get('/bank/rates'); renderProjections(rates || {}); } catch(_){}
    });
    document.getElementById('period').addEventListener('change', async () => {
      try { const { rates } = await get('/bank/rates'); renderProjections(rates || {}); } catch(_){}
    });
  });
})();
