<template>
  <section class="admin-container">
    <h2 class="page-title">Admin Console</h2>

    <!-- Target selection, search, and profile summary -->
    <div class="card">
      <h3>Target</h3>
      <div class="row">
        <div>
          <label>Admin userId</label>
          <input v-model.trim="adminUserId" placeholder="Your admin player userId" />
        </div>
        <div>
          <label>Target player id (numeric)</label>
          <input v-model.trim="targetPlayerId" placeholder="e.g. 748" />
        </div>
      </div>
      <div class="actions">
        <button @click="onLoadPlayer">Load Player</button>
        <button class="secondary" @click="onSaveIds">Save IDs</button>
        <span class="muted">We resolve target userId from numeric Player.id or from search results.</span>
      </div>
      <div class="row">
        <div>
          <label>Target userId (auto)</label>
          <input v-model="targetUserId" readonly />
        </div>
      </div>
      <div class="row">
        <div style="grid-column: 1 / -1">
          <label>Search by name, numeric ID, or user ObjectId</label>
          <div class="inline">
            <input v-model.trim="searchQuery" @keyup.enter="onSearch" @input="onSearchDebounced" placeholder="e.g. Oscar, 123, or 64f09..." />
            <button @click="onSearch">Search</button>
          </div>
          <div class="list">
            <div v-if="searchResults.length === 0" class="muted">No results</div>
            <div v-for="p in searchResults" :key="p.userId" class="list-row">
              <div>userId={{ p.userId }} | id={{ p.id }} | name={{ p.name }} | role={{ p.role || 'Player' }}<span v-if="p.npc"> | NPC</span></div>
              <button @click="useSearchPlayer(p)">Use</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="card" v-if="profile">
      <h3>Player Profile</h3>
      <div class="list">
        <div><strong>{{ profile.name }}</strong> (id={{ profile.id }}) <span v-if="profile.npc" class="pill">NPC</span></div>
        <div class="muted" style="margin-top:4px">Status: <strong>{{ profile.playerStatus }}</strong> · Role: <strong>{{ profile.playerRole }}</strong> · Title: <strong>{{ profile.playerTitle }}</strong></div>
        <div class="row" style="margin-top:8px">
          <div>
            <label>Money</label>
            <div>${{ num(profile.finances?.money || 0) }}</div>
          </div>
          <div>
            <label>Bank locked</label>
            <div>${{ num(profile.finances?.bankLocked || 0) }} ({{ profile.finances?.bankActiveAccounts || 0 }} active)</div>
          </div>
          <div>
            <label>Portfolio</label>
            <div>${{ num(profile.finances?.portfolioValue || 0) }}</div>
          </div>
          <div>
            <label>Net worth</label>
            <div><strong>${{ num(profile.finances?.netWorth || 0) }}</strong></div>
          </div>
          <div>
            <label>Energy</label>
            <div>{{ profile.vitals?.energy || 0 }}/{{ profile.vitals?.energyMax || 0 }}</div>
          </div>
          <div>
            <label>Nerve</label>
            <div>{{ profile.vitals?.nerve || 0 }}/{{ profile.vitals?.nerveMax || 0 }}</div>
          </div>
          <div>
            <label>Happy</label>
            <div>{{ profile.vitals?.happy || 0 }}/{{ profile.vitals?.happyMax || 0 }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Identity -->
    <div class="card" v-if="profile">
      <h3>Identity</h3>
      <div class="row">
        <div>
          <label>New Name</label>
          <input v-model.trim="newName" placeholder="3-32 chars" />
        </div>
      </div>
      <div class="actions">
        <button @click="applyName">Set Name</button>
        <span class="muted">Changing name does not affect numeric ID.</span>
      </div>
    </div>

    <!-- Moderation -->
    <div class="card">
      <h3>Moderation</h3>
      <div class="row">
        <div>
          <label>Status</label>
          <select v-model="modStatus">
            <option value="Active">Active</option>
            <option value="Suspended">Suspended</option>
            <option value="Banned">Banned</option>
            <option value="Abandoned">Abandoned</option>
          </select>
        </div>
        <div>
          <label>Role</label>
          <select v-model="modRole">
            <option value="Player">Player</option>
            <option value="Moderator">Moderator</option>
            <option value="Admin">Admin</option>
            <option value="Developer">Developer</option>
          </select>
        </div>
        <div>
          <label>Title</label>
          <select v-model="modTitle">
            <option v-for="t in titles" :key="t" :value="t">{{ t }}</option>
          </select>
        </div>
      </div>
      <div class="actions">
        <button @click="applyStatus">Set Status</button>
        <button @click="applyRole">Set Role</button>
        <button @click="applyTitle">Set Title</button>
        <span class="muted">Developer required to assign Developer role.</span>
      </div>
    </div>

    <!-- Currencies -->
    <div class="card">
      <h3>Currencies</h3>
      <div class="row">
        <div><label>Money Δ</label><input v-model.number="currency.moneyDelta" type="number" /></div>
        <div><label>Points Δ</label><input v-model.number="currency.pointsDelta" type="number" /></div>
        <div><label>Merits Δ</label><input v-model.number="currency.meritsDelta" type="number" /></div>
        <div><label>Xmas Δ</label><input v-model.number="currency.xmasCoinsDelta" type="number" /></div>
        <div><label>Halloween Δ</label><input v-model.number="currency.halloweenCoinsDelta" type="number" /></div>
        <div><label>Easter Δ</label><input v-model.number="currency.easterCoinsDelta" type="number" /></div>
      </div>
      <div class="actions"><button @click="applyCurrency">Apply</button></div>
    </div>

    <!-- XP & Level -->
    <div class="card">
      <h3>XP & Level</h3>
      <div class="inline">
        <div><label>Exp Δ</label><input v-model.number="expDelta" type="number" /></div>
        <button @click="applyExp">Apply Exp</button>
        <div><label>Level</label><input v-model.number="levelSet" type="number" min="1" /></div>
        <button @click="applyLevel">Set Level</button>
      </div>
    </div>

    <!-- Resources -->
    <div class="card">
      <h3>Resources</h3>
      <div class="row">
        <div><label>Energy Δ</label><input v-model.number="resources.energyDelta" type="number" /></div>
        <div><label>Nerve Δ</label><input v-model.number="resources.nerveDelta" type="number" /></div>
        <div><label>Happy Δ</label><input v-model.number="resources.happyDelta" type="number" /></div>
      </div>
      <div class="actions">
        <button @click="applyResources">Apply</button>
        <button class="secondary" @click="energyToMax">Energy = Max</button>
        <button class="secondary" @click="nerveToMax">Nerve = Max</button>
        <button class="secondary" @click="happyToMax">Happy = Max</button>
      </div>
    </div>

    <!-- Battle stats -->
    <div class="card" v-if="profile">
      <h3>Battle Stats</h3>
      <div class="row">
        <div><label>Strength</label><input v-model.number="battle.strength" type="number" min="0" /></div>
        <div><label>Speed</label><input v-model.number="battle.speed" type="number" min="0" /></div>
        <div><label>Dexterity</label><input v-model.number="battle.dexterity" type="number" min="0" /></div>
        <div><label>Defense</label><input v-model.number="battle.defense" type="number" min="0" /></div>
      </div>
      <div class="actions">
        <button @click="applyBattleStats">Set Battle Stats</button>
        <span class="muted">Current total: {{ num((profile?.battleStats?.strength||0) + (profile?.battleStats?.speed||0) + (profile?.battleStats?.dexterity||0) + (profile?.battleStats?.defense||0)) }}</span>
      </div>
    </div>

    <!-- Work stats -->
    <div class="card" v-if="profile">
      <h3>Work Stats</h3>
      <div class="row">
        <div><label>Manual Labor</label><input v-model.number="work.manuallabor" type="number" min="0" /></div>
        <div><label>Intelligence</label><input v-model.number="work.intelligence" type="number" min="0" /></div>
        <div><label>Endurance</label><input v-model.number="work.endurance" type="number" min="0" /></div>
        <div><label>Employee Efficiency</label><input v-model.number="work.employeEfficiency" type="number" min="0" /></div>
      </div>
      <div class="actions">
        <button @click="applyWorkStats">Set Work Stats</button>
      </div>
    </div>

    <!-- General (bulk) -->
    <div class="card">
      <h3>General (bulk)</h3>
      <div class="muted">Danger zone: applies to many players. Excludes NPCs by default.</div>
      <div class="inline">
        <div>
          <label>Include NPCs</label>
          <select v-model="generalIncludeNPC"><option value="false">false</option><option value="true">true</option></select>
        </div>
        <button @click="generalEnergyMax">Set energy = max for all</button>
      </div>
      <div class="inline">
        <div><label>Money amount (Δ)</label><input v-model.number="generalMoneyAmount" type="number" /></div>
        <button @click="generalGiveMoney">Give money to all</button>
      </div>
    </div>

    <!-- Inventory -->
    <div class="card">
      <h3>Inventory</h3>
      <div class="inline">
        <div><label>Item ID</label><input v-model.trim="invItemId" placeholder="Item.id or Mongo _id" /></div>
        <div><label>Qty</label><input v-model.number="invQty" type="number" min="1" /></div>
        <button @click="invAdd">Add</button>
        <button class="secondary" @click="invRemove">Remove</button>
      </div>
      <div class="list muted">{{ invStatus }}</div>
    </div>

    <!-- Create Item (advanced) -->
    <div class="card">
      <h3>Create Item</h3>
      <div class="row">
        <div><label>Name</label><input v-model.trim="item.name" /></div>
        <div><label>Type</label>
          <select v-model="item.type">
            <option value="weapon">weapon</option>
            <option value="alchool">alchol</option>
            <option value="booster">booster</option>
            <option value="cache">cache</option>
            <option value="armor">armor</option>
            <option value="medicine">medicine</option>
            <option value="clothes">clothes</option>
            <option value="tools">tools</option>
            <option value="drugs">drugs</option>
            <option value="collectibles">collectibles</option>
          </select>
        </div>
        <div><label>Item id</label><input v-model="item.id" placeholder="string or number" /></div>
        <div><label>Price</label><input v-model.number="item.price" type="number" min="0" /></div>
        <div><label>Sellable</label>
          <select v-model="item.sellable"><option :value="true">true</option><option :value="false">false</option></select>
        </div>
        <div><label>Usable</label>
          <select v-model="item.usable"><option :value="true">true</option><option :value="false">false</option></select>
        </div>
        <div style="grid-column: 1 / -1"><label>Description</label><input v-model.trim="item.description" /></div>
      </div>

      <!-- subtype for weapon/armor/clothes -->
      <div class="row" v-if="['weapon','armor','clothes'].includes(item.type)">
        <div>
          <label>Subtype</label>
          <select v-model="item.type2">
            <option value="">— select —</option>
            <option value="primaryWeapon">Primary Weapon</option>
            <option value="secondaryWeapon">Secondary Weapon</option>
            <option value="meleeWeapon">Melee Weapon</option>
            <option value="head">Head</option>
            <option value="torso">Torso</option>
            <option value="pants">Pants</option>
            <option value="shoes">Shoes</option>
            <option value="legs">Legs</option>
          </select>
        </div>
      </div>

      <!-- weapon only -->
      <div class="row" v-if="item.type==='weapon'">
        <div><label>Damage</label><input v-model.number="item.damage" type="number" min="0" /></div>
        <div><label>Quality</label><input v-model.number="item.quality" type="number" min="0" max="100" /></div>
      </div>

      <!-- armor only -->
      <div class="row" v-if="item.type==='armor'">
        <div><label>Armor</label><input v-model.number="item.armor" type="number" min="0" /></div>
        <div><label>Coverage (%)</label><input v-model.number="item.coverage" type="number" min="0" max="100" /></div>
        <div><label>Quality</label><input v-model.number="item.quality" type="number" min="0" max="100" /></div>
      </div>

      <!-- effects for consumables and cache -->
      <div v-if="['medicine','alchool','enhancers','drugs','booster','cache'].includes(item.type)" class="list">
        <label>Effects</label>
        <div class="row">
          <div>
            <label><input type="checkbox" v-model="ebEnable.energy" /> Energy Δ</label>
            <input v-model.number="ebEnergy" type="number" placeholder="e.g. 250" />
          </div>
          <div>
            <label><input type="checkbox" v-model="ebEnable.nerve" /> Nerve Δ</label>
            <input v-model.number="ebNerve" type="number" placeholder="e.g. 5" />
          </div>
          <div>
            <label><input type="checkbox" v-model="ebEnable.happy" /> Happiness Δ</label>
            <input v-model.number="ebHappy" type="number" placeholder="e.g. 1000" />
          </div>
          <div>
            <label><input type="checkbox" v-model="ebEnable.points" /> Points Δ</label>
            <input v-model.number="ebPoints" type="number" placeholder="e.g. 5" />
          </div>
        </div>
        <div class="row">
          <div>
            <label><input type="checkbox" v-model="ebEnable.b_str" /> Bonus Strength</label>
            <input v-model.number="ebBonus.strength" type="number" placeholder="e.g. 100" />
          </div>
          <div>
            <label><input type="checkbox" v-model="ebEnable.b_dex" /> Bonus Dexterity</label>
            <input v-model.number="ebBonus.dexterity" type="number" placeholder="e.g. 100" />
          </div>
          <div>
            <label><input type="checkbox" v-model="ebEnable.b_spd" /> Bonus Speed</label>
            <input v-model.number="ebBonus.speed" type="number" placeholder="e.g. 100" />
          </div>
          <div>
            <label><input type="checkbox" v-model="ebEnable.b_def" /> Bonus Defense</label>
            <input v-model.number="ebBonus.defense" type="number" placeholder="e.g. 100" />
          </div>
        </div>

        <label>Cooldowns</label>
        <div class="row">
          <div>
            <label><input type="checkbox" v-model="ebEnable.cdAlcohol" /> Alcohol (sec)</label>
            <input v-model.number="ebCooldowns.alcohol" type="number" placeholder="e.g. 3600" />
          </div>
          <div>
            <label><input type="checkbox" v-model="ebEnable.cdBooster" /> Booster (sec)</label>
            <input v-model.number="ebCooldowns.booster" type="number" placeholder="e.g. 1800" />
          </div>
          <div>
            <label><input type="checkbox" v-model="ebEnable.cdDrug" /> Drug (sec)</label>
            <input v-model.number="ebCooldowns.drug" type="number" placeholder="e.g. 43200" />
          </div>
          <div>
            <label><input type="checkbox" v-model="ebEnable.cdMedical" /> Medical (sec)</label>
            <input v-model.number="ebCooldowns.medical" type="number" placeholder="e.g. 7200" />
          </div>
        </div>

        <div v-if="item.type==='cache'" class="list">
          <label>Cache contents</label>
          <div class="row">
            <div><label>Money Min</label><input v-model.number="cacheMoneyMin" type="number" min="0" /></div>
            <div><label>Money Max</label><input v-model.number="cacheMoneyMax" type="number" min="0" /></div>
            <div><label>Money Chance (%)</label><input v-model.number="cacheMoneyChancePct" type="number" min="0" max="100" /></div>
          </div>
          <div class="row">
            <div><label>Points Min</label><input v-model.number="cachePointsMin" type="number" min="0" /></div>
            <div><label>Points Max</label><input v-model.number="cachePointsMax" type="number" min="0" /></div>
            <div><label>Points Chance (%)</label><input v-model.number="cachePointsChancePct" type="number" min="0" max="100" /></div>
          </div>
          <div class="list">
            <div class="list-row" v-for="(row, idx) in cacheItems" :key="idx">
              <div class="inline">
                <div><label>Item id</label><input v-model.trim="row.id" placeholder="custom Item.id" /></div>
                <div><label>Qty Min</label><input v-model.number="row.qtyMin" type="number" min="1" /></div>
                <div><label>Qty Max</label><input v-model.number="row.qtyMax" type="number" min="1" /></div>
                <div><label>Chance (%)</label><input v-model.number="row.chancePct" type="number" min="0" max="100" /></div>
              </div>
              <button class="secondary" @click="removeCacheItem(idx)">Remove</button>
            </div>
            <button class="secondary" @click="addCacheItem">+ Add cache item</button>
          </div>
        </div>

        <div class="actions">
          <button class="secondary" @click="presetXanax">Preset: Xanax</button>
          <button class="secondary" @click="presetEnergy250">Preset: Energy +250</button>
          <button class="secondary" @click="presetBoosterSmall">Preset: Booster Small</button>
          <button class="secondary" @click="applyEffectBuilder">Apply to JSON</button>
        </div>
        <div class="row">
          <div style="grid-column: 1 / -1">
            <label>Effect (JSON)</label>
            <textarea v-model.trim="effectJson" rows="3" @change="loadEffectFromJson"></textarea>
          </div>
        </div>
      </div>

      <div v-if="['alchool','drugs'].includes(item.type)" class="row">
        <div style="grid-column: 1 / -1"><label>Overdose Effect (JSON)</label><textarea v-model.trim="overdoseJson" rows="3"></textarea></div>
      </div>

      <div v-if="['tools','collectibles'].includes(item.type)" class="row">
        <div style="grid-column: 1 / -1"><label>Passive Effect (JSON)</label><textarea v-model.trim="passiveJson" rows="3"></textarea></div>
      </div>

      <div class="actions">
        <button @click="createItem">Create Item</button>
        <button class="secondary" @click="downloadAllItems">Download all (JSON)</button>
        <button class="secondary" @click="fetchItems">Refresh list</button>
      </div>

      <div class="list muted">{{ createItemStatus }}</div>

      <div class="list">
        <h4>All Items</h4>
        <div v-if="items.length===0" class="muted">No items yet</div>
        <div v-for="i in items" :key="i._id" class="list-row">
          <div>
            <div><strong>{{ i.name }}</strong> — {{ i.type }} (id={{ i.id }})</div>
            <div class="muted" v-if="i.type2">Subtype: {{ i.type2 }}</div>
          </div>
          <button class="secondary" @click="deleteItem(i._id)">Delete</button>
        </div>
      </div>
    </div>

    <!-- Stocks -->
    <div class="card">
      <h3>Stocks</h3>
      <div class="inline">
        <div><label>Symbol</label><input v-model.trim="stockSymbol" placeholder="e.g. FLY" /></div>
        <div><label>Shares</label><input v-model.number="stockShares" type="number" min="1" /></div>
        <div><label>Avg Price (optional)</label><input v-model.number="stockAvgPrice" type="number" step="0.0001" /></div>
        <button @click="stockAdd">Add</button>
        <button class="secondary" @click="stockRemove">Remove</button>
        <button class="secondary" title="Crash (-40% to -90%)" @click="stockCrash">Crash</button>
        <button title="Rocket (+40% to +130%)" @click="stockRocket">Rocket</button>
      </div>
    </div>

    <!-- Bank accounts -->
    <div class="card">
      <h3>Bank Accounts</h3>
      <div class="actions"><button @click="loadAccounts">Load Accounts</button></div>
      <div class="list">
        <div v-for="ac in bankAccounts" :key="ac._id" class="list-row">
          <div>{{ ac._id }} | principal ${{ ac.depositedAmount }} | APR {{ ac.interestRate }}% | {{ ac.period }} | start {{ fmt(ac.startDate) }} | end {{ fmt(ac.endDate) }} | withdrawn {{ ac.isWithdrawn }}</div>
          <button :disabled="ac.isWithdrawn" @click="forceWithdraw(ac._id)">Force Withdraw</button>
        </div>
        <div v-if="bankAccounts.length===0" class="muted">None</div>
      </div>
    </div>

    <!-- Cooldowns -->
    <div class="card">
      <h3>Cooldowns</h3>
      <div class="actions"><button @click="cdLoad">Load Current</button></div>
      <div class="list">{{ cdCurrentSummary }}</div>
      <div class="row">
        <div><label>Drug (sec)</label><input v-model.number="cdDrug" type="number" min="0" /></div>
        <div><label>Medical (sec)</label><input v-model.number="cdMedical" type="number" min="0" /></div>
        <div><label>Booster (sec)</label><input v-model.number="cdBooster" type="number" min="0" /></div>
        <div><label>Alcohol (sec)</label><input v-model.number="cdAlcohol" type="number" min="0" /></div>
      </div>
      <div class="actions">
        <button @click="cdSet('drug')">Set Drug</button>
        <button @click="cdSet('medical')">Set Medical</button>
        <button @click="cdSet('booster')">Set Booster</button>
        <button @click="cdSet('alcohol')">Set Alcohol</button>
        <button class="secondary" @click="cdClear('all')">Clear All (Player)</button>
      </div>
      <div class="inline">
        <div>
          <label>Include NPCs</label>
          <select v-model="cdIncludeNPC"><option value="false">false</option><option value="true">true</option></select>
        </div>
        <button class="secondary" title="Reset all players' cooldowns" @click="cdResetAll">Reset All Cooldowns (Global)</button>
      </div>
    </div>

    <!-- Addiction + Database (Danger) -->
    <div class="card">
      <h3>Addiction & Database (Danger)</h3>
      <div class="inline">
        <div><label>Set Addiction</label><input v-model.number="addictionValue" type="number" min="0" /></div>
        <button @click="setAddiction">Set Addiction</button>
      </div>
      <div class="muted">Requires Developer role and explicit confirmation. This drops the entire database.</div>
      <div class="inline">
        <div><label>Type DROP to confirm</label><input v-model.trim="dbConfirm" placeholder="DROP" /></div>
        <button class="secondary" @click="dbPurge">Purge Database</button>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../api/client'

const adminUserId = ref('')
const targetPlayerId = ref('')
const targetUserId = ref('')
const profile = ref(null)
const newName = ref('')

const searchQuery = ref('')
const searchResults = ref([])

const modStatus = ref('Active')
const modRole = ref('Player')
const modTitle = ref('')
const titles = ref([])

const currency = ref({ moneyDelta: 0, pointsDelta: 0, meritsDelta: 0, xmasCoinsDelta: 0, halloweenCoinsDelta: 0, easterCoinsDelta: 0 })
const expDelta = ref(0)
const levelSet = ref(1)
const resources = ref({ energyDelta: 0, nerveDelta: 0, happyDelta: 0 })
const battle = ref({ strength: 0, speed: 0, dexterity: 0, defense: 0 })
const work = ref({ manuallabor: 0, intelligence: 0, endurance: 0, employeEfficiency: 0 })

const generalIncludeNPC = ref('false')
const generalMoneyAmount = ref(0)

const invItemId = ref('')
const invQty = ref(1)
const invStatus = ref('')

const item = ref({ name: '', type: 'tools', id: 0, price: 0, sellable: true, usable: true, description: '' })
const createItemStatus = ref('')
const items = ref([])

// Effect builder state
const ebEnable = ref({ energy: true, nerve: false, happy: false, points: false, b_str: false, b_dex: false, b_spd: false, b_def: false, cdAlcohol: false, cdBooster: false, cdDrug: false, cdMedical: false })
const ebEnergy = ref(0)
const ebNerve = ref(0)
const ebHappy = ref(0)
const ebPoints = ref(0)
const ebBonus = ref({ strength: 0, dexterity: 0, speed: 0, defense: 0 })
const ebCooldowns = ref({ alcohol: 0, booster: 0, drug: 0, medical: 0 })
const effectJson = ref('')
const overdoseJson = ref('')
const passiveJson = ref('')
const cacheMoneyMin = ref(0)
const cacheMoneyMax = ref(0)
const cacheMoneyChancePct = ref(100)
const cachePointsMin = ref(0)
const cachePointsMax = ref(0)
const cachePointsChancePct = ref(0)
const cacheItems = ref([])

const stockSymbol = ref('')
const stockShares = ref(1)
const stockAvgPrice = ref(null)

const bankAccounts = ref([])

const cdDrug = ref(0)
const cdMedical = ref(0)
const cdBooster = ref(0)
const cdAlcohol = ref(0)
const cdIncludeNPC = ref('false')
const cdCurrentSummary = ref('')

const dbConfirm = ref('')
const addictionValue = ref(0)

function num(n){ return Number(n).toLocaleString() }
function fmt(d){ try { return new Date(d).toLocaleString() } catch { return '' } }

function loadSavedIds(){
  try {
    const a = localStorage.getItem('nc_admin_uid')
    const t = localStorage.getItem('nc_target_uid')
    const pid = localStorage.getItem('nc_target_pid')
    if (a) adminUserId.value = a
    if (t) targetUserId.value = t
    if (pid) targetPlayerId.value = pid
  } catch {}
}
function onSaveIds(){
  try {
    localStorage.setItem('nc_admin_uid', adminUserId.value.trim())
    if (targetUserId.value) localStorage.setItem('nc_target_uid', targetUserId.value)
    if (targetPlayerId.value) localStorage.setItem('nc_target_pid', targetPlayerId.value)
    alert('Saved')
  } catch(e) { alert(e?.message || e) }
}

async function loadTitles(){
  try { const res = await api.get('/admin/player/titles'); titles.value = res.data?.titles || res.data || [] } catch {}
}

async function onLoadPlayer(){
  try {
    if (!adminUserId.value) throw new Error('Fill Admin userId')
    const pid = Number(targetPlayerId.value)
    if (!Number.isFinite(pid)) throw new Error('Enter a valid numeric player id')
    const q = encodeURIComponent(String(pid))
    const resp = await api.get(`/admin/players/search?adminUserId=${encodeURIComponent(adminUserId.value)}&q=${q}&limit=5`)
    const match = (resp.data?.results || []).find((p)=> Number(p.id) === pid)
    if (!match) throw new Error('Player not found')
    targetUserId.value = match.userId
    localStorage.setItem('nc_target_uid', match.userId)
    targetPlayerId.value = String(pid)
    localStorage.setItem('nc_target_pid', String(pid))
  const prof = await api.get(`/player/profile/${pid}`)
  profile.value = prof.data || prof
    modStatus.value = profile.value.playerStatus || 'Active'
    modRole.value = profile.value.playerRole || 'Player'
    if (titles.value.includes(profile.value.playerTitle)) modTitle.value = profile.value.playerTitle
  // prefill identity editor
  newName.value = String(profile.value.name || '')
    // prefill battle/work stat editors
    const bs = profile.value.battleStats || {}
    battle.value = { strength: Number(bs.strength||0), speed: Number(bs.speed||0), dexterity: Number(bs.dexterity||0), defense: Number(bs.defense||0) }
    const ws = profile.value.workStats || {}
    work.value = { manuallabor: Number(ws.manuallabor||0), intelligence: Number(ws.intelligence||0), endurance: Number(ws.endurance||0), employeEfficiency: Number(ws.employeEfficiency||0) }
  } catch (e) { alert(e?.response?.data?.error || e?.message || 'Failed') }
}

function useSearchPlayer(p){
  targetUserId.value = p.userId
  localStorage.setItem('nc_target_uid', p.userId)
  if (p.id) {
    targetPlayerId.value = String(p.id)
    localStorage.setItem('nc_target_pid', String(p.id))
  }
}

let searchTimer = null
function onSearchDebounced(){ clearTimeout(searchTimer); searchTimer = setTimeout(onSearch, 350) }
async function onSearch(){
  try {
    const q = searchQuery.value.trim()
    if (!q) { searchResults.value = []; return }
    const param = adminUserId.value ? `&adminUserId=${encodeURIComponent(adminUserId.value)}` : ''
    const res = await api.get(`/admin/players/search?q=${encodeURIComponent(q)}${param}`)
    searchResults.value = res.data?.results || []
  } catch { searchResults.value = [] }
}

function ensureTarget(){
  const t = targetUserId.value?.trim()
  if (!t) throw new Error('Please load/select a target player first')
  return t
}

async function applyName(){
  try {
    const t = ensureTarget()
    const name = newName.value?.trim()
    if (!name) throw new Error('Enter a name (3-32 chars)')
    const body = { targetUserId: t, name }
    if (adminUserId.value) body.adminUserId = adminUserId.value
    const res = await api.patch('/admin/player/name', body)
    if (profile.value) profile.value.name = res.data?.name || name
    alert('Name updated')
  } catch (e) { alert(e?.response?.data?.error || e?.message || 'Failed') }
}

// Admin actions
async function applyCurrency(){
  try {
    const t = ensureTarget()
    const body = { targetUserId: t, ...currency.value }
    if (adminUserId.value) body.adminUserId = adminUserId.value
    const res = await api.patch('/admin/currency', body)
    alert('Updated: ' + JSON.stringify(res.data || res))
  } catch (e) { alert(e?.response?.data?.error || e?.message || 'Failed') }
}
async function applyExp(){
  try {
    const t = ensureTarget()
    const body = { targetUserId: t, expDelta: Number(expDelta.value || 0) }
    if (adminUserId.value) body.adminUserId = adminUserId.value
    const res = await api.patch('/admin/xp', body)
    alert('Exp: ' + JSON.stringify(res.data || res))
  } catch (e) { alert(e?.response?.data?.error || e?.message || 'Failed') }
}
async function applyLevel(){
  try {
    const t = ensureTarget()
    const body = { targetUserId: t, level: Number(levelSet.value || 1) }
    if (adminUserId.value) body.adminUserId = adminUserId.value
    const res = await api.patch('/admin/level', body)
    alert('Level: ' + JSON.stringify(res.data || res))
  } catch (e) { alert(e?.response?.data?.error || e?.message || 'Failed') }
}
async function applyResources(){
  try {
    const t = ensureTarget()
    const body = { targetUserId: t, ...resources.value }
    if (adminUserId.value) body.adminUserId = adminUserId.value
    const res = await api.patch('/admin/resources', body)
    alert('Resources: ' + JSON.stringify(res.data || res))
  } catch (e) { alert(e?.response?.data?.error || e?.message || 'Failed') }
}

async function applyBattleStats(){
  try {
    const t = ensureTarget()
    const body = { targetUserId: t, ...battle.value }
    if (adminUserId.value) body.adminUserId = adminUserId.value
    const res = await api.patch('/admin/stats/battle', body)
    // update profile locally
    if (profile.value) profile.value.battleStats = res.data?.battleStats || profile.value.battleStats
    alert('Battle stats set')
  } catch (e) { alert(e?.response?.data?.error || e?.message || 'Failed') }
}

async function applyWorkStats(){
  try {
    const t = ensureTarget()
    const body = { targetUserId: t, ...work.value }
    if (adminUserId.value) body.adminUserId = adminUserId.value
    const res = await api.patch('/admin/stats/work', body)
    if (profile.value) profile.value.workStats = res.data?.workStats || profile.value.workStats
    alert('Work stats set')
  } catch (e) { alert(e?.response?.data?.error || e?.message || 'Failed') }
}

// Quick resource maxers
function assertProfile(){ if (!profile.value) throw new Error('Load a target profile first') }
async function energyToMax(){
  try {
    assertProfile();
    const cur = Number(profile.value?.vitals?.energy||0), max = Number(profile.value?.vitals?.energyMax||0)
    if (!Number.isFinite(max)) throw new Error('No energy max available')
    resources.value.energyDelta = (max - cur)
    await applyResources()
  } catch(e){ alert(e?.message || 'Failed') }
}
async function nerveToMax(){
  try {
    assertProfile();
    const cur = Number(profile.value?.vitals?.nerve||0), max = Number(profile.value?.vitals?.nerveMax||0)
    if (!Number.isFinite(max)) throw new Error('No nerve max available')
    resources.value.nerveDelta = (max - cur)
    await applyResources()
  } catch(e){ alert(e?.message || 'Failed') }
}
async function happyToMax(){
  try {
    assertProfile();
    const cur = Number(profile.value?.vitals?.happy||0), max = Number(profile.value?.vitals?.happyMax||0)
    if (!Number.isFinite(max)) throw new Error('No happy max available')
    resources.value.happyDelta = (max - cur)
    await applyResources()
  } catch(e){ alert(e?.message || 'Failed') }
}

async function invAdd(){
  try {
    const t = ensureTarget()
    const body = { targetUserId: t, itemId: invItemId.value.trim(), qty: Number(invQty.value || 1) }
    if (adminUserId.value) body.adminUserId = adminUserId.value
    const res = await api.post('/admin/inventory/add', body)
    invStatus.value = 'Inventory: ' + JSON.stringify(res.data || res)
  } catch (e) { alert(e?.response?.data?.error || e?.message || 'Failed') }
}
async function invRemove(){
  try {
    const t = ensureTarget()
    const body = { targetUserId: t, itemId: invItemId.value.trim(), qty: Number(invQty.value || 1) }
    if (adminUserId.value) body.adminUserId = adminUserId.value
    const res = await api.post('/admin/inventory/remove', body)
    invStatus.value = 'Inventory: ' + JSON.stringify(res.data || res)
  } catch (e) { alert(e?.response?.data?.error || e?.message || 'Failed') }
}

function buildEffectObject(){
  const obj = {}
  if (ebEnable.value.energy && Number(ebEnergy.value)) obj.energy = Number(ebEnergy.value)
  if (ebEnable.value.nerve && Number(ebNerve.value)) obj.nerve = Number(ebNerve.value)
  if (ebEnable.value.happy && Number(ebHappy.value)) obj.happy = Number(ebHappy.value)
  if (ebEnable.value.points && Number(ebPoints.value)) obj.points = Number(ebPoints.value)
  // Bonuses block
  const b = {}
  if (ebEnable.value.b_str && Number(ebBonus.value.strength)) b.strength = Number(ebBonus.value.strength)
  if (ebEnable.value.b_dex && Number(ebBonus.value.dexterity)) b.dexterity = Number(ebBonus.value.dexterity)
  if (ebEnable.value.b_spd && Number(ebBonus.value.speed)) b.speed = Number(ebBonus.value.speed)
  if (ebEnable.value.b_def && Number(ebBonus.value.defense)) b.defense = Number(ebBonus.value.defense)
  if (Object.keys(b).length) obj.bonuses = b
  // Cooldowns
  const cds = {}
  if (ebEnable.value.cdAlcohol && Number(ebCooldowns.value.alcohol)) cds.alcohol = Number(ebCooldowns.value.alcohol)
  if (ebEnable.value.cdBooster && Number(ebCooldowns.value.booster)) cds.booster = Number(ebCooldowns.value.booster)
  if (ebEnable.value.cdDrug && Number(ebCooldowns.value.drug)) cds.drug = Number(ebCooldowns.value.drug)
  if (ebEnable.value.cdMedical && Number(ebCooldowns.value.medical)) cds.medical = Number(ebCooldowns.value.medical)
  if (Object.keys(cds).length) obj.cooldowns = cds
  // Cache
  if (item.value.type === 'cache') {
    const cache = {}
    const min = Number(cacheMoneyMin.value||0)
    const max = Number(cacheMoneyMax.value||0)
    const chancePct = Number(cacheMoneyChancePct.value||0)
    if (min || max) {
      cache.money = { min, max: Math.max(min, max) }
      if (chancePct > 0) cache.moneyChance = Math.max(0, Math.min(100, chancePct)) / 100
    }
    // Points in cache
    const pMin = Number(cachePointsMin.value||0)
    const pMax = Number(cachePointsMax.value||0)
    const pChancePct = Number(cachePointsChancePct.value||0)
    if (pMin || pMax) {
      cache.points = { min: pMin, max: Math.max(pMin, pMax) }
      if (pChancePct > 0) cache.pointsChance = Math.max(0, Math.min(100, pChancePct)) / 100
    }
    const list = (cacheItems.value || [])
      .filter(r => (r?.id||'').trim())
      .map(r => {
        const o = { id: String(r.id).trim() }
        const qmin = Number(r.qtyMin||0), qmax = Number(r.qtyMax||0)
        if (qmin || qmax) { o.minQty = Math.max(1, qmin || 1); o.maxQty = Math.max(o.minQty, qmax || qmin || 1) }
        const cp = Number(r.chancePct||0)
        if (cp) o.chance = Math.max(0, Math.min(100, cp)) / 100
        return o
      })
      .filter(o => o.id)
    if (list.length) cache.items = list
    if (Object.keys(cache).length) obj.cache = cache
  }
  return obj
}
function applyEffectBuilder(){
  try { effectJson.value = JSON.stringify(buildEffectObject()) } catch {}
}
function loadEffectFromJson(){
  try {
    const obj = JSON.parse(effectJson.value || '{}')
    ebEnergy.value = Number(obj.energy||0); ebEnable.value.energy = 'energy' in obj
    ebNerve.value = Number(obj.nerve||0); ebEnable.value.nerve = 'nerve' in obj
    ebHappy.value = Number(obj.happy||0); ebEnable.value.happy = 'happy' in obj
    ebPoints.value = Number(obj.points||0); ebEnable.value.points = 'points' in obj
    const bon = obj.bonuses || {}
    ebBonus.value.strength = Number(bon.strength||0); ebEnable.value.b_str = 'strength' in bon
    ebBonus.value.dexterity = Number(bon.dexterity||0); ebEnable.value.b_dex = 'dexterity' in bon
    ebBonus.value.speed = Number(bon.speed||0); ebEnable.value.b_spd = 'speed' in bon
    ebBonus.value.defense = Number(bon.defense||0); ebEnable.value.b_def = 'defense' in bon
    const cds = obj.cooldowns || {}
    ebCooldowns.value.alcohol = Number(cds.alcohol||0); ebEnable.value.cdAlcohol = 'alcohol' in cds
    ebCooldowns.value.booster = Number(cds.booster||0); ebEnable.value.cdBooster = 'booster' in cds
    ebCooldowns.value.drug = Number(cds.drug||0); ebEnable.value.cdDrug = 'drug' in cds
    ebCooldowns.value.medical = Number(cds.medical||0); ebEnable.value.cdMedical = 'medical' in cds
    const cache = obj.cache || {}
    if (cache && typeof cache === 'object') {
      const m = cache.money
      if (typeof m === 'number') { cacheMoneyMin.value = m; cacheMoneyMax.value = m }
      else if (m && typeof m === 'object') {
        cacheMoneyMin.value = Number(m.min||0)
        cacheMoneyMax.value = Number(m.max||0)
      }
      cacheMoneyChancePct.value = Math.round((Number(cache.moneyChance||0) || 0) * 100)
      const p = cache.points
      if (typeof p === 'number') { cachePointsMin.value = p; cachePointsMax.value = p }
      else if (p && typeof p === 'object') {
        cachePointsMin.value = Number(p.min||0)
        cachePointsMax.value = Number(p.max||0)
      } else { cachePointsMin.value = 0; cachePointsMax.value = 0 }
      cachePointsChancePct.value = Math.round((Number(cache.pointsChance||0) || 0) * 100)
      cacheItems.value = Array.isArray(cache.items) ? cache.items.map(x => ({ id: x.id, qtyMin: x.minQty||x.qty||1, qtyMax: x.maxQty||x.qty||1, chancePct: Math.round((Number(x.chance||0)||0)*100) })) : []
    } else {
      cacheMoneyMin.value = 0; cacheMoneyMax.value = 0; cacheMoneyChancePct.value = 100; cacheItems.value = []
      cachePointsMin.value = 0; cachePointsMax.value = 0; cachePointsChancePct.value = 0
    }
  } catch {}
}
function presetXanax(){
  // Typical: drug with strong happy/energy, addiction, drug cooldown 12h
  ebEnable.value.energy = false; ebEnergy.value = 0
  ebEnable.value.nerve = false; ebNerve.value = 0
  ebEnable.value.happy = true; ebHappy.value = 2500
  ebEnable.value.points = false; ebPoints.value = 0
  ebEnable.value.cdDrug = true; ebCooldowns.value.drug = 12*3600
  applyEffectBuilder()
  item.value.type = 'drugs'
}
function presetEnergy250(){
  ebEnable.value.energy = true; ebEnergy.value = 250
  ebEnable.value.nerve = false; ebNerve.value = 0
  ebEnable.value.happy = false; ebHappy.value = 0
  ebEnable.value.points = false; ebPoints.value = 0
  ebEnable.value.cdBooster = true; ebCooldowns.value.booster = 3600
  applyEffectBuilder()
  item.value.type = 'enhancers'
}
function presetBoosterSmall(){
  ebEnable.value.energy = true; ebEnergy.value = 50
  ebEnable.value.nerve = true; ebNerve.value = 2
  ebEnable.value.happy = true; ebHappy.value = 250
  ebEnable.value.points = false; ebPoints.value = 0
  ebEnable.value.cdBooster = true; ebCooldowns.value.booster = 1800
  applyEffectBuilder()
  item.value.type = 'enhancers'
}

async function fetchItems(){
  try { const res = await api.get('/items'); items.value = res.data || [] } catch { items.value = [] }
}
async function deleteItem(id){
  try { await api.delete(`/items/${id}`); await fetchItems() } catch (e) { alert(e?.response?.data?.error || e?.message || 'Failed') }
}
function downloadAllItems(){
  // Navigate browser to trigger file download
  try {
    const base = (localStorage.getItem('nc_api') || '/api').replace(/\/$/, '')
    window.location.href = `${base}/items/download`
  } catch { /* no-op */ }
}

function addCacheItem(){ cacheItems.value.push({ id: '', qty: 1 }) }
function removeCacheItem(idx){ cacheItems.value.splice(idx, 1) }

async function createItem(){
  try {
    const payload = { ...item.value }
    // Map UI 'booster' to backend 'enhancers' type
    if (payload.type === 'booster') payload.type = 'enhancers'
    // attach type-specific JSONs
    if (['medicine','alchool','enhancers','drugs','cache'].includes(payload.type)) {
      payload.effect = effectJson.value ? JSON.parse(effectJson.value) : buildEffectObject()
    }
    if (['alchool','drugs'].includes(payload.type)) {
      payload.overdoseEffect = overdoseJson.value ? JSON.parse(overdoseJson.value) : {}
    }
    if (['tools','collectibles'].includes(payload.type)) {
      payload.passiveEffect = passiveJson.value ? JSON.parse(passiveJson.value) : {}
    }
    const res = await api.post('/items/create', payload)
    createItemStatus.value = 'Created: ' + JSON.stringify(res.data || res)
    await fetchItems()
  } catch (e) { alert(e?.response?.data?.error || e?.message || 'Failed creating item') }
}

async function stockAdd(){
  try {
    const t = ensureTarget()
    const body = { targetUserId: t, symbol: stockSymbol.value.trim().toUpperCase(), shares: Number(stockShares.value || 1) }
    if (stockAvgPrice.value != null && stockAvgPrice.value !== '') body.avgPrice = Number(stockAvgPrice.value)
    if (adminUserId.value) body.adminUserId = adminUserId.value
    const res = await api.post('/admin/stocks/add', body)
    alert('Portfolio: ' + JSON.stringify(res.data || res))
  } catch (e) { alert(e?.response?.data?.error || e?.message || 'Failed') }
}
async function stockRemove(){
  try {
    const t = ensureTarget()
    const body = { targetUserId: t, symbol: stockSymbol.value.trim().toUpperCase(), shares: Number(stockShares.value || 1) }
    if (adminUserId.value) body.adminUserId = adminUserId.value
    const res = await api.post('/admin/stocks/remove', body)
    alert('Portfolio: ' + JSON.stringify(res.data || res))
  } catch (e) { alert(e?.response?.data?.error || e?.message || 'Failed') }
}
async function stockCrash(){
  try {
    if (!adminUserId.value) throw new Error('Fill Admin userId')
    const body = { adminUserId: adminUserId.value }
    const sym = stockSymbol.value.trim().toUpperCase()
    if (sym) body.symbol = sym
    const res = await api.post('/admin/stocks/crash', body)
    alert('Crash applied: ' + JSON.stringify(res.data || res))
  } catch (e) { alert(e?.response?.data?.error || e?.message || 'Failed') }
}
async function stockRocket(){
  try {
    if (!adminUserId.value) throw new Error('Fill Admin userId')
    const body = { adminUserId: adminUserId.value }
    const sym = stockSymbol.value.trim().toUpperCase()
    if (sym) body.symbol = sym
    const res = await api.post('/admin/stocks/rocket', body)
    alert('Rocket applied: ' + JSON.stringify(res.data || res))
  } catch (e) { alert(e?.response?.data?.error || e?.message || 'Failed') }
}

async function loadAccounts(){
  try {
    const t = ensureTarget()
    const res = await api.get(`/bank/accounts/${encodeURIComponent(t)}`)
    bankAccounts.value = (res.data?.accounts || res.data || [])
  } catch (e) { alert(e?.response?.data?.error || e?.message || 'Failed') }
}
async function forceWithdraw(accountId){
  try {
    const t = ensureTarget()
    const body = { targetUserId: t, accountId }
    if (adminUserId.value) body.adminUserId = adminUserId.value
    const res = await api.post('/admin/bank/force-withdraw', body)
    alert('Payout: ' + JSON.stringify(res.data || res))
    await loadAccounts()
  } catch (e) { alert(e?.response?.data?.error || e?.message || 'Failed') }
}

async function generalEnergyMax(){
  try {
    if (!adminUserId.value) throw new Error('Fill Admin userId')
    const includeNPC = String(generalIncludeNPC.value) === 'true'
    const res = await api.post('/admin/general/energy-max', { adminUserId: adminUserId.value, includeNPC })
    alert(`Energy set to max for ${(res.data?.modified||0)}/${(res.data?.matched||0)} players`)
  } catch (e) { alert(e?.response?.data?.error || e?.message || 'Failed') }
}
async function generalGiveMoney(){
  try {
    if (!adminUserId.value) throw new Error('Fill Admin userId')
    const includeNPC = String(generalIncludeNPC.value) === 'true'
    const amountVal = Number(generalMoneyAmount.value || 0)
    if (!Number.isFinite(amountVal) || amountVal === 0) throw new Error('Enter a non-zero amount')
    const res = await api.post('/admin/general/give-money', { adminUserId: adminUserId.value, includeNPC, amount: amountVal })
    alert(`Money updated (+${amountVal}) for ${(res.data?.modified||0)}/${(res.data?.matched||0)} players`)
  } catch (e) { alert(e?.response?.data?.error || e?.message || 'Failed') }
}

// Moderation
async function applyStatus(){
  try {
    const t = ensureTarget()
    const body = { targetUserId: t, status: modStatus.value }
    if (adminUserId.value) body.adminUserId = adminUserId.value
    const res = await api.patch('/admin/player/status', body)
    alert('Status set: ' + JSON.stringify(res.data || res))
  } catch (e) { alert(e?.response?.data?.error || e?.message || 'Failed') }
}
async function applyRole(){
  try {
    const t = ensureTarget()
    const body = { targetUserId: t, role: modRole.value }
    if (adminUserId.value) body.adminUserId = adminUserId.value
    const res = await api.patch('/admin/player/role', body)
    alert('Role set: ' + JSON.stringify(res.data || res))
  } catch (e) { alert(e?.response?.data?.error || e?.message || 'Failed') }
}
async function applyTitle(){
  try {
    const t = ensureTarget()
    const body = { targetUserId: t, title: modTitle.value }
    if (adminUserId.value) body.adminUserId = adminUserId.value
    const res = await api.patch('/admin/player/title', body)
    alert('Title set: ' + JSON.stringify(res.data || res))
  } catch (e) { alert(e?.response?.data?.error || e?.message || 'Failed') }
}

// Cooldowns
async function cdLoad(){
  try {
    const t = ensureTarget()
    const param = adminUserId.value ? `?adminUserId=${encodeURIComponent(adminUserId.value)}` : ''
    const res = await api.get(`/admin/player/cooldowns/${encodeURIComponent(t)}${param}`)
    const cd = res.data?.cooldowns || {}
    const lines = [
      `drugCooldown: ${cd.drugCooldown||0}s`,
      `medicalCooldown: ${cd.medicalCooldown||0}s`,
      `boosterCooldown: ${cd.boosterCooldown||0}s`,
      `alcoholCooldown: ${cd.alcoholCooldown||0}s`,
    ]
    const perDrug = cd.drugs || {}
    if (Object.keys(perDrug).length) lines.push('per-drug: ' + JSON.stringify(perDrug))
    cdCurrentSummary.value = lines.join(' | ')
  } catch (e) { alert(e?.response?.data?.error || e?.message || 'Failed') }
}
async function cdSet(category){
  try {
    const t = ensureTarget()
    const map = { drug: cdDrug.value, medical: cdMedical.value, booster: cdBooster.value, alcohol: cdAlcohol.value }
    const body = { targetUserId: t, category, seconds: Number(map[category] || 0) }
    if (adminUserId.value) body.adminUserId = adminUserId.value
    const res = await api.post('/admin/player/cooldowns/set', body)
    alert('Cooldown set: ' + JSON.stringify(res.data || res))
    await cdLoad()
  } catch (e) { alert(e?.response?.data?.error || e?.message || 'Failed') }
}
async function cdClear(scope){
  try {
    const t = ensureTarget()
    const body = { targetUserId: t, scope }
    if (adminUserId.value) body.adminUserId = adminUserId.value
    const res = await api.post('/admin/player/cooldowns/clear', body)
    alert('Cooldowns cleared: ' + JSON.stringify(res.data || res))
    await cdLoad()
  } catch (e) { alert(e?.response?.data?.error || e?.message || 'Failed') }
}
async function cdResetAll(){
  try {
    if (!adminUserId.value) throw new Error('Fill Admin userId')
    const includeNPC = String(cdIncludeNPC.value) === 'true'
    const res = await api.post('/admin/cooldowns/reset-all', { adminUserId: adminUserId.value, includeNPC })
    alert(`Cooldowns reset for ${(res.data?.modified||0)}/${(res.data?.matched||0)} players`)
  } catch (e) { alert(e?.response?.data?.error || e?.message || 'Failed') }
}

// Database purge (danger)
async function dbPurge(){
  try {
    if (!adminUserId.value) throw new Error('Fill Admin userId')
    if (dbConfirm.value.trim() !== 'DROP') throw new Error('Type DROP to confirm')
    const res = await api.post('/admin/database/purge', { adminUserId: adminUserId.value, confirm: dbConfirm.value.trim() })
    alert('Database dropped: ' + JSON.stringify(res.data || res))
  } catch (e) { alert(e?.response?.data?.error || e?.message || 'Failed') }
}

// Addiction
async function setAddiction(){
  try {
    const t = ensureTarget()
    const val = Math.max(0, Number(addictionValue.value||0))
    const body = { targetUserId: t, value: val }
    if (adminUserId.value) body.adminUserId = adminUserId.value
    const res = await api.patch('/admin/player/addiction', body)
    alert('Addiction set: ' + JSON.stringify(res.data || res))
  } catch (e) { alert(e?.response?.data?.error || e?.message || 'Failed') }
}

onMounted(() => { loadSavedIds(); loadTitles(); fetchItems() })
</script>

<style scoped>
.admin-container { max-width: 1100px; margin: 24px auto; padding: 0 16px; }
.page-title { margin: 0 0 12px; }
.card { background: var(--panel); border: 1px solid var(--border); border-radius: 10px; padding: 16px; margin: 16px 0; color: var(--text); }
.card h3 { margin: 0 0 12px; font-size: 18px; color: var(--text); }
.row { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; }
label { display: block; font-size: 12px; color: var(--muted); margin-bottom: 4px; }
input, select { width: 100%; padding: 8px 10px; border: 1px solid var(--border); border-radius: 8px; background: rgba(255,255,255,0.04); color: var(--text); }
.actions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin-top: 8px; }
button { padding: 8px 12px; background: var(--accent); color: #fff; border: 1px solid transparent; border-radius: 8px; cursor: pointer; }
button.secondary { background: transparent; color: var(--text); border-color: var(--border); }
.list { margin-top: 8px; border-top: 1px dashed var(--border); padding-top: 8px; font-size: 14px; color: var(--text); }
.muted { color: var(--muted); font-size: 12px; }
.inline { display: flex; align-items: end; gap: 8px; flex-wrap: wrap; }
.list-row { display: flex; justify-content: space-between; align-items: center; padding: 6px 0; }
.pill { padding: 2px 8px; background: rgba(255,255,255,0.06); border:1px solid var(--border); border-radius:999px; font-size:12px; }
</style>
