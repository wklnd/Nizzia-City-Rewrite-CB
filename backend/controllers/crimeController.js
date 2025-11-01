const Player = require('../models/Player');
const Item = require('../models/Item');
const { CRIMES, LOCATION } = require('../config/crimes/search_for_cash');

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)] }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min }

function findLocationById(id) {
	const entries = Object.values(LOCATION || {})
	return entries.find(l => l.id === id || l.id === String(id)) || null
}

async function resolvePlayer(userId) {
	if (!userId) return null
	const n = Number(userId)
	let player = null
	if (!Number.isNaN(n)) player = await Player.findOne({ id: n })
	if (!player) player = await Player.findOne({ user: userId })
	return player
}

// POST /api/crime/search-for-cash { userId, locationId? }
async function searchForCash(req, res) {
	try {
		const { userId, locationId } = req.body || {}
		if (!userId) return res.status(400).json({ error: 'userId is required' })
		const player = await resolvePlayer(userId)
		if (!player) return res.status(404).json({ error: 'Player not found' })

		// Use config for this crime
		const crime = CRIMES.search_for_cash
		const allowedLocs = Array.isArray(crime.location) ? crime.location : [crime.location].filter(Boolean)
		const nerveCost = Number(crime.nerveCost || 1)
		const nerve = Number(player.nerveStats?.nerve || 0)
		if (nerve < nerveCost) return res.status(400).json({ error: 'Not enough nerve' })

		// Resolve location: require selection and validate against config list
		if (!locationId) return res.status(400).json({ error: 'locationId is required' })
		if (allowedLocs.length && !allowedLocs.includes(locationId)) return res.status(400).json({ error: 'Invalid location for this crime' })
		const locId = locationId
		const loc = findLocationById(locId)
		if (!loc) return res.status(400).json({ error: 'Invalid location' })

			// No cooldown enforcement for crimes

			// Determine outcome from location-specific chances, adjusted by popularity
			// Popularity bucket by local time
			const hour = new Date().getHours()
			const bucket = hour >= 6 && hour < 12 ? 'morning' : hour >= 12 && hour < 18 ? 'afternoon' : hour >= 18 && hour < 22 ? 'evening' : 'night'
			const popTable = loc.PopularityAt || {}
			const popPerc = Number(popTable[bucket] || 50)
			const popularity = Math.max(0, Math.min(1, popPerc / 100)) // 0..1
			const critBase = Number(loc.CriticalFailChance || 0)
			const minorBase = Number(loc.MinorFailChance || 0)
			// Reduce fail chances up to 50% at max popularity
			const failFactor = 1 - 0.5 * popularity
			const critChance = Math.max(0, critBase * failFactor)
			const minorChance = Math.max(0, minorBase * failFactor)
			const rollOutcome = Math.random() * 100
			let outcome = 'success'
			if (rollOutcome < critChance) outcome = 'critical_fail'
			else if (rollOutcome < (critChance + minorChance)) outcome = 'minor_fail'

			const awarded = { money: 0, items: [] }
			const warnings = []
				if (outcome === 'success') {
				// Roll loot: independent chances per entry; aggregate
						for (const entry of (loc.loot || [])) {
							// Boost loot chances based on popularity (0.5x .. 1.5x)
							const base = Number(entry.chance || 0)
							const lootFactor = 0.5 + popularity // 0.5..1.5
							const effChance = Math.max(0, Math.min(100, base * lootFactor))
							const roll = Math.random() * 100
							if (roll <= effChance) {
						if (entry.type === 'money') {
							const min = Math.max(0, Number(entry.min || 0))
							const max = Math.max(min, Number(entry.max || min))
							const amt = randInt(min, max)
							awarded.money += amt
						} else if (entry.type === 'item') {
							const itemId = String(entry.value)
							const doc = await Item.findOne({ id: itemId })
							if (doc) {
								player.inventory = player.inventory || []
								const idx = player.inventory.findIndex((e) => String(e.item) === String(doc._id))
								if (idx >= 0) player.inventory[idx].qty = Number(player.inventory[idx].qty || 0) + 1
								else player.inventory.push({ item: doc._id, qty: 1 })
								awarded.items.push(itemId)
							} else {
								warnings.push(`Item ${itemId} not found`)
							}
						}
					}
				}
			}

		// Apply gains and costs
				if (outcome === 'success') {
				player.money = Number((Number(player.money || 0) + Number(awarded.money || 0)).toFixed(2))
			}
		if (player.nerveStats) player.nerveStats.nerve = Math.max(0, Number(nerve - nerveCost))

				// No cooldown recorded

			// Update counters and XP
			player.crimesCommitted = Number(player.crimesCommitted || 0) + 1
			let xpGained = 0
			if (outcome === 'success') {
				player.crimesSuccessful = Number(player.crimesSuccessful || 0) + 1
					// XP reward on success
					xpGained = Number(crime.expPerSuccess || 5)
				player.crimeExp = Number(player.crimeExp || 0) + xpGained
				player.exp = Number(player.exp || 0) + xpGained
				// Track per-crime XP
				const cid = CRIMES.search_for_cash.id
				if (!player.crimesXpList) player.crimesXpList = []
				const rec = player.crimesXpList.find((r) => r.crimeId === cid)
				if (rec) rec.exp = Number(rec.exp || 0) + xpGained
				else player.crimesXpList.push({ crimeId: cid, exp: xpGained })
			} else if (outcome === 'minor_fail') {
				player.crimesFails = Number(player.crimesFails || 0) + 1
					const failXp = Number(crime.expPerFail || 0)
					if (failXp > 0) { player.crimeExp = Number(player.crimeExp || 0) + failXp; player.exp = Number(player.exp || 0) + failXp }
			} else if (outcome === 'critical_fail') {
				player.crimesCriticalFails = Number(player.crimesCriticalFails || 0) + 1
					const failXp = Number(crime.expPerFail || 0)
					if (failXp > 0) { player.crimeExp = Number(player.crimeExp || 0) + failXp; player.exp = Number(player.exp || 0) + failXp }
					// Apply critical fail event if configured (e.g., injury)
					const ev = loc.CriticalFailEvent || null
					if (ev && ev.type === 'injury') {
						const current = Number(player.health || 0)
						const damage = Math.max(1, Math.floor(current * 0.2)) // 20% current HP
						player.health = Math.max(0, current - damage)
					}
			}

		await player.save()

				const response = {
				ok: true,
				location: loc.id,
				awarded,
				warnings,
					outcome,
					xpGained,
				money: player.money,
				nerve: player.nerveStats?.nerve || 0,
			}
		return res.json(response)
	} catch (e) {
		return res.status(500).json({ error: e.message })
	}
}

		async function getLocations(req, res) {
			try {
				// Return locations for search_for_cash based on config list
				const crime = CRIMES.search_for_cash
				const allowedIds = Array.isArray(crime.location) ? crime.location : [crime.location].filter(Boolean)
				// Helper to determine time-of-day bucket
				const hour = new Date().getHours()
				const bucket = hour >= 6 && hour < 12 ? 'morning' : hour >= 12 && hour < 18 ? 'afternoon' : hour >= 18 && hour < 22 ? 'evening' : 'night'
				const list = allowedIds
					.map((id) => Object.values(LOCATION || {}).find((l) => l.id === id))
					.filter(Boolean)
					.map((l) => {
						const table = l.PopularityAt || {}
						const perc = Number(table[bucket] || 50)
						const popularity = Math.max(0, Math.min(1, perc / 100))
						return { id: l.id, name: l.name, popularity }
					})
				res.json({ locations: list })
			} catch (e) {
				res.status(500).json({ error: e.message })
			}
		}

		module.exports = { searchForCash, getLocations }
