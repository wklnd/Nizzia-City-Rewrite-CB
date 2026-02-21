<template>
  <section class="cartel-page">
    <h2>Drug Empire</h2>

    <!-- No Cartel Yet -->
    <div v-if="!cartel && !loading" class="panel u-mt-6">
      <h3>Build Your Empire</h3>
      <p class="muted">Every empire starts with a single decision. Put up <strong>$250,000</strong> and step into a world you can never leave.</p>
      <div class="create-row u-mt-4">
        <input v-model="newName" class="input" maxlength="30" placeholder="Cartel name…" />
        <button class="btn btn--primary" :disabled="busy || !newName.trim()" @click="doCreate">Establish</button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="muted u-mt-6">Pulling intel…</div>

    <!-- Main UI -->
    <template v-if="cartel">
      <!-- Status Bar -->
      <div class="empire-bar u-mt-6">
        <div class="empire-bar__item"><span class="empire-bar__label">Empire</span><span class="empire-bar__value">{{ cartel.name }}</span></div>
        <div class="empire-bar__item"><span class="empire-bar__label">Rank</span><span class="empire-bar__value" :style="{ color: 'var(--accent)' }">{{ cartel.repInfo?.name }}</span></div>
        <div class="empire-bar__item"><span class="empire-bar__label">Treasury</span><span class="empire-bar__value">${{ fmt(cartel.treasury) }}</span></div>
        <div class="empire-bar__item"><span class="empire-bar__label">Heat</span><span class="empire-bar__value" :class="cartel.heat > 60 ? 'val--neg' : ''">{{ cartel.heat }}/100</span></div>
        <div class="empire-bar__item"><span class="empire-bar__label">NPCs</span><span class="empire-bar__value">{{ cartel.npcCount }}/{{ cartel.maxNPCs }}</span></div>
        <div class="empire-bar__item"><span class="empire-bar__label">Labs</span><span class="empire-bar__value">{{ cartel.labs?.length || 0 }}/{{ cartel.maxLabs }}</span></div>
        <div class="empire-bar__item"><span class="empire-bar__label">Territories</span><span class="empire-bar__value">{{ cartel.territoryCount }}</span></div>
      </div>

      <!-- Busted warning -->
      <div v-if="cartel.isBusted" class="bust-banner u-mt-4">
        🚔 <strong>RAIDED</strong> — The feds kicked in your doors. Operations locked down until {{ new Date(cartel.bustedUntil).toLocaleTimeString() }}. Lay low.
      </div>

      <!-- Tab bar -->
      <div class="tab-bar u-mt-6">
        <button class="tab" :class="{ 'tab--active': tab === 'overview' }" @click="tab = 'overview'">📊 Command</button>
        <button class="tab" :class="{ 'tab--active': tab === 'npcs' }" @click="tab = 'npcs'">👤 Crew</button>
        <button class="tab" :class="{ 'tab--active': tab === 'production' }" @click="tab = 'production'">🧪 The Cook</button>
        <button class="tab" :class="{ 'tab--active': tab === 'territory' }" @click="tab = 'territory'">🗺️ Turf</button>
        <button class="tab" :class="{ 'tab--active': tab === 'missions' }" @click="tab = 'missions'">⚔️ Operations</button>
        <button class="tab" :class="{ 'tab--active': tab === 'history' }" @click="tab = 'history'; loadHistory()">📜 Intel</button>
        <button class="tab" :class="{ 'tab--active': tab === 'leaderboard' }" @click="tab = 'leaderboard'; loadLeaderboard()">🏆 Rankings</button>
      </div>

      <!-- ═══════════ OVERVIEW TAB ═══════════ -->
      <div v-if="tab === 'overview'" class="u-mt-6">
        <!-- Treasury management -->
        <div class="panel">
          <h4>War Chest</h4>
          <p class="muted">Cash on hand: <strong>${{ fmt(store.player?.money) }}</strong> — Fund the machine or take your cut.</p>
          <div class="treasury-row u-mt-4">
            <input v-model.number="treasuryAmount" class="input input--sm" type="number" min="0" placeholder="Amount" />
            <button class="btn btn--small btn--primary" :disabled="busy" @click="doDeposit">Deposit</button>
            <button class="btn btn--small" :disabled="busy" @click="doWithdraw">Withdraw</button>
          </div>
        </div>

        <!-- Inventory -->
        <div class="panel u-mt-4">
          <h4>The Stash</h4>
          <div v-if="cartel.inventory?.length" class="inv-grid u-mt-4">
            <div v-for="inv in cartel.inventory" :key="inv.drugId" class="inv-card">
              <div class="inv-card__emoji">{{ drugEmoji(inv.drugId) }}</div>
              <div class="inv-card__body">
                <div class="inv-card__name">{{ drugName(inv.drugId) }}</div>
                <div class="inv-card__meta">{{ inv.quantity }} units · Q{{ inv.quality }}</div>
              </div>
            </div>
          </div>
          <div v-else class="muted u-mt-4">Stash is dry. Fire up the lab and start cooking.</div>
        </div>

        <!-- Controlled territories -->
        <div class="panel u-mt-4">
          <h4>Controlled Turf</h4>
          <div v-if="cartel.territories?.length" class="terr-list u-mt-4">
            <div v-for="t in cartel.territories" :key="t.territoryId" class="terr-chip">
              <strong>{{ t.name }}</strong> <span class="muted">{{ t.region }}</span> <span class="pill">Power: {{ t.controlPower }}</span>
            </div>
          </div>
          <div v-else class="muted u-mt-4">You don't own a single block. Hit the Turf tab and take what's yours.</div>
        </div>

        <!-- Rep progress -->
        <div class="panel u-mt-4">
          <h4>Street Cred</h4>
          <div class="rep-bar u-mt-4">
            <div class="rep-bar__label">{{ cartel.repInfo?.name }} (Level {{ cartel.repInfo?.level }})</div>
            <div v-if="cartel.repInfo?.nextXp" class="rep-bar__track">
              <div class="rep-bar__fill" :style="{ width: repPercent + '%' }"></div>
            </div>
            <div class="rep-bar__sub muted">{{ fmt(cartel.repInfo?.xp || 0) }} / {{ cartel.repInfo?.nextXp ? fmt(cartel.repInfo.nextXp) : 'MAX' }} XP</div>
          </div>
        </div>

        <!-- Rename -->
        <div class="panel u-mt-4">
          <h4>Identity</h4>
          <div class="treasury-row u-mt-4">
            <input v-model.trim="renameName" class="input input--sm" maxlength="30" placeholder="New cartel name…" />
            <button class="btn btn--small btn--primary" :disabled="busy || !renameName" @click="doRename">Rename</button>
          </div>
        </div>
      </div>

      <!-- ═══════════ NPCS TAB ═══════════ -->
      <div v-if="tab === 'npcs'" class="u-mt-6">
        <!-- Hire -->
        <div class="panel">
          <h4>Recruit Crew</h4>
          <p class="muted">Everyone has a price. Pay from the war chest. Quality is a roll of the dice.</p>
          <div class="hire-row u-mt-4">
            <button v-for="(info, role) in NPC_ROLES" :key="role" class="btn" :disabled="busy" @click="doHire(role)">
              {{ info.emoji }} Hire {{ info.name }}
            </button>
          </div>
        </div>

        <!-- NPC List -->
        <div v-if="npcs.length" class="npc-grid u-mt-4">
          <div v-for="npc in npcs" :key="npc._id" class="npc-card" :class="'npc-card--' + npc.status">
            <div class="npc-card__header">
              <div class="npc-card__name" :style="{ color: rarityColor(npc.rarity) }">{{ npc.name }}</div>
              <div class="npc-card__role">{{ roleEmoji(npc.role) }} {{ npc.role }} · Lv{{ npc.level }}</div>
            </div>
            <div class="npc-card__rarity" :style="{ color: rarityColor(npc.rarity) }">{{ npc.rarity }}</div>
            <div class="npc-card__stats">
              <span v-for="(val, stat) in npc.stats" :key="stat" class="npc-stat">
                <span class="npc-stat__label">{{ stat.slice(0,3) }}</span>
                <span class="npc-stat__val">{{ val }}</span>
              </span>
            </div>
            <!-- XP progress -->
            <div v-if="npc.xpNeeded" class="xp-bar">
              <div class="xp-bar__track"><div class="xp-bar__fill" :style="{ width: (npc.xp / npc.xpNeeded * 100) + '%' }"></div></div>
              <div class="xp-bar__label muted">XP {{ npc.xp }}/{{ npc.xpNeeded }}</div>
            </div>
            <div class="npc-card__meta">
              <span>Loyalty: {{ npc.loyalty }}%</span>
              <span>Salary: ${{ fmt(npc.salary) }}/hr</span>
              <span v-if="npc.salaryOwed" class="val--neg">Owed: ${{ fmt(npc.salaryOwed) }}</span>
              <span>Status: <strong :class="statusClass(npc.status)">{{ npc.status }}</strong></span>
              <span v-if="npc.status === 'injured' && npc.recoversAt" class="muted">Recovers: {{ new Date(npc.recoversAt).toLocaleTimeString() }}</span>
              <span v-if="npc.assignedTo">📍 {{ territoryName(npc.assignedTo) }}</span>
              <span v-else class="muted">📍 HQ (unassigned)</span>
            </div>
            <div class="npc-card__actions">
              <button v-if="npc.status === 'arrested'" class="btn btn--small btn--primary" :disabled="busy" @click="doBail(npc._id)">Bail Out</button>
              <button v-if="npc.status === 'injured'" class="btn btn--small btn--primary" :disabled="busy" @click="doHeal(npc._id)">💉 Heal</button>
              <button v-if="npc.status === 'idle'" class="btn btn--small btn--danger" :disabled="busy" @click="doFireNPC(npc._id)">Fire</button>
              <select v-if="npc.status === 'idle'" class="input input--sm" :value="npc.assignedTo || ''" @change="doAssign(npc._id, $event.target.value)" :disabled="busy">
                <option value="">HQ (unassign)</option>
                <option v-for="t in cartel.territories" :key="t.territoryId" :value="t.territoryId">📍 {{ t.name }}</option>
              </select>
            </div>
          </div>
        </div>
        <div v-else class="muted u-mt-4">No crew on payroll. You're running this thing solo — that won't last.</div>
      </div>

      <!-- ═══════════ PRODUCTION TAB ═══════════ -->
      <div v-if="tab === 'production'" class="u-mt-6">
        <!-- Drug catalog -->
        <div class="panel">
          <h4>Product Catalog</h4>
          <div class="drug-catalog u-mt-4">
            <div v-for="d in drugCatalog" :key="d.id" class="drug-row">
              <span class="drug-row__emoji">{{ d.emoji }}</span>
              <span class="drug-row__name"><strong>{{ d.name }}</strong></span>
              <span class="muted">{{ d.description }}</span>
              <span class="drug-row__meta">Batch: {{ d.batchSize }} · Cost: ${{ fmt(d.baseCost) }} · Price: ${{ fmt(d.basePrice) }}/u · Lab: {{ d.labName }}</span>
            </div>
          </div>
        </div>

        <!-- Labs -->
        <div class="panel u-mt-4">
          <h4>Your Labs</h4>
          <div v-if="labs.length" class="lab-grid u-mt-4">
            <div v-for="lab in labs" :key="lab.index" class="lab-card">
              <div class="lab-card__header">
                <strong>{{ lab.name }}</strong>
                <span class="pill">Lv {{ lab.level }}/{{ lab.maxLevel }}</span>
              </div>
              <div class="muted">Turf: {{ territoryName(lab.territoryId) }}</div>

              <div v-if="lab.producing" class="lab-card__status u-mt-4">
                <div>Cooking: <strong>{{ lab.drugName }}</strong></div>
                <div class="cook-bar">
                  <div class="cook-bar__fill" :style="{ width: cookPercent(lab) + '%' }"></div>
                </div>
                <div class="muted">{{ lab.ready ? 'READY!' : formatTime(lab.timeRemaining) + ' remaining' }}</div>
                <button v-if="lab.ready" class="btn btn--small btn--primary u-mt-4" :disabled="busy" @click="doCollectBatch(lab.index)">
                  Collect ({{ lab.batchSize }} × Q{{ lab.batchQuality }})
                </button>
              </div>
              <div v-else class="lab-card__cook u-mt-4">
                <select v-model="cookSelect[lab.index]" class="input input--sm">
                  <option value="">Select drug…</option>
                  <option v-for="d in cookableDrugs(lab)" :key="d.id" :value="d.id">{{ d.emoji }} {{ d.name }} (${{ fmt(d.baseCost) }})</option>
                </select>
                <button class="btn btn--small btn--primary" :disabled="busy || !cookSelect[lab.index]" @click="doCook(lab.index)">Cook</button>
              </div>

              <div class="lab-card__actions u-mt-4">
                <button class="btn btn--small" :disabled="busy || lab.level >= lab.maxLevel" @click="doUpgradeLab(lab.index)">Upgrade</button>
                <button class="btn btn--small btn--danger" :disabled="busy || lab.producing" @click="doDestroyLab(lab.index)">Demolish</button>
              </div>
            </div>
          </div>
          <div v-else class="muted u-mt-4">No labs. Claim some turf first, then set up shop.</div>

          <!-- Build new lab -->
          <div v-if="cartel.territories?.length" class="build-lab u-mt-4">
            <h4>Set Up a New Lab</h4>
            <div class="build-lab__row">
              <select v-model="newLabType" class="input input--sm">
                <option value="">Lab type…</option>
                <option v-for="l in labCatalog" :key="l.id" :value="l.id">{{ l.name }} (${{ fmt(l.cost) }})</option>
              </select>
              <select v-model="newLabTerritory" class="input input--sm">
                <option value="">Territory…</option>
                <option v-for="t in cartel.territories" :key="t.territoryId" :value="t.territoryId">{{ t.name }}</option>
              </select>
              <button class="btn btn--primary" :disabled="busy || !newLabType || !newLabTerritory" @click="doBuildLab">Build</button>
            </div>
          </div>
        </div>
      </div>

      <!-- ═══════════ TERRITORY TAB ═══════════ -->
      <div v-if="tab === 'territory'" class="u-mt-6">
        <div v-for="region in worldMap" :key="region.id" class="panel u-mt-4">
          <h4>{{ region.name }}</h4>
          <div class="terr-grid u-mt-4">
            <div v-for="t in region.territories" :key="t.id" class="terr-card" :class="{ 'terr-card--mine': t.controlledBy?._id === cartel._id }">
              <div class="terr-card__header">
                <strong>{{ t.name }}</strong>
                <span v-if="t.controlledBy" class="pill" :class="t.controlledBy._id === cartel._id ? 'pill--mine' : 'pill--enemy'">
                  {{ t.controlledBy._id === cartel._id ? 'YOURS' : t.controlledBy.name }}
                </span>
                <span v-else class="pill pill--unclaimed">Unclaimed</span>
              </div>
              <div class="muted" style="font-size:11px;">{{ t.description }}</div>
              <div class="terr-card__meta">
                <span>Demand: {{ (t.demand * t.demandMult).toFixed(2) }}x</span>
                <span>Law: {{ (t.lawLevel * 100).toFixed(0) }}%</span>
                <span>Heat: +{{ t.baseHeat }}/sale</span>
              </div>
              <div class="terr-card__actions">
                <button v-if="!t.controlledBy" class="btn btn--small btn--primary" :disabled="busy" @click="doClaim(t.id)">Claim</button>
                <button v-if="t.controlledBy && t.controlledBy._id === cartel._id" class="btn btn--small btn--primary" :disabled="busy" @click="openSell(t.id)">Sell Drugs</button>
              </div>

              <!-- Territory upgrades (only for owned territories) -->
              <div v-if="t.controlledBy && t.controlledBy._id === cartel._id && upgradeCatalog.length" class="terr-upgrades u-mt-4">
                <div class="muted" style="font-size:10px;text-transform:uppercase;margin-bottom:4px;">Upgrades</div>
                <div class="upgrade-row">
                  <div v-for="u in upgradeCatalog" :key="u.id" class="upgrade-chip">
                    <span>{{ u.emoji }} {{ u.name }} Lv{{ t.upgrades?.[u.id] || 0 }}/{{ u.maxLevel }}</span>
                    <button v-if="(t.upgrades?.[u.id] || 0) < u.maxLevel" class="btn btn--small" :disabled="busy"
                            :title="u.description + ' — $' + fmt(Math.floor(u.baseCost * Math.pow(u.costMult, t.upgrades?.[u.id] || 0)))"
                            @click="doUpgradeTerritory(t.id, u.id)">
                      Upgrade (${{ fmt(Math.floor(u.baseCost * Math.pow(u.costMult, t.upgrades?.[u.id] || 0))) }})
                    </button>
                    <span v-else class="pill pill--mine">MAX</span>
                  </div>
                </div>
              </div>

              <!-- Sell drugs inline -->
              <div v-if="sellTerritory === t.id" class="sell-row u-mt-4">
                <select v-model="sellDrug" class="input input--sm">
                  <option value="">Drug…</option>
                  <option v-for="inv in cartel.inventory" :key="inv.drugId" :value="inv.drugId">{{ drugName(inv.drugId) }} ({{ inv.quantity }})</option>
                </select>
                <input v-model.number="sellQty" class="input input--sm" type="number" min="1" placeholder="Qty" />
                <button class="btn btn--small btn--primary" :disabled="busy || !sellDrug || !sellQty" @click="doSell">Sell</button>
                <button class="btn btn--small" @click="sellTerritory = null">Cancel</button>
              </div>
            </div>
          </div>
        </div>
        <div v-if="!worldMap.length" class="muted">Scouting the streets…</div>
      </div>

      <!-- ═══════════ MISSIONS TAB ═══════════ -->
      <div v-if="tab === 'missions'" class="u-mt-6">
        <!-- Active missions -->
        <div class="panel">
          <h4>Active Operations</h4>
          <div v-if="missions.length" class="mission-list u-mt-4">
            <div v-for="m in missions" :key="m._id" class="mission-card">
              <div class="mission-card__header">
                <span>{{ m.emoji }} <strong>{{ m.typeName }}</strong></span>
                <span class="pill" :class="m.ready ? 'pill--mine' : ''">{{ m.ready ? 'READY' : formatTime(m.timeRemaining) }}</span>
              </div>
              <div class="muted">
                <span v-if="m.toTerritory">→ {{ territoryName(m.toTerritory) }}</span>
                <span v-if="m.npcs?.length"> · {{ m.npcs.map(n => n.name).join(', ') }}</span>
              </div>
            </div>
          </div>
          <div v-else class="muted u-mt-4">No ops running. Your crew is sitting around doing nothing.</div>
        </div>

        <!-- Start new mission -->
        <div class="panel u-mt-4">
          <h4>Launch Operation</h4>
          <p class="muted">Pick the job, pick the crew, pick the target. Once it's in motion, there's no calling it back.</p>
          <div class="mission-form u-mt-4">
            <select v-model="missionType" class="input input--sm" @change="selectedNPCs = []">
              <option value="">Choose your play…</option>
              <option value="delivery">🚚 Drug Run</option>
              <option value="attack">⚔️ Hit a Rival</option>
              <option value="seize">🏴 Hostile Takeover</option>
              <option value="assassination">💀 Wet Work</option>
              <option value="sabotage">💣 Scorched Earth</option>
              <option value="corruption">🏛️ Grease the Machine</option>
              <option value="intimidation">👊 Shake Down</option>
              <option value="smuggling">🛩️ Border Run</option>
            </select>

            <!-- Target territory (all types except delivery/smuggling need a single target) -->
            <select v-if="missionType && !['smuggling','delivery'].includes(missionType)" v-model="missionTarget" class="input input--sm">
              <option value="">Pick your target…</option>
              <option v-for="t in allTerritories" :key="t.id" :value="t.id">{{ t.name }} {{ t.controlledBy ? '(' + t.controlledBy.name + ')' : '(unclaimed)' }}</option>
            </select>

            <!-- Delivery: from + to + drug + qty -->
            <template v-if="missionType === 'delivery'">
              <select v-model="smuggleFrom" class="input input--sm">
                <option value="">Ship from…</option>
                <option v-for="t in allTerritories" :key="t.id" :value="t.id">{{ t.name }}</option>
              </select>
              <select v-model="smuggleTo" class="input input--sm">
                <option value="">Deliver to…</option>
                <option v-for="t in allTerritories.filter(x => x.id !== smuggleFrom)" :key="t.id" :value="t.id">{{ t.name }}</option>
              </select>
              <select v-model="smuggleDrug" class="input input--sm">
                <option value="">Drug…</option>
                <option v-for="d in (cartel?.inventory || [])" :key="d.drugId" :value="d.drugId">{{ drugEmoji(d.drugId) }} {{ drugName(d.drugId) }} ({{ d.quantity }})</option>
              </select>
              <input v-model.number="smuggleQty" type="number" min="1" class="input input--sm" placeholder="Quantity" />
            </template>

            <!-- Smuggling: from + to + drug + qty -->
            <template v-if="missionType === 'smuggling'">
              <select v-model="smuggleFrom" class="input input--sm">
                <option value="">Ship from…</option>
                <option v-for="t in allTerritories" :key="t.id" :value="t.id">{{ t.name }}</option>
              </select>
              <select v-model="smuggleTo" class="input input--sm">
                <option value="">Ship to…</option>
                <option v-for="t in allTerritories.filter(x => x.id !== smuggleFrom)" :key="t.id" :value="t.id">{{ t.name }}</option>
              </select>
              <select v-model="smuggleDrug" class="input input--sm">
                <option value="">Drug…</option>
                <option v-for="d in (cartel?.inventory || [])" :key="d.drugId" :value="d.drugId">{{ drugEmoji(d.drugId) }} {{ drugName(d.drugId) }} ({{ d.quantity }})</option>
              </select>
              <input v-model.number="smuggleQty" type="number" min="1" class="input input--sm" placeholder="Quantity" />
            </template>

            <!-- Corruption: bribe amount -->
            <input v-if="missionType === 'corruption'" v-model.number="bribeAmount" type="number" min="5000" step="1000" class="input input--sm" placeholder="Cash in envelope ($5,000+)" />

            <div class="muted" style="font-size:11px;">Assign {{ missionNpcLabel }} to this job (click to toggle):</div>
            <div class="npc-select">
              <button v-for="npc in missionNpcPool" :key="npc._id"
                      class="btn btn--small" :class="{ 'btn--primary': selectedNPCs.includes(npc._id) }"
                      @click="toggleNPC(npc._id)">
                {{ npc.name }} (Lv{{ npc.level }})
              </button>
              <span v-if="!missionNpcPool.length" class="muted">No idle {{ missionNpcLabel }} on standby</span>
            </div>
            <button class="btn btn--primary u-mt-4" :disabled="busy || !missionType || !canLaunch || !selectedNPCs.length" @click="doLaunchMission">
              Send Them In
            </button>
          </div>
        </div>
      </div>

      <!-- ═══════════ HISTORY TAB ═══════════ -->
      <div v-if="tab === 'history'" class="u-mt-6">
        <div class="panel">
          <h4>Mission Intel</h4>
          <div v-if="missionHistoryList.length" class="mission-list u-mt-4">
            <div v-for="m in missionHistoryList" :key="m._id" class="mission-card">
              <div class="mission-card__header">
                <span>{{ m.emoji }} <strong>{{ m.typeName }}</strong></span>
                <span class="pill" :class="m.outcome === 'success' ? 'pill--mine' : 'pill--enemy'">{{ m.outcome }}</span>
              </div>
              <div class="muted">
                <span v-if="m.toTerritory">→ {{ territoryName(m.toTerritory) }}</span>
                <span v-if="m.npcs?.length"> · {{ m.npcs.map(n => n.name || n).join(', ') }}</span>
                <span v-if="m.completedAt"> · {{ new Date(m.completedAt).toLocaleString() }}</span>
              </div>
              <div v-if="m.summary" class="muted" style="font-size:11px;">{{ m.summary }}</div>
            </div>
          </div>
          <div v-else class="muted u-mt-4">No mission records. Run some ops first.</div>
        </div>
      </div>

      <!-- ═══════════ LEADERBOARD TAB ═══════════ -->
      <div v-if="tab === 'leaderboard'" class="u-mt-6">
        <div class="panel">
          <h4>🏆 Cartel Rankings</h4>
          <div v-if="lbList.length" class="lb-table u-mt-4">
            <div class="lb-row lb-row--header">
              <span>#</span><span>Empire</span><span>Rank</span><span>Rep</span><span>Treasury</span><span>Turf</span><span>Labs</span><span>NPCs</span><span>Heat</span>
            </div>
            <div v-for="(c, i) in lbList" :key="c._id" class="lb-row" :class="{ 'lb-row--mine': c._id === cartel?._id }">
              <span>{{ i + 1 }}</span>
              <span><strong>{{ c.name }}</strong></span>
              <span :style="{ color: 'var(--accent)' }">{{ c.rankName }}</span>
              <span>{{ fmt(c.reputation) }}</span>
              <span>${{ fmt(c.treasury) }}</span>
              <span>{{ c.territories }}</span>
              <span>{{ c.labs }}</span>
              <span>{{ c.npcs }}</span>
              <span :class="c.heat > 60 ? 'val--neg' : ''">{{ c.heat }}</span>
            </div>
          </div>
          <div v-else class="muted u-mt-4">No empires to rank yet.</div>
        </div>
      </div>
    </template>

    <div v-if="error" class="error u-mt-6">{{ error }}</div>
  </section>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import api from '../api/client'
import { usePlayer } from '../composables/usePlayer'
import { useToast } from '../composables/useToast'
import { fmtInt as fmt } from '../utils/format'

const { store, ensurePlayer, reloadPlayer } = usePlayer()
const toast = useToast()

// State
const tab = ref('overview')
const loading = ref(false)
const busy = ref(false)
const error = ref('')
const newName = ref('')

// Cartel data
const cartel = ref(null)
const npcs = ref([])
const labs = ref([])
const drugCatalog = ref([])
const labCatalog = ref([])
const worldMap = ref([])
const missions = ref([])
const missionHistoryList = ref([])
const lbList = ref([])
const upgradeCatalog = ref([])
const renameName = ref('')

// Form state
const treasuryAmount = ref(0)
const cookSelect = reactive({})
const newLabType = ref('')
const newLabTerritory = ref('')
const sellTerritory = ref(null)
const sellDrug = ref('')
const sellQty = ref(0)
const missionType = ref('')
const missionTarget = ref('')
const selectedNPCs = ref([])
const smuggleFrom = ref('')
const smuggleTo = ref('')
const smuggleDrug = ref('')
const smuggleQty = ref(0)
const bribeAmount = ref(10000)

// Delivery fields reuse smuggle* refs (same from/to/drug/qty pattern)

// Constants (mirrored from config for display)
const NPC_ROLES = {
  dealer:    { emoji: '🤝', name: 'Dealer' },
  mule:     { emoji: '📦', name: 'Mule' },
  bodyguard: { emoji: '🛡️', name: 'Bodyguard' },
  hitman:   { emoji: '🎯', name: 'Hitman' },
  enforcer: { emoji: '🕶️', name: 'Enforcer' },
}

const NPC_RARITIES = {
  common:    '#9ca3af',
  uncommon:  '#22c55e',
  rare:      '#3b82f6',
  epic:      '#a855f7',
  legendary: '#f59e0b',
}

// Helpers
function drugEmoji(id) {
  const map = { cocaine: '❄️', meth: '💎', heroin: '🩸', mdma: '💊', pills: '💉' }
  return map[id] || '💊'
}
function drugName(id) {
  const d = drugCatalog.value.find(x => x.id === id)
  return d?.name || id
}
function rarityColor(r) { return NPC_RARITIES[r] || '#9ca3af' }
function roleEmoji(r) { return NPC_ROLES[r]?.emoji || '👤' }
function statusClass(s) {
  if (s === 'idle') return 'val--pos'
  if (s === 'on_mission') return ''
  if (s === 'injured' || s === 'arrested') return 'val--neg'
  if (s === 'dead') return 'val--neg'
  return ''
}
function territoryName(id) {
  for (const region of worldMap.value) {
    for (const t of region.territories) {
      if (t.id === id) return t.name
    }
  }
  return id
}
function cookPercent(lab) {
  if (!lab.timeNeeded) return 0
  return Math.min(100, (lab.timeElapsed / lab.timeNeeded) * 100)
}
function formatTime(seconds) {
  if (!seconds || seconds <= 0) return 'Ready'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}
function cookableDrugs(lab) {
  return drugCatalog.value.filter(d => d.requiredLab === lab.labId)
}

const repPercent = computed(() => {
  if (!cartel.value?.repInfo?.nextXp) return 100
  const current = cartel.value.repInfo.xp || 0
  const prev = current // simplified
  return Math.min(100, (current / cartel.value.repInfo.nextXp) * 100)
})

const allTerritories = computed(() => {
  const list = []
  for (const r of worldMap.value) {
    for (const t of r.territories) list.push(t)
  }
  return list
})

const availableHitmen = computed(() => npcs.value.filter(n => n.role === 'hitman' && n.status === 'idle'))
const availableEnforcers = computed(() => npcs.value.filter(n => n.role === 'enforcer' && n.status === 'idle'))
const availableMules = computed(() => npcs.value.filter(n => n.role === 'mule' && n.status === 'idle'))

// Which NPC role to show for selected mission type
const missionNpcPool = computed(() => {
  const t = missionType.value
  if (['corruption', 'intimidation'].includes(t)) return availableEnforcers.value
  if (['smuggling', 'delivery'].includes(t)) return availableMules.value
  return availableHitmen.value   // attack, seize, assassination, sabotage
})
const missionNpcLabel = computed(() => {
  const t = missionType.value
  if (['corruption', 'intimidation'].includes(t)) return 'enforcers'
  if (['smuggling', 'delivery'].includes(t)) return 'mules'
  return 'hitmen'
})

// Determines if enough fields are filled for the selected mission type
const canLaunch = computed(() => {
  const t = missionType.value
  if (!t) return false
  if (t === 'smuggling' || t === 'delivery') return smuggleFrom.value && smuggleTo.value && smuggleDrug.value && smuggleQty.value > 0
  if (t === 'corruption') return missionTarget.value && bribeAmount.value >= 5000
  return !!missionTarget.value
})

function toggleNPC(id) {
  const i = selectedNPCs.value.indexOf(id)
  if (i >= 0) selectedNPCs.value.splice(i, 1)
  else selectedNPCs.value.push(id)
}

function openSell(terrId) {
  sellTerritory.value = terrId
  sellDrug.value = ''
  sellQty.value = 0
}

// ── API calls ──

async function loadOverview() {
  try {
    const { data } = await api.get('/cartel/overview')
    cartel.value = data.cartel
  } catch (e) {
    if (e?.response?.status === 404) cartel.value = null
    else error.value = e?.response?.data?.error || e.message
  }
}

async function loadNPCs() {
  try {
    const { data } = await api.get('/cartel/npcs')
    npcs.value = data.npcs || []
  } catch {}
}

async function loadLabs() {
  try {
    const { data } = await api.get('/cartel/labs')
    labs.value = data.labs || []
  } catch {}
}

async function loadCatalog() {
  try {
    const { data } = await api.get('/cartel/catalog')
    drugCatalog.value = data.drugs || []
    labCatalog.value = data.labs || []
  } catch {}
}

async function loadMap() {
  try {
    const { data } = await api.get('/cartel/map')
    worldMap.value = data.regions || []
  } catch {}
}

async function loadMissions() {
  try {
    const { data } = await api.get('/cartel/missions')
    missions.value = data.missions || []
  } catch {}
}

async function loadHistory() {
  try {
    const { data } = await api.get('/cartel/missions/history', { params: { limit: 50 } })
    missionHistoryList.value = data.missions || []
  } catch {}
}

async function loadLeaderboard() {
  try {
    const { data } = await api.get('/cartel/leaderboard')
    lbList.value = data.leaderboard || []
  } catch {}
}

async function loadUpgradeCatalog() {
  try {
    const { data } = await api.get('/cartel/territory/upgrades')
    upgradeCatalog.value = data.upgrades || []
  } catch {}
}

async function refreshAll() {
  await Promise.all([loadOverview(), loadNPCs(), loadLabs(), loadMap(), loadMissions(), loadUpgradeCatalog()])
}

// ── Actions ──

async function doCreate() {
  busy.value = true
  try {
    await api.post('/cartel/create', { name: newName.value })
    await reloadPlayer()
    await refreshAll()
  } catch (e) { toast.error(e?.response?.data?.error || e.message) }
  finally { busy.value = false }
}

async function doDeposit() {
  busy.value = true
  try {
    const { data } = await api.post('/cartel/deposit', { amount: treasuryAmount.value })
    if (data?.playerMoney != null) store.mergePartial({ money: data.playerMoney })
    await loadOverview()
  } catch (e) { toast.error(e?.response?.data?.error || e.message) }
  finally { busy.value = false }
}

async function doWithdraw() {
  busy.value = true
  try {
    const { data } = await api.post('/cartel/withdraw', { amount: treasuryAmount.value })
    if (data?.playerMoney != null) store.mergePartial({ money: data.playerMoney })
    await loadOverview()
  } catch (e) { toast.error(e?.response?.data?.error || e.message) }
  finally { busy.value = false }
}

async function doHire(role) {
  busy.value = true
  try {
    const { data } = await api.post('/cartel/npcs/hire', { role })
    await Promise.all([loadNPCs(), loadOverview()])
  } catch (e) { toast.error(e?.response?.data?.error || e.message) }
  finally { busy.value = false }
}

async function doFireNPC(npcId) {
  if (!confirm('Fire this NPC?')) return
  busy.value = true
  try {
    await api.post('/cartel/npcs/fire', { npcId })
    await Promise.all([loadNPCs(), loadOverview()])
  } catch (e) { toast.error(e?.response?.data?.error || e.message) }
  finally { busy.value = false }
}

async function doBail(npcId) {
  busy.value = true
  try {
    await api.post('/cartel/npcs/bail', { npcId })
    await Promise.all([loadNPCs(), loadOverview()])
  } catch (e) { toast.error(e?.response?.data?.error || e.message) }
  finally { busy.value = false }
}

async function doHeal(npcId) {
  busy.value = true
  try {
    await api.post('/cartel/npcs/heal', { npcId })
    await Promise.all([loadNPCs(), loadOverview()])
  } catch (e) { toast.error(e?.response?.data?.error || e.message) }
  finally { busy.value = false }
}

async function doRename() {
  busy.value = true
  try {
    await api.post('/cartel/rename', { name: renameName.value })
    renameName.value = ''
    await loadOverview()
  } catch (e) { toast.error(e?.response?.data?.error || e.message) }
  finally { busy.value = false }
}

async function doUpgradeTerritory(territoryId, upgradeId) {
  busy.value = true
  try {
    await api.post('/cartel/territory/upgrade', { territoryId, upgradeId })
    await Promise.all([loadMap(), loadOverview()])
  } catch (e) { toast.error(e?.response?.data?.error || e.message) }
  finally { busy.value = false }
}

async function doAssign(npcId, territoryId) {
  busy.value = true
  try {
    await api.post('/cartel/npcs/assign', { npcId, territoryId: territoryId || null })
    await loadNPCs()
  } catch (e) { toast.error(e?.response?.data?.error || e.message) }
  finally { busy.value = false }
}

async function doBuildLab() {
  busy.value = true
  try {
    await api.post('/cartel/labs/build', { labType: newLabType.value, territoryId: newLabTerritory.value })
    newLabType.value = ''; newLabTerritory.value = ''
    await Promise.all([loadLabs(), loadOverview()])
  } catch (e) { toast.error(e?.response?.data?.error || e.message) }
  finally { busy.value = false }
}

async function doUpgradeLab(idx) {
  busy.value = true
  try {
    await api.post('/cartel/labs/upgrade', { labIndex: idx })
    await Promise.all([loadLabs(), loadOverview()])
  } catch (e) { toast.error(e?.response?.data?.error || e.message) }
  finally { busy.value = false }
}

async function doDestroyLab(idx) {
  if (!confirm('Destroy this lab?')) return
  busy.value = true
  try {
    await api.post('/cartel/labs/destroy', { labIndex: idx })
    await Promise.all([loadLabs(), loadOverview()])
  } catch (e) { toast.error(e?.response?.data?.error || e.message) }
  finally { busy.value = false }
}

async function doCook(labIdx) {
  busy.value = true
  try {
    await api.post('/cartel/labs/cook', { labIndex: labIdx, drugId: cookSelect[labIdx] })
    cookSelect[labIdx] = ''
    await Promise.all([loadLabs(), loadOverview()])
  } catch (e) { toast.error(e?.response?.data?.error || e.message) }
  finally { busy.value = false }
}

async function doCollectBatch(labIdx) {
  busy.value = true
  try {
    await api.post('/cartel/labs/collect', { labIndex: labIdx })
    await Promise.all([loadLabs(), loadOverview()])
  } catch (e) { toast.error(e?.response?.data?.error || e.message) }
  finally { busy.value = false }
}

async function doClaim(terrId) {
  busy.value = true
  try {
    await api.post('/cartel/territory/claim', { territoryId: terrId })
    await Promise.all([loadMap(), loadOverview()])
  } catch (e) { toast.error(e?.response?.data?.error || e.message) }
  finally { busy.value = false }
}

async function doSell() {
  busy.value = true
  try {
    const { data } = await api.post('/cartel/territory/sell-drugs', {
      territoryId: sellTerritory.value, drugId: sellDrug.value, quantity: sellQty.value,
    })
    sellTerritory.value = null
    await Promise.all([loadOverview(), loadMap()])
  } catch (e) { toast.error(e?.response?.data?.error || e.message) }
  finally { busy.value = false }
}

async function doLaunchMission() {
  busy.value = true
  try {
    const t = missionType.value
    const endpoint = `/cartel/missions/${t}`
    let body = { npcIds: selectedNPCs.value }

    if (t === 'smuggling' || t === 'delivery') {
      body.fromTerritory = smuggleFrom.value
      body.toTerritory = smuggleTo.value
      body.drugId = smuggleDrug.value
      body.quantity = smuggleQty.value
    } else if (t === 'corruption') {
      body.territoryId = missionTarget.value
      body.bribeAmount = bribeAmount.value
    } else {
      body.territoryId = missionTarget.value
    }

    await api.post(endpoint, body)
    // Reset form
    missionType.value = ''; missionTarget.value = ''; selectedNPCs.value = []
    smuggleFrom.value = ''; smuggleTo.value = ''; smuggleDrug.value = ''; smuggleQty.value = 0
    bribeAmount.value = 10000
    await Promise.all([loadMissions(), loadNPCs(), loadOverview()])
  } catch (e) { toast.error(e?.response?.data?.error || e.message) }
  finally { busy.value = false }
}

// ── Init ──

onMounted(async () => {
  loading.value = true
  await ensurePlayer()
  await loadCatalog()
  await loadOverview()
  if (cartel.value) await refreshAll()
  loading.value = false
})

watch(() => store.player?.user, async (v, ov) => {
  if (v && v !== ov) { await loadOverview(); if (cartel.value) await refreshAll() }
})
</script>

<style scoped>
.cartel-page { max-width: 960px; margin: 0 auto; }

/* Empire bar */
.empire-bar { display: flex; flex-wrap: wrap; gap: 4px 16px; padding: 10px 14px; border: 1px solid var(--border); border-radius: 2px; background: var(--panel); }
.empire-bar__item { display: flex; flex-direction: column; }
.empire-bar__label { font-size: 10px; text-transform: uppercase; color: var(--muted); letter-spacing: 0.03em; }
.empire-bar__value { font-size: 13px; font-weight: 700; }

.bust-banner { padding: 10px 14px; border: 1px solid var(--danger); border-radius: 2px; background: rgba(239,68,68,0.1); color: var(--danger); font-size: 13px; }

/* Tabs — keep only flex-wrap override */
.tab-bar { flex-wrap: wrap; }


/* Inputs */
.input--sm { padding: 4px 8px; font-size: 11px; }
.create-row { display: flex; gap: 8px; align-items: center; }

/* Utility */
.pill--mine { background: var(--accent); color: #fff; border-color: var(--accent); }
.pill--enemy { background: var(--danger); color: #fff; border-color: var(--danger); }
.pill--unclaimed { opacity: 0.5; }

/* Treasury */
.treasury-row { display: flex; gap: 6px; align-items: center; }

/* Inventory */
.inv-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 8px; }
.inv-card { display: flex; gap: 10px; align-items: center; padding: 8px 10px; border: 1px solid var(--border); border-radius: 2px; background: var(--bg-alt); }
.inv-card__emoji { font-size: 24px; }
.inv-card__name { font-weight: 600; font-size: 13px; }
.inv-card__meta { font-size: 11px; color: var(--muted); }

/* Territories list */
.terr-list { display: flex; flex-wrap: wrap; gap: 6px; }
.terr-chip { display: flex; align-items: center; gap: 6px; padding: 4px 10px; border: 1px solid var(--border); border-radius: 2px; background: var(--bg-alt); font-size: 12px; }

/* Rep bar */
.rep-bar__track { height: 6px; background: var(--bg-alt); border: 1px solid var(--border); border-radius: 2px; overflow: hidden; margin: 4px 0; }
.rep-bar__fill { height: 100%; background: var(--accent); transition: width 0.3s; }
.rep-bar__sub { font-size: 11px; }

/* Hire */
.hire-row { display: flex; flex-wrap: wrap; gap: 6px; }

/* NPC grid */
.npc-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 8px; }
.npc-card { border: 1px solid var(--border); border-radius: 2px; background: var(--panel); padding: 10px; display: flex; flex-direction: column; gap: 4px; }
.npc-card--injured { border-color: var(--warn); opacity: 0.8; }
.npc-card--arrested { border-color: var(--danger); opacity: 0.8; }
.npc-card--dead { opacity: 0.4; }
.npc-card__header { display: flex; justify-content: space-between; align-items: baseline; }
.npc-card__name { font-weight: 700; font-size: 13px; }
.npc-card__role { font-size: 11px; color: var(--muted); }
.npc-card__rarity { font-size: 10px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em; }
.npc-card__stats { display: flex; gap: 8px; }
.npc-stat { display: flex; flex-direction: column; align-items: center; font-size: 10px; }
.npc-stat__label { text-transform: uppercase; color: var(--muted); }
.npc-stat__val { font-weight: 700; font-size: 12px; }
.npc-card__meta { display: flex; gap: 10px; font-size: 11px; color: var(--muted); flex-wrap: wrap; }
.npc-card__actions { display: flex; gap: 4px; margin-top: 4px; }

/* Drug catalog */
.drug-catalog { display: grid; gap: 6px; }
.drug-row { display: grid; grid-template-columns: 30px 120px 1fr auto; align-items: center; gap: 8px; padding: 6px 8px; border: 1px solid var(--border); border-radius: 2px; background: var(--bg-alt); font-size: 12px; }
.drug-row__emoji { font-size: 18px; }
.drug-row__meta { font-size: 11px; color: var(--muted); white-space: nowrap; }

/* Labs */
.lab-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 8px; }
.lab-card { border: 1px solid var(--border); border-radius: 2px; background: var(--panel); padding: 10px; }
.lab-card__header { display: flex; justify-content: space-between; align-items: center; }
.lab-card__cook { display: flex; gap: 6px; align-items: center; }
.lab-card__actions { display: flex; gap: 6px; }
.cook-bar { height: 6px; background: var(--bg-alt); border: 1px solid var(--border); border-radius: 2px; overflow: hidden; margin: 4px 0; }
.cook-bar__fill { height: 100%; background: var(--accent); transition: width 0.3s; }
.build-lab__row { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }

/* Territory grid */
.terr-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 8px; }
.terr-card { border: 1px solid var(--border); border-radius: 2px; background: var(--bg-alt); padding: 10px; }
.terr-card--mine { border-color: var(--accent); }
.terr-card__header { display: flex; justify-content: space-between; align-items: center; font-size: 13px; }
.terr-card__meta { display: flex; gap: 10px; font-size: 11px; color: var(--muted); margin-top: 4px; }
.terr-card__actions { display: flex; gap: 6px; margin-top: 6px; }
.sell-row { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }

/* Missions */
.mission-list { display: grid; gap: 6px; }
.mission-card { border: 1px solid var(--border); border-radius: 2px; background: var(--bg-alt); padding: 8px 10px; }
.mission-card__header { display: flex; justify-content: space-between; align-items: center; font-size: 12px; }
.mission-form { display: flex; flex-direction: column; gap: 8px; }
.npc-select { display: flex; flex-wrap: wrap; gap: 4px; }

/* XP bar */
.xp-bar { margin-top: 2px; }
.xp-bar__track { height: 4px; background: var(--bg-alt); border: 1px solid var(--border); border-radius: 2px; overflow: hidden; }
.xp-bar__fill { height: 100%; background: var(--ok); transition: width 0.3s; }
.xp-bar__label { font-size: 10px; }

/* Territory upgrades */
.terr-upgrades { border-top: 1px solid var(--border); padding-top: 6px; }
.upgrade-row { display: flex; flex-wrap: wrap; gap: 6px; }
.upgrade-chip { display: flex; align-items: center; gap: 4px; font-size: 11px; }

/* Leaderboard */
.lb-table { display: grid; gap: 2px; }
.lb-row { display: grid; grid-template-columns: 30px 1fr 100px 80px 90px 40px 40px 40px 40px; gap: 6px; align-items: center; padding: 4px 8px; font-size: 12px; border-radius: 2px; }
.lb-row--header { font-weight: 700; text-transform: uppercase; font-size: 10px; color: var(--muted); border-bottom: 1px solid var(--border); }
.lb-row--mine { background: rgba(59,130,246,0.1); border: 1px solid var(--accent); }
</style>
