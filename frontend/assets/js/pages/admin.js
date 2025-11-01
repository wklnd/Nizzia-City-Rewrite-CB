// Use global NC_API provided by assets/js/api.js
const NC_API = window.NC_API;

// Simple debounce utility
function debounce(fn, wait = 300) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

function getIds() {
  const targetUserId = document.getElementById('targetUserId').value.trim();
  if (!targetUserId) throw new Error('Please load/select a target player first');
  return { targetUserId };
}

function getAdminUserId(){
  return document.getElementById('adminUserId').value.trim();
}

function loadSavedIds(){
  const a = localStorage.getItem('nc_admin_uid');
  const t = localStorage.getItem('nc_target_uid');
  const pid = localStorage.getItem('nc_target_pid');
  if (a) document.getElementById('adminUserId').value = a;
  if (t) document.getElementById('targetUserId').value = t;
  if (pid) document.getElementById('targetPlayerId').value = pid;
}

async function applyCurrency(){
  const { targetUserId } = getIds();
  const adminUserId = getAdminUserId();
  const payload = {
    ...(adminUserId ? { adminUserId } : {}),
    targetUserId,
    moneyDelta: Number(document.getElementById('moneyDelta').value || 0),
    pointsDelta: Number(document.getElementById('pointsDelta').value || 0),
    meritsDelta: Number(document.getElementById('meritsDelta').value || 0),
    xmasCoinsDelta: Number(document.getElementById('xmasDelta').value || 0),
    halloweenCoinsDelta: Number(document.getElementById('halloweenDelta').value || 0),
    easterCoinsDelta: Number(document.getElementById('easterDelta').value || 0),
  };
  const res = await NC_API.patch('/admin/currency', payload);
  alert('Updated: ' + JSON.stringify(res));
}

async function applyExp(){
  const { targetUserId } = getIds();
  const adminUserId = getAdminUserId();
  const expDelta = Number(document.getElementById('expDelta').value || 0);
  const res = await NC_API.patch('/admin/xp', { ...(adminUserId ? { adminUserId } : {}), targetUserId, expDelta });
  alert('Exp: ' + JSON.stringify(res));
}

async function applyLevel(){
  const { targetUserId } = getIds();
  const adminUserId = getAdminUserId();
  const level = Number(document.getElementById('levelSet').value || 1);
  const res = await NC_API.patch('/admin/level', { ...(adminUserId ? { adminUserId } : {}), targetUserId, level });
  alert('Level: ' + JSON.stringify(res));
}

async function applyResources(){
  const { targetUserId } = getIds();
  const adminUserId = getAdminUserId();
  const energyDelta = Number(document.getElementById('energyDelta').value || 0);
  const nerveDelta = Number(document.getElementById('nerveDelta').value || 0);
  const happyDelta = Number(document.getElementById('happyDelta').value || 0);
  const res = await NC_API.patch('/admin/resources', { ...(adminUserId ? { adminUserId } : {}), targetUserId, energyDelta, nerveDelta, happyDelta });
  alert('Resources: ' + JSON.stringify(res));
}

async function invAdd(){
  const { targetUserId } = getIds();
  const adminUserId = getAdminUserId();
  const itemId = document.getElementById('invItemId').value.trim();
  const qty = Number(document.getElementById('invQty').value || 1);
  const res = await NC_API.post('/admin/inventory/add', { ...(adminUserId ? { adminUserId } : {}), targetUserId, itemId, qty });
  document.getElementById('invStatus').textContent = 'Inventory: ' + JSON.stringify(res);
}
async function invRemove(){
  const { targetUserId } = getIds();
  const adminUserId = getAdminUserId();
  const itemId = document.getElementById('invItemId').value.trim();
  const qty = Number(document.getElementById('invQty').value || 1);
  const res = await NC_API.post('/admin/inventory/remove', { ...(adminUserId ? { adminUserId } : {}), targetUserId, itemId, qty });
  document.getElementById('invStatus').textContent = 'Inventory: ' + JSON.stringify(res);
}

async function createItem(){
  const payload = {
    name: document.getElementById('itemName').value.trim(),
    type: document.getElementById('itemType').value,
    id: Number(document.getElementById('itemIdInt').value || 0),
    description: document.getElementById('itemDesc').value,
    price: Number(document.getElementById('itemPrice').value || 0),
    sellable: document.getElementById('itemSellable').value === 'true',
    usable: document.getElementById('itemUsable').value === 'true',
  };
  const res = await NC_API.post('/items/create', payload);
  document.getElementById('createItemStatus').textContent = 'Created: ' + JSON.stringify(res);
}

async function stockAdd(){
  const { targetUserId } = getIds();
  const adminUserId = getAdminUserId();
  const symbol = document.getElementById('stockSymbol').value.trim().toUpperCase();
  const shares = Number(document.getElementById('stockShares').value || 1);
  const avgPriceVal = document.getElementById('stockAvgPrice').value;
  const avgPrice = avgPriceVal ? Number(avgPriceVal) : undefined;
  const res = await NC_API.post('/admin/stocks/add', { ...(adminUserId ? { adminUserId } : {}), targetUserId, symbol, shares, avgPrice });
  alert('Portfolio: ' + JSON.stringify(res));
}
async function stockRemove(){
  const { targetUserId } = getIds();
  const adminUserId = getAdminUserId();
  const symbol = document.getElementById('stockSymbol').value.trim().toUpperCase();
  const shares = Number(document.getElementById('stockShares').value || 1);
  const res = await NC_API.post('/admin/stocks/remove', { ...(adminUserId ? { adminUserId } : {}), targetUserId, symbol, shares });
  alert('Portfolio: ' + JSON.stringify(res));
}

async function stockCrash(){
  const adminUserId = getAdminUserId();
  if (!adminUserId) throw new Error('Fill Admin userId');
  const symbol = document.getElementById('stockSymbol').value.trim().toUpperCase();
  const body = { adminUserId };
  if (symbol) body.symbol = symbol;
  const res = await NC_API.post('/admin/stocks/crash', body);
  alert('Crash applied: ' + JSON.stringify(res));
}

async function stockRocket(){
  const adminUserId = getAdminUserId();
  if (!adminUserId) throw new Error('Fill Admin userId');
  const symbol = document.getElementById('stockSymbol').value.trim().toUpperCase();
  const body = { adminUserId };
  if (symbol) body.symbol = symbol;
  const res = await NC_API.post('/admin/stocks/rocket', body);
  alert('Rocket applied: ' + JSON.stringify(res));
}

// Backfill removed from Admin UI; use CLI tool instead.

async function loadAccounts(){
  const { targetUserId } = getIds();
  const data = await NC_API.get(`/bank/accounts/${encodeURIComponent(targetUserId)}`);
  const list = document.getElementById('bankList');
  list.innerHTML = '';
  (data.accounts || []).forEach(ac => {
    const el = document.createElement('div');
    el.style.display = 'flex'; el.style.justifyContent = 'space-between'; el.style.alignItems = 'center';
    el.style.padding = '6px 0';
    const left = document.createElement('div');
    left.textContent = `${ac._id} | principal $${ac.depositedAmount} | APR ${ac.interestRate}% | ${ac.period} | start ${new Date(ac.startDate).toLocaleString()} | end ${new Date(ac.endDate).toLocaleString()} | withdrawn ${ac.isWithdrawn}`;
    const btn = document.createElement('button');
    btn.textContent = 'Force Withdraw';
    btn.disabled = !!ac.isWithdrawn;
    btn.addEventListener('click', async () => {
      try {
        const targetUserId = document.getElementById('targetUserId').value.trim();
        const adminUserId = getAdminUserId();
        const res = await NC_API.post('/admin/bank/force-withdraw', { ...(adminUserId ? { adminUserId } : {}), targetUserId, accountId: ac._id });
        alert('Payout: ' + JSON.stringify(res));
        await loadAccounts();
      } catch (e) { alert('Error: ' + (e.message||e)); }
    });
    el.appendChild(left); el.appendChild(btn); list.appendChild(el);
  });
}

function init(){
  loadSavedIds();
  // Fetch titles for moderation dropdown
  loadTitles().catch(()=>{});
  // Load player by numeric id, auto-populate targetUserId and render profile
  document.getElementById('loadPlayer').addEventListener('click', () => loadPlayer().catch(e=>alert(e.message||e)));
  const searchInput = document.getElementById('searchQuery');
  const debouncedSearch = debounce(() => {
    if (!searchInput.value.trim()) {
      const list = document.getElementById('searchResults');
      list.innerHTML = '';
      return;
    }
    searchPlayers().catch(e=>{/* silent during typing */});
  }, 350);
  document.getElementById('saveIds').addEventListener('click', () => {
    localStorage.setItem('nc_admin_uid', document.getElementById('adminUserId').value.trim());
    const t = document.getElementById('targetUserId').value.trim();
    if (t) localStorage.setItem('nc_target_uid', t);
    const pid = document.getElementById('targetPlayerId').value.trim();
    if (pid) localStorage.setItem('nc_target_pid', pid);
    alert('Saved');
  });
  document.getElementById('searchBtn').addEventListener('click', () => searchPlayers().catch(e=>alert(e.message||e)));
  searchInput.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') {
      searchPlayers().catch(e=>alert(e.message||e));
    } else {
      debouncedSearch();
    }
  });
  searchInput.addEventListener('input', () => debouncedSearch());
  document.getElementById('applyCurrency').addEventListener('click', () => applyCurrency().catch(e=>alert(e.message||e)));
  document.getElementById('applyExp').addEventListener('click', () => applyExp().catch(e=>alert(e.message||e)));
  document.getElementById('applyLevel').addEventListener('click', () => applyLevel().catch(e=>alert(e.message||e)));
  document.getElementById('applyResources').addEventListener('click', () => applyResources().catch(e=>alert(e.message||e)));
  document.getElementById('invAdd').addEventListener('click', () => invAdd().catch(e=>alert(e.message||e)));
  document.getElementById('invRemove').addEventListener('click', () => invRemove().catch(e=>alert(e.message||e)));
  document.getElementById('createItem').addEventListener('click', () => createItem().catch(e=>alert(e.message||e)));
  document.getElementById('stockAdd').addEventListener('click', () => stockAdd().catch(e=>alert(e.message||e)));
  document.getElementById('stockRemove').addEventListener('click', () => stockRemove().catch(e=>alert(e.message||e)));
  const sCrash = document.getElementById('stockCrash');
  if (sCrash) sCrash.addEventListener('click', () => stockCrash().catch(e=>alert(e.message||e)));
  const sRocket = document.getElementById('stockRocket');
  if (sRocket) sRocket.addEventListener('click', () => stockRocket().catch(e=>alert(e.message||e)));
  // Backfill removed; see backend/tools/stocks/backfill.js CLI tool.
  document.getElementById('loadAccounts').addEventListener('click', () => loadAccounts().catch(e=>alert(e.message||e)));
  // General bulk actions
  const gEM = document.getElementById('generalEnergyMax');
  if (gEM) gEM.addEventListener('click', () => generalEnergyMax().catch(e=>alert(e.message||e)));
  const gGM = document.getElementById('generalGiveMoney');
  if (gGM) gGM.addEventListener('click', () => generalGiveMoney().catch(e=>alert(e.message||e)));
  // Moderation
  const aS = document.getElementById('applyStatus'); if (aS) aS.addEventListener('click', ()=> applyStatus().catch(e=>alert(e.message||e)));
  const aR = document.getElementById('applyRole'); if (aR) aR.addEventListener('click', ()=> applyRole().catch(e=>alert(e.message||e)));
  const aT = document.getElementById('applyTitle'); if (aT) aT.addEventListener('click', ()=> applyTitle().catch(e=>alert(e.message||e)));
  // Cooldowns
  const cdL = document.getElementById('cdLoad'); if (cdL) cdL.addEventListener('click', ()=> cdLoad().catch(e=>alert(e.message||e)));
  const cdSD = document.getElementById('cdSetDrug'); if (cdSD) cdSD.addEventListener('click', ()=> cdSet('drug').catch(e=>alert(e.message||e)));
  const cdSM = document.getElementById('cdSetMedical'); if (cdSM) cdSM.addEventListener('click', ()=> cdSet('medical').catch(e=>alert(e.message||e)));
  const cdSB = document.getElementById('cdSetBooster'); if (cdSB) cdSB.addEventListener('click', ()=> cdSet('booster').catch(e=>alert(e.message||e)));
  const cdSA = document.getElementById('cdSetAlcohol'); if (cdSA) cdSA.addEventListener('click', ()=> cdSet('alcohol').catch(e=>alert(e.message||e)));
  const cdCA = document.getElementById('cdClearAll'); if (cdCA) cdCA.addEventListener('click', ()=> cdClear('all').catch(e=>alert(e.message||e)));
  const cdRA = document.getElementById('cdResetAll'); if (cdRA) cdRA.addEventListener('click', ()=> cdResetAll().catch(e=>alert(e.message||e)));
  // Database purge
  const dbP = document.getElementById('dbPurge'); if (dbP) dbP.addEventListener('click', ()=> dbPurge().catch(e=>alert(e.message||e)));
}

document.addEventListener('DOMContentLoaded', init);

async function searchPlayers(){
  const q = document.getElementById('searchQuery').value.trim();
  if (!q) {
    const list = document.getElementById('searchResults');
    list.innerHTML = '';
    return;
  }
  const adminUserId = getAdminUserId();
  const param = adminUserId ? `&adminUserId=${encodeURIComponent(adminUserId)}` : '';
  const data = await NC_API.get(`/admin/players/search?q=${encodeURIComponent(q)}${param}`);
  const list = document.getElementById('searchResults');
  list.innerHTML = '';
  (data.results||[]).forEach(p => {
    const row = document.createElement('div');
    row.style.display='flex'; row.style.justifyContent='space-between'; row.style.alignItems='center'; row.style.padding='6px 0';
    const info = document.createElement('div');
    info.textContent = `userId=${p.userId} | id=${p.id} | name=${p.name} | role=${p.role || 'Player'}${p.npc ? ' | NPC' : ''}`;
    const btn = document.createElement('button');
    btn.textContent = 'Use';
    btn.addEventListener('click', () => {
      document.getElementById('targetUserId').value = p.userId;
      localStorage.setItem('nc_target_uid', p.userId);
      if (p.id) {
        document.getElementById('targetPlayerId').value = p.id;
        localStorage.setItem('nc_target_pid', String(p.id));
      }
    });
    row.appendChild(info); row.appendChild(btn);
    list.appendChild(row);
  });
  if (!data.results || data.results.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'muted';
    empty.textContent = 'No results';
    list.appendChild(empty);
  }
}

// Render a small profile summary
function renderProfileSummary(profile){
  const card = document.getElementById('profileCard');
  const el = document.getElementById('profileSummary');
  if (!profile) {
    card.style.display = 'none';
    el.innerHTML = '';
    return;
  }
  const f = profile.finances || {};
  const vit = profile.vitals || {};
  el.innerHTML = `
    <div><strong>${profile.name}</strong> (id=${profile.id}) ${profile.npc ? '<span class="pill">NPC</span>' : ''}</div>
    <div class="muted" style="margin-top:4px">Status: <strong>${profile.playerStatus}</strong> · Role: <strong>${profile.playerRole}</strong> · Title: <strong>${profile.playerTitle}</strong></div>
    <div class="row" style="margin-top:8px">
      <div>
        <label>Money</label>
        <div>$${Number(f.money||0).toLocaleString()}</div>
      </div>
      <div>
        <label>Bank locked</label>
        <div>$${Number(f.bankLocked||0).toLocaleString()} (${f.bankActiveAccounts||0} active)</div>
      </div>
      <div>
        <label>Portfolio</label>
        <div>$${Number(f.portfolioValue||0).toLocaleString()}</div>
      </div>
      <div>
        <label>Net worth</label>
        <div><strong>$${Number(f.netWorth||0).toLocaleString()}</strong></div>
      </div>
      <div>
        <label>Energy</label>
        <div>${vit.energy||0}/${vit.energyMax||0}</div>
      </div>
      <div>
        <label>Nerve</label>
        <div>${vit.nerve||0}/${vit.nerveMax||0}</div>
      </div>
      <div>
        <label>Happy</label>
        <div>${vit.happy||0}/${vit.happyMax||0}</div>
      </div>
    </div>
  `;
  card.style.display = '';
}

// Load by numeric Player.id: resolve target userId via admin search, then fetch public profile
async function loadPlayer(){
  const adminUserId = document.getElementById('adminUserId').value.trim();
  const playerIdRaw = document.getElementById('targetPlayerId').value.trim();
  const playerId = Number(playerIdRaw);
  if (!adminUserId) throw new Error('Fill Admin userId');
  if (!Number.isFinite(playerId)) throw new Error('Enter a valid numeric player id');

  // Resolve userId via admin search (exact id match)
  const data = await NC_API.get(`/admin/players/search?adminUserId=${encodeURIComponent(adminUserId)}&q=${encodeURIComponent(String(playerId))}&limit=5`);
  const match = (data.results||[]).find(p=> Number(p.id) === playerId);
  if (!match) throw new Error('Player not found');
  document.getElementById('targetUserId').value = match.userId;
  localStorage.setItem('nc_target_uid', match.userId);
  document.getElementById('targetPlayerId').value = String(playerId);
  localStorage.setItem('nc_target_pid', String(playerId));

  // Fetch public profile for quick overview
  const profile = await NC_API.get(`/player/profile/${encodeURIComponent(String(playerId))}`);
  renderProfileSummary(profile);
  // Pre-fill moderation selectors if present
  try {
    const s = document.getElementById('modStatus'); if (s) s.value = profile.playerStatus || 'Active';
    const r = document.getElementById('modRole'); if (r) r.value = profile.playerRole || 'Player';
    const t = document.getElementById('modTitle'); if (t && profile.playerTitle) {
      if ([...t.options].some(o => o.value === profile.playerTitle)) t.value = profile.playerTitle;
    }
  } catch(_) {}
}

// General bulk actions
async function generalEnergyMax(){
  const adminUserId = getAdminUserId();
  if (!adminUserId) throw new Error('Fill Admin userId');
  const includeNPC = document.getElementById('generalIncludeNPC')?.value === 'true';
  const res = await NC_API.post('/admin/general/energy-max', { adminUserId, includeNPC });
  alert(`Energy set to max for ${res.modified||0}/${res.matched||0} players`);
}

async function generalGiveMoney(){
  const adminUserId = getAdminUserId();
  if (!adminUserId) throw new Error('Fill Admin userId');
  const includeNPC = document.getElementById('generalIncludeNPC')?.value === 'true';
  const amountVal = Number(document.getElementById('generalMoneyAmount').value || 0);
  if (!Number.isFinite(amountVal) || amountVal === 0) throw new Error('Enter a non-zero amount');
  const res = await NC_API.post('/admin/general/give-money', { adminUserId, includeNPC, amount: amountVal });
  alert(`Money updated (+${amountVal}) for ${res.modified||0}/${res.matched||0} players`);
}

// ------------------------
// Moderation
// ------------------------
async function loadTitles(){
  try {
    const data = await NC_API.get('/admin/player/titles');
    const sel = document.getElementById('modTitle');
    if (!sel) return;
    sel.innerHTML = '';
    (data.titles||[]).forEach(t => {
      const opt = document.createElement('option');
      opt.value = t; opt.textContent = t; sel.appendChild(opt);
    });
  } catch (e) {
    // silently ignore
  }
}

async function applyStatus(){
  const { targetUserId } = getIds();
  const adminUserId = getAdminUserId();
  const status = document.getElementById('modStatus').value;
  const res = await NC_API.patch('/admin/player/status', { ...(adminUserId ? { adminUserId } : {}), targetUserId, status });
  alert('Status set: ' + JSON.stringify(res));
}
async function applyRole(){
  const { targetUserId } = getIds();
  const adminUserId = getAdminUserId();
  const role = document.getElementById('modRole').value;
  const res = await NC_API.patch('/admin/player/role', { ...(adminUserId ? { adminUserId } : {}), targetUserId, role });
  alert('Role set: ' + JSON.stringify(res));
}
async function applyTitle(){
  const { targetUserId } = getIds();
  const adminUserId = getAdminUserId();
  const title = document.getElementById('modTitle').value;
  const res = await NC_API.patch('/admin/player/title', { ...(adminUserId ? { adminUserId } : {}), targetUserId, title });
  alert('Title set: ' + JSON.stringify(res));
}

// ------------------------
// Cooldowns
// ------------------------
async function cdLoad(){
  const { targetUserId } = getIds();
  const adminUserId = getAdminUserId();
  const data = await NC_API.get(`/admin/player/cooldowns/${encodeURIComponent(targetUserId)}${adminUserId ? `?adminUserId=${encodeURIComponent(adminUserId)}` : ''}`);
  const cd = data.cooldowns || {};
  const box = document.getElementById('cdCurrent');
  box.innerHTML = '';
  const lines = [
    `drugCooldown: ${cd.drugCooldown||0}s`,
    `medicalCooldown: ${cd.medicalCooldown||0}s`,
    `boosterCooldown: ${cd.boosterCooldown||0}s`,
    `alcoholCooldown: ${cd.alcoholCooldown||0}s`,
  ];
  const perDrug = cd.drugs || {};
  if (Object.keys(perDrug).length) {
    lines.push('per-drug: ' + JSON.stringify(perDrug));
  }
  box.textContent = lines.join(' | ');
}

async function cdSet(category){
  const { targetUserId } = getIds();
  const adminUserId = getAdminUserId();
  const idMap = { drug: 'cdDrug', medical: 'cdMedical', booster: 'cdBooster', alcohol: 'cdAlcohol' };
  const el = document.getElementById(idMap[category]);
  const seconds = Number(el?.value || 0);
  const res = await NC_API.post('/admin/player/cooldowns/set', { ...(adminUserId ? { adminUserId } : {}), targetUserId, category, seconds });
  alert('Cooldown set: ' + JSON.stringify(res));
  await cdLoad();
}

async function cdClear(scope){
  const { targetUserId } = getIds();
  const adminUserId = getAdminUserId();
  const res = await NC_API.post('/admin/player/cooldowns/clear', { ...(adminUserId ? { adminUserId } : {}), targetUserId, scope });
  alert('Cooldowns cleared: ' + JSON.stringify(res));
  await cdLoad();
}

async function cdResetAll(){
  const adminUserId = getAdminUserId();
  if (!adminUserId) throw new Error('Fill Admin userId');
  const includeNPC = document.getElementById('cdIncludeNPC')?.value === 'true';
  const res = await NC_API.post('/admin/cooldowns/reset-all', { adminUserId, includeNPC });
  alert(`Cooldowns reset for ${res.modified||0}/${res.matched||0} players`);
}

// ------------------------
// Database purge (danger)
// ------------------------
async function dbPurge(){
  const adminUserId = getAdminUserId();
  if (!adminUserId) throw new Error('Fill Admin userId');
  const confirm = document.getElementById('dbConfirm').value.trim();
  if (confirm !== 'DROP') throw new Error('Type DROP to confirm');
  const res = await NC_API.post('/admin/database/purge', { adminUserId, confirm });
  alert('Database dropped: ' + JSON.stringify(res));
}
