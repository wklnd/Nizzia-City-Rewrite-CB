(() => {
  const state = {
    entity: 'items',
    data: {
      items: [],
      properties: [],
      titles: [],
      honorbars: [],
    }
  };

  function el(tag, attrs={}, children=[]) {
    const e = document.createElement(tag);
    for (const [k,v] of Object.entries(attrs)) {
      if (k === 'class') e.className = v; else if (k === 'text') e.textContent = v; else e.setAttribute(k, v);
    }
    (Array.isArray(children) ? children : [children]).forEach(c => { if (c != null) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return e;
  }

  function setCount(){
    const arr = state.data[state.entity] || [];
    document.getElementById('countLabel').textContent = `${arr.length} entries`;
  }

  function download(filename, obj){
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = el('a', { href: url, download: filename });
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }

  function renderList(){
    const list = document.getElementById('list');
    list.innerHTML = '';
    const arr = state.data[state.entity] || [];
    arr.forEach((row, idx) => {
      const left = el('div', {}, [
        el('div', { class:'small', text: `#${idx+1}` }),
        el('div', { text: row.name || row.titleText || row.id || '(unnamed)' }),
        el('div', { class:'small', text: JSON.stringify(row).slice(0, 120) + (JSON.stringify(row).length>120?'…':'') }),
      ]);
      const btns = el('div', {}, [
        el('button', { class:'secondary' }, 'Edit'),
        el('button', { class:'secondary' }, 'Remove'),
      ]);
      btns.children[0].addEventListener('click', () => loadIntoForm(row, idx));
      btns.children[1].addEventListener('click', () => { state.data[state.entity].splice(idx,1); renderList(); setCount(); });
      const rowEl = el('div', { class:'list-row' }, [left, btns]);
      list.appendChild(rowEl);
    });
    setCount();
  }

  function val(id){ const x = document.getElementById(id); return x && x.value; }
  function checked(id){ const x = document.getElementById(id); return x && !!x.checked; }
  function num(id){ const v = Number(val(id)||0); return Number.isFinite(v) ? v : 0; }
  function jsonTry(id){ try { const t = val(id)||''; return t ? JSON.parse(t) : undefined; } catch { alert(`Invalid JSON in ${id}`); throw new Error('Invalid JSON'); } }

  function renderForm(){
    const area = document.getElementById('formArea');
    area.innerHTML = '';
    if (state.entity === 'items') return renderItemsForm(area);
    if (state.entity === 'properties') return renderPropertiesForm(area);
    if (state.entity === 'titles') return renderTitlesForm(area);
    if (state.entity === 'honorbars') return renderHonorbarsForm(area);
  }

  function renderItemsForm(area){
    const top = el('div', { class:'grid' }, [
      block([label('Name'), input('text','itemName')]),
      block([label('Custom Id (string)'), input('text','itemId')]),
      block([label('Type'), select('itemType', [
        'weapon','armor','medicine','alchool','enhancers','clothes','tools','drugs','collectibles','cache','other','materials'
      ])]),
      block([label('Subtype (weapon/armor/clothes)'), select('itemType2', [
        '', 'primaryWeapon','secondaryWeapon','meleeWeapon','head','torso','pants','shoes','legs'
      ])]),
      block([label('Price'), input('number','itemPrice')]),
      block([label('Sellable'), selectBool('itemSellable', true)]),
      block([label('Usable'), selectBool('itemUsable', false)]),
      block([label('Description (optional)'), input('text','itemDesc')]),
    ]);

    const weapon = el('div', { id:'weaponFields', class:'grid' }, [
      block([label('Damage'), input('number','itemDamage')]),
      block([label('Quality'), input('number','itemQuality')])
    ]);
    const armor = el('div', { id:'armorFields', class:'grid' }, [
      block([label('Armor'), input('number','armorArmor')]),
      block([label('Coverage (%)'), input('number','armorCoverage')]),
      block([label('Quality'), input('number','armorQuality')])
    ]);

    const ef = renderEffectBuilder();

    const actions = el('div', { class:'grid' }, [
      el('div', {}, [ el('button', { id:'btnAddItem' }, 'Add / Update Item') ])
    ]);

    area.appendChild(top);
    area.appendChild(weapon);
    area.appendChild(armor);
    area.appendChild(ef);
    area.appendChild(actions);

    function syncVisibility(){
      const t = val('itemType');
      weapon.style.display = (t === 'weapon') ? '' : 'none';
      armor.style.display = (t === 'armor') ? '' : 'none';
      document.getElementById('effectBuilder').style.display = ['medicine','alchool','enhancers','drugs','cache'].includes(t) ? '' : 'none';
      document.getElementById('cacheFields').style.display = (t === 'cache') ? '' : 'none';
    }

    document.getElementById('itemType').addEventListener('change', syncVisibility);
    syncVisibility();

    document.getElementById('btnAddItem').addEventListener('click', () => {
      try {
        const payload = buildItemPayload();
        upsertEntry('items', payload, 'id');
      } catch { /* message already displayed */ }
    });
  }

  function renderEffectBuilder(){
    const wrap = el('div', { id:'effectBuilder', class:'card' });
    wrap.appendChild(el('div', { class:'block-title', text:'Effect Builder' }));
    const grid1 = el('div', { class:'grid' }, [
      block([checkbox('ebEnergy'), labelAfter('Energy Δ', 'ebEnergy'), input('number','ebEnergyVal')]),
      block([checkbox('ebNerve'), labelAfter('Nerve Δ', 'ebNerve'), input('number','ebNerveVal')]),
      block([checkbox('ebHappy'), labelAfter('Happiness Δ', 'ebHappy'), input('number','ebHappyVal')]),
      block([checkbox('ebPoints'), labelAfter('Points Δ', 'ebPoints'), input('number','ebPointsVal')])
    ]);

    const grid2 = el('div', { class:'grid' }, [
      block([checkbox('ebCdAlcohol'), labelAfter('Alcohol Cooldown (sec)', 'ebCdAlcohol'), input('number','ebCdAlcoholVal')]),
      block([checkbox('ebCdBooster'), labelAfter('Booster Cooldown (sec)', 'ebCdBooster'), input('number','ebCdBoosterVal')]),
      block([checkbox('ebCdDrug'), labelAfter('Drug Cooldown (sec)', 'ebCdDrug'), input('number','ebCdDrugVal')]),
      block([checkbox('ebCdMedical'), labelAfter('Medical Cooldown (sec)', 'ebCdMedical'), input('number','ebCdMedicalVal')])
    ]);

    const cache = el('div', { id:'cacheFields', class:'card' });
    cache.appendChild(el('div', { class:'block-title', text:'Cache Contents' }));
    const cgrid1 = el('div', { class:'grid' }, [
      block([label('Money Min'), input('number','cMoneyMin')]),
      block([label('Money Max'), input('number','cMoneyMax')]),
      block([label('Money Chance (%)'), input('number','cMoneyChance')])
    ]);
    const cgrid2 = el('div', { class:'grid' }, [
      block([label('Points Min'), input('number','cPointsMin')]),
      block([label('Points Max'), input('number','cPointsMax')]),
      block([label('Points Chance (%)'), input('number','cPointsChance')])
    ]);
    const list = el('div', { id:'cacheItemList' });
    const btnAdd = el('button', { class:'secondary' }, '+ Add cache item');
    btnAdd.addEventListener('click', () => addCacheItem());
    cache.appendChild(cgrid1); cache.appendChild(cgrid2); cache.appendChild(list); cache.appendChild(btnAdd);

    wrap.appendChild(grid1);
    wrap.appendChild(grid2);
    wrap.appendChild(cache);
    return wrap;
  }

  function addCacheItem(row){
    const list = document.getElementById('cacheItemList');
    const idx = list.childElementCount;
    const rowEl = el('div', { class:'kv' }, [
      input('text', `ci_id_${idx}`, row?.id||'', 'Item id'),
      input('number', `ci_qty_${idx}`, row?.qty||1, 'Qty (or use min/max)'),
      btn('Remove', () => rowEl.remove(), 'remove'),
      input('number', `ci_min_${idx}`, row?.minQty||'', 'Qty Min'),
      input('number', `ci_max_${idx}`, row?.maxQty||'', 'Qty Max'),
      input('number', `ci_chance_${idx}`, row?.chance?Math.round(row.chance*100):'', 'Chance (%)')
    ]);
    list.appendChild(rowEl);
  }

  function buildItemPayload(){
    const type = val('itemType');
    const base = {
      name: val('itemName')?.trim(),
      id: String(val('itemId')||'').trim(),
      type,
      type2: val('itemType2') || undefined,
      description: val('itemDesc') || undefined,
      price: num('itemPrice'),
      sellable: val('itemSellable') === 'true',
      usable: val('itemUsable') === 'true',
    };
    if (!base.name || !base.id || !base.type) { alert('Fill required: name, id, type'); throw new Error('Missing'); }

    if (type === 'weapon') {
      base.damage = num('itemDamage');
      base.quality = num('itemQuality');
    }
    if (type === 'armor') {
      base.armor = num('armorArmor');
      base.coverage = num('armorCoverage');
      base.quality = num('armorQuality');
    }

    if (['medicine','alchool','enhancers','drugs','cache'].includes(type)) {
      const eff = {};
      if (checked('ebEnergy') && num('ebEnergyVal')) eff.energy = num('ebEnergyVal');
      if (checked('ebNerve') && num('ebNerveVal')) eff.nerve = num('ebNerveVal');
      if (checked('ebHappy') && num('ebHappyVal')) eff.happy = num('ebHappyVal');
      if (checked('ebPoints') && num('ebPointsVal')) eff.points = num('ebPointsVal');
      const cd = {};
      if (checked('ebCdAlcohol') && num('ebCdAlcoholVal')) cd.alcohol = num('ebCdAlcoholVal');
      if (checked('ebCdBooster') && num('ebCdBoosterVal')) cd.booster = num('ebCdBoosterVal');
      if (checked('ebCdDrug') && num('ebCdDrugVal')) cd.drug = num('ebCdDrugVal');
      if (checked('ebCdMedical') && num('ebCdMedicalVal')) cd.medical = num('ebCdMedicalVal');
      if (Object.keys(cd).length) eff.cooldowns = cd;

      if (type === 'cache') {
        const cache = {};
        const mi = num('cMoneyMin'), mx = num('cMoneyMax'), ch = num('cMoneyChance');
        if (mi || mx) { cache.money = { min: mi, max: Math.max(mi, mx) }; if (ch>0) cache.moneyChance = Math.max(0, Math.min(100, ch))/100; }
        const pmi = num('cPointsMin'), pmx = num('cPointsMax'), pch = num('cPointsChance');
        if (pmi || pmx) { cache.points = { min: pmi, max: Math.max(pmi, pmx) }; if (pch>0) cache.pointsChance = Math.max(0, Math.min(100, pch))/100; }
        const list = [];
        const holder = document.getElementById('cacheItemList');
        [...holder.children].forEach(row => {
          const [idEl, qtyEl, , minEl, maxEl, chanceEl] = row.querySelectorAll('input');
          const id = idEl.value.trim(); if (!id) return;
          const qty = Number(qtyEl.value||0);
          const minQty = Number(minEl.value||0), maxQty = Number(maxEl.value||0);
          const chancePct = Number(chanceEl.value||0);
          const o = { id };
          if (minQty || maxQty) { o.minQty = Math.max(1, minQty||1); o.maxQty = Math.max(o.minQty, maxQty||minQty||1); }
          else if (qty) { o.qty = Math.max(1, qty); }
          if (chancePct) o.chance = Math.max(0, Math.min(100, chancePct))/100;
          list.push(o);
        });
        if (list.length) eff.cache = Object.assign(cache, { items: list }); else eff.cache = cache;
      }
      if (Object.keys(eff).length) base.effect = eff;
    }
    return base;
  }

  function renderPropertiesForm(area){
    const top = el('div', { class:'grid' }, [
      block([label('Id (string)'), input('text','propId')]),
      block([label('Name'), input('text','propName')]),
      block([label('Cost'), input('number','propCost')]),
      block([label('Upkeep'), input('number','propUpkeep')]),
      block([label('Base Happy Max'), input('number','propHappyMax')]),
      block([label('Market'), selectBool('propMarket', true)])
    ]);

    const limits = el('div', { class:'card' });
    limits.appendChild(el('div', { class:'block-title', text:'Upgrade Limits (key:number)' }));
    const holder = el('div', { id:'propLimits' });
    const btnAdd = el('button', { class:'secondary' }, '+ Add Limit');
    btnAdd.addEventListener('click', () => addKV(holder));
    limits.appendChild(holder); limits.appendChild(btnAdd);

    const actions = el('div', { class:'grid' }, [ el('div', {}, [ el('button', { id:'btnAddProperty' }, 'Add / Update Property') ]) ]);

    area.appendChild(top); area.appendChild(limits); area.appendChild(actions);

    document.getElementById('btnAddProperty').addEventListener('click', () => {
      const payload = buildPropertyPayload();
      upsertEntry('properties', payload, 'id');
    });
  }

  function addKV(holder, row){
    const idx = holder.childElementCount;
    const rowEl = el('div', { class:'kv' }, [
      input('text', `kv_key_${idx}`, row?.key||'', 'Key'),
      input('number', `kv_val_${idx}`, row?.value||0, 'Value'),
      btn('Remove', () => rowEl.remove(), 'remove')
    ]);
    holder.appendChild(rowEl);
  }

  function buildPropertyPayload(){
    const id = val('propId')?.trim();
    const name = val('propName')?.trim();
    if (!id || !name) { alert('Fill required: id, name'); throw new Error('Missing'); }
    const limitsHolder = document.getElementById('propLimits');
    const map = {};
    [...limitsHolder.children].forEach(row => {
      const [k, v] = row.querySelectorAll('input');
      const key = k.value.trim(); if (!key) return; map[key] = Number(v.value||0);
    });
    return {
      id, name,
      cost: num('propCost'),
      upkeep: num('propUpkeep'),
      baseHappyMax: num('propHappyMax'),
      upgradeLimits: map,
      market: val('propMarket') === 'true',
    };
  }

  function renderTitlesForm(area){
    const top = el('div', { class:'grid' }, [
      block([label('Id (string)'), input('text','titleId')]),
      block([label('Name'), input('text','titleName')]),
      block([label('Title Text'), input('text','titleText')]),
      block([label('Criteria (JSON)'), textarea('titleCriteria')])
    ]);
    const actions = el('div', {}, [ el('button', { id:'btnAddTitle' }, 'Add / Update Title') ]);
    area.appendChild(top); area.appendChild(actions);

    document.getElementById('btnAddTitle').addEventListener('click', () => {
      try {
        const payload = {
          id: val('titleId')?.trim(),
          name: val('titleName')?.trim(),
          titleText: val('titleText')?.trim(),
          criteria: jsonTry('titleCriteria')
        };
        if (!payload.id || !payload.name || !payload.titleText) { alert('Fill required: id, name, titleText'); return; }
        upsertEntry('titles', payload, 'id');
      } catch {}
    });
  }

  function renderHonorbarsForm(area){
    const top = el('div', { class:'grid' }, [
      block([label('Id (string)'), input('text','honorId')]),
      block([label('Name'), input('text','honorName')]),
      block([label('Description'), input('text','honorDesc')]),
      block([label('Icon (path or key)'), input('text','honorIcon')]),
      block([label('Criteria (JSON, optional)'), textarea('honorCriteria')])
    ]);
    const actions = el('div', {}, [ el('button', { id:'btnAddHonor' }, 'Add / Update Honorbar') ]);
    area.appendChild(top); area.appendChild(actions);

    document.getElementById('btnAddHonor').addEventListener('click', () => {
      try {
        const payload = {
          id: val('honorId')?.trim(),
          name: val('honorName')?.trim(),
          description: val('honorDesc')||'',
          icon: val('honorIcon')||'',
          criteria: jsonTry('honorCriteria')
        };
        if (!payload.id || !payload.name) { alert('Fill required: id, name'); return; }
        upsertEntry('honorbars', payload, 'id');
      } catch {}
    });
  }

  function upsertEntry(key, payload, idField){
    const list = state.data[key];
    const idx = list.findIndex(x => String(x[idField]) === String(payload[idField]));
    if (idx >= 0) list[idx] = payload; else list.push(payload);
    renderList();
  }

  // Helpers to build form controls
  function block(children){ return el('div', {}, children); }
  function label(txt){ return el('label', {}, txt); }
  function labelAfter(txt, forId){ const l = el('label', { for: forId }, txt); l.style.display='inline-block'; l.style.marginLeft='6px'; return l; }
  function input(type, id, value='', placeholder=''){ const i = el('input', { type, id }); if (value!=='' && value!=null) i.value = value; if (placeholder) i.placeholder = placeholder; return i; }
  function textarea(id, value=''){ const t = el('textarea', { id }); t.rows = 3; if (value) t.value = value; return t; }
  function select(id, options){ const s = el('select',{ id }); options.forEach(o=>{ const opt = el('option',{ value:o }, o||''); s.appendChild(opt); }); return s; }
  function selectBool(id, def=false){ const s = el('select',{ id }); s.innerHTML = `<option value="true">true</option><option value="false">false</option>`; s.value = String(def); return s; }
  function checkbox(id){ const c = el('input',{ type:'checkbox', id }); c.style.verticalAlign='middle'; return c; }
  function btn(text, onClick, cls){ const b = el('button', { class: cls?cls:'secondary' }, text); b.addEventListener('click', onClick); return b; }

  // Load / Download handlers
  document.getElementById('entitySelect').addEventListener('change', (e) => {
    state.entity = e.target.value; renderForm(); renderList(); setCount();
  });
  document.getElementById('btnDownload').addEventListener('click', () => {
    const filename = `${state.entity}.json`;
    const obj = state.data[state.entity] || [];
    download(filename, obj);
  });
  document.getElementById('btnLoad').addEventListener('click', async () => {
    const input = document.getElementById('fileInput');
    const f = input.files && input.files[0];
    if (!f) { alert('Choose a JSON file first'); return; }
    try {
      const text = await f.text();
      const parsed = JSON.parse(text);
      state.data[state.entity] = Array.isArray(parsed) ? parsed : (Array.isArray(parsed.items) ? parsed.items : []);
      renderList(); setCount();
    } catch (e) { alert('Failed to parse JSON: ' + (e.message||e)); }
  });
  document.getElementById('btnClear').addEventListener('click', () => {
    if (!confirm('Clear current list?')) return;
    state.data[state.entity] = []; renderList(); setCount();
  });

  function loadIntoForm(row, idx){
    // Populate form fields depending on entity
    if (state.entity === 'items') {
      document.getElementById('itemName').value = row.name||'';
      document.getElementById('itemId').value = row.id||'';
      document.getElementById('itemType').value = row.type||'';
      document.getElementById('itemType2').value = row.type2||'';
      document.getElementById('itemPrice').value = row.price||0;
      document.getElementById('itemSellable').value = String(row.sellable!==false);
      document.getElementById('itemUsable').value = String(!!row.usable);
      document.getElementById('itemDesc').value = row.description||'';
      const t = row.type;
      const eff = row.effect||{};
      const cd = eff.cooldowns||{};
      const setCb = (id, on) => { const el = document.getElementById(id); el.checked = !!on; };
      const setVal = (id, v) => { const el = document.getElementById(id); el.value = v==null?'':v; };
      setCb('ebEnergy', 'energy' in eff); setVal('ebEnergyVal', eff.energy||'');
      setCb('ebNerve', 'nerve' in eff); setVal('ebNerveVal', eff.nerve||'');
      setCb('ebHappy', 'happy' in eff); setVal('ebHappyVal', eff.happy||'');
      setCb('ebPoints', 'points' in eff); setVal('ebPointsVal', eff.points||'');
      setCb('ebCdAlcohol', 'alcohol' in cd); setVal('ebCdAlcoholVal', cd.alcohol||'');
      setCb('ebCdBooster', 'booster' in cd); setVal('ebCdBoosterVal', cd.booster||'');
      setCb('ebCdDrug', 'drug' in cd); setVal('ebCdDrugVal', cd.drug||'');
      setCb('ebCdMedical', 'medical' in cd); setVal('ebCdMedicalVal', cd.medical||'');
      // cache
      const c = eff.cache||{};
      setVal('cMoneyMin', c.money?.min ?? ''); setVal('cMoneyMax', c.money?.max ?? ''); setVal('cMoneyChance', c.moneyChance!=null ? Math.round(c.moneyChance*100) : '');
      setVal('cPointsMin', c.points?.min ?? ''); setVal('cPointsMax', c.points?.max ?? ''); setVal('cPointsChance', c.pointsChance!=null ? Math.round(c.pointsChance*100) : '');
      const holder = document.getElementById('cacheItemList'); holder.innerHTML = '';
      if (Array.isArray(c.items)) c.items.forEach(addCacheItem);
      // ensure fields visibility
      document.getElementById('itemType').dispatchEvent(new Event('change'));
    }
    if (state.entity === 'properties') {
      document.getElementById('propId').value = row.id||'';
      document.getElementById('propName').value = row.name||'';
      document.getElementById('propCost').value = row.cost||0;
      document.getElementById('propUpkeep').value = row.upkeep||0;
      document.getElementById('propHappyMax').value = row.baseHappyMax||0;
      document.getElementById('propMarket').value = String(row.market!==false);
      const holder = document.getElementById('propLimits'); holder.innerHTML = '';
      const limits = row.upgradeLimits||{}; Object.entries(limits).forEach(([key,val]) => addKV(holder,{key,value:val}));
    }
    if (state.entity === 'titles') {
      document.getElementById('titleId').value = row.id||'';
      document.getElementById('titleName').value = row.name||'';
      document.getElementById('titleText').value = row.titleText||'';
      document.getElementById('titleCriteria').value = row.criteria ? JSON.stringify(row.criteria, null, 2) : '';
    }
    if (state.entity === 'honorbars') {
      document.getElementById('honorId').value = row.id||'';
      document.getElementById('honorName').value = row.name||'';
      document.getElementById('honorDesc').value = row.description||'';
      document.getElementById('honorIcon').value = row.icon||'';
      document.getElementById('honorCriteria').value = row.criteria ? JSON.stringify(row.criteria, null, 2) : '';
    }
  }

  // Initialize
  renderForm(); renderList(); setCount();
})();
