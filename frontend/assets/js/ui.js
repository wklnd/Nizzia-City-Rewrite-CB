// Shared UI helpers: inject topbar, update HP, and generic news ticker
(() => {
  const { getUser, clearSession } = window.NC_UTILS || {};

  function ensureTopbarInserted() {
    let top = document.querySelector('.topbar');
    if (!top) {
      top = document.createElement('div');
      top.className = 'topbar';
      top.innerHTML = `
        <div class="brand">Nizzia City</div>
        <div class="spacer"></div>
        <div class="topbar-center">
          <div class="ticker"><div id="news-ticker" class="ticker__track">Loading news…</div></div>
        </div>
        <div class="spacer"></div>
        <div class="actions"></div>
      `;
      document.body.insertBefore(top, document.body.firstChild);
    }
    // Ensure ticker exists
    if (!top.querySelector('.ticker')) {
      const center = document.createElement('div');
      center.className = 'topbar-center';
      center.innerHTML = '<div class="ticker"><div id="news-ticker" class="ticker__track">Loading news…</div></div>';
      // insert before last spacer if present
      const spacers = top.querySelectorAll('.spacer');
      if (spacers.length) top.insertBefore(center, spacers[spacers.length-1]); else top.appendChild(center);
    } else if (!top.querySelector('#news-ticker')) {
      const t = top.querySelector('.ticker');
      t.innerHTML = '<div id="news-ticker" class="ticker__track">Loading news…</div>';
    }
    // Ensure actions + HP pill exist
    let actions = top.querySelector('.actions');
    if (!actions) { actions = document.createElement('div'); actions.className = 'actions'; top.appendChild(actions); }
    if (!document.getElementById('ui-hp-pill')) {
      const pill = document.createElement('span');
      pill.id = 'ui-hp-pill';
      pill.className = 'stat-pill';
      pill.title = 'Current HP';
      pill.textContent = 'HP: --/--';
      actions.insertBefore(pill, actions.firstChild);
    }
    if (!document.getElementById('btn-profile')) {
      const btn = document.createElement('button');
      btn.id = 'btn-profile';
      btn.title = 'Profile';
      btn.textContent = 'Profile';
      actions.appendChild(btn);
    }
    if (!document.getElementById('btn-logout')) {
      const btn = document.createElement('button');
      btn.id = 'btn-logout';
      btn.title = 'Log out';
      btn.textContent = 'Log out';
      actions.appendChild(btn);
    }
    // Shift layout for pages that don't already offset
    const sidebar = document.querySelector('.sidebar');
    const main = document.querySelector('.main-content');
    if (sidebar && !sidebar.style.marginTop) sidebar.style.marginTop = '52px';
    if (main && !main.style.marginTop) main.style.marginTop = '52px';
    wireTopbarActions();
    initTicker();
    return top;
  }

  function wireTopbarActions(){
    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) btnLogout.addEventListener('click', () => { (window.NC_UTILS?.clearSession||(()=>{}))(); window.location.href = 'auth/login.html'; });
    const btnProfile = document.getElementById('btn-profile');
    if (btnProfile) btnProfile.addEventListener('click', () => {
      const u = (window.NC_UTILS?.getUser||(()=>null))();
      alert(`User: ${u?.username||'-'}`);
    });
  }

  function initTicker(){
    const news = [
      'Welcome to Nizzia City!',
      'Tip: Train in the gym to boost your battle stats.',
      'Pro tip: Happiness increases your gym gains!',
      'Jobs pay out daily at 01:00 server time.'
    ];
    const ticker = document.getElementById('news-ticker');
    if (ticker) ticker.textContent = news.concat(news).join(' — ');
  }

  function updateHP(player){
    const el = document.getElementById('ui-hp-pill');
    if (!el || !player) return;
    const cur = typeof player.health === 'number' ? player.health : 0;
    const max = 100; // Assumption: health is 0..100
    el.textContent = `HP: ${cur}/${max}`;
    el.setAttribute('aria-label', `Health ${cur} of ${max}`);
  }

  // Countdown helpers for regen schedules
  // Schedules: energy */10 * * * * (every 10 min), nerve */5 * * * * (every 5 min), happy */5 * * * *
  function nextTickMs(periodMinutes) {
    const now = new Date();
    const m = now.getMinutes();
    const nextMinuteBucket = Math.ceil((m + (now.getSeconds()>0 || now.getMilliseconds()>0 ? 0 : 0)) / periodMinutes) * periodMinutes;
    const next = new Date(now);
    next.setSeconds(0, 0);
    if (nextMinuteBucket % 60 === 0) {
      // roll to next hour
      next.setHours(now.getHours() + 1, 0, 0, 0);
    } else {
      next.setMinutes(nextMinuteBucket, 0, 0);
    }
    return Math.max(0, next.getTime() - now.getTime());
  }

  function fmtCountdown(ms){
    const s = Math.ceil(ms/1000);
    const mm = String(Math.floor(s/60)).padStart(2,'0');
    const ss = String(s%60).padStart(2,'0');
    return `${mm}:${ss}`;
  }

  let countdownTimer = null;
  function attachRegenCountdowns(opts){
    const { energyPeriod=10, nervePeriod=5, happyPeriod=5, labelIds } = opts || {};
    const ids = Object.assign({
      energy: { label: 'ui-energy-label' },
      nerve:  { label: 'ui-nerve-label' },
      happy:  { label: 'ui-happy-label' },
    }, labelIds || {});

    function ensureSpan(idBase){
      const p = document.getElementById(idBase);
      if (!p) return null;
      let span = p.querySelector('.regen-countdown');
      if (!span) {
        span = document.createElement('span');
        span.className = 'regen-countdown';
        span.style.marginLeft = '6px';
        span.style.fontSize = '12px';
        span.style.opacity = '0.8';
        p.appendChild(span);
      }
      return span;
    }

    const eSpan = ensureSpan(ids.energy.label);
    const nSpan = ensureSpan(ids.nerve.label);
    const hSpan = ensureSpan(ids.happy.label);

    if (countdownTimer) clearInterval(countdownTimer);
    countdownTimer = setInterval(() => {
      if (eSpan) eSpan.textContent = `(+5 in ${fmtCountdown(nextTickMs(energyPeriod))})`;
      if (nSpan) nSpan.textContent = `(+1 in ${fmtCountdown(nextTickMs(nervePeriod))})`;
      if (hSpan) hSpan.textContent = `(+5 in ${fmtCountdown(nextTickMs(happyPeriod))})`;
    }, 1000);
  }

  function init(){
    ensureTopbarInserted();
  }

  window.NC_UI = { init, ensureTopbarInserted, updateHP, attachRegenCountdowns };
})();
