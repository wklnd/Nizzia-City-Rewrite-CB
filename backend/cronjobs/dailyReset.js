// Daily reset: accrue upkeep for each player's active property
const cron = require('node-cron');
const Player = require('../models/Player');
const { PROPERTIES } = require('../config/properties');

function startOfUtcDay(d){
	const x = new Date(d); x.setUTCHours(0,0,0,0); return x;
}

async function accrueUpkeepOnce(){
	const now = new Date();
	const today = startOfUtcDay(now).getTime();
	let processed = 0, accrued = 0;
	const cursor = Player.find({}, 'home properties').cursor();
	for await (const player of cursor) {
		processed++;
		const homeId = player.home || 'trailer';
		const def = PROPERTIES[homeId];
		if (!def) continue;
		// find or create home entry
		let entry = (player.properties || []).find(p => p.propertyId === homeId);
		if (!entry) {
			player.properties = player.properties || [];
			entry = { propertyId: homeId, upgrades: {}, acquiredAt: now, lastUpkeepPaidAt: null, lastUpkeepAccruedAt: null, upkeepDue: 0 };
			player.properties.push(entry);
		}
		const last = entry.lastUpkeepAccruedAt ? startOfUtcDay(entry.lastUpkeepAccruedAt).getTime() : 0;
		if (last === today) continue; // already accrued for today
		entry.upkeepDue = Number(entry.upkeepDue || 0) + Number(def.upkeep || 0);
		entry.lastUpkeepAccruedAt = now;
		try { player.markModified && player.markModified('properties'); } catch(_) {}
		try { await player.save(); accrued++; } catch(_) {}
	}
	console.log(`[dailyReset] processed=${processed} accrued=${accrued}`);
}

function scheduleDailyReset(){
	// Run at 00:05 UTC daily
	cron.schedule('5 0 * * *', () => {
		accrueUpkeepOnce().catch(e => console.error('[dailyReset] error', e?.message||e));
	});
	// initial run after startup if within first minute to avoid long wait in dev
	setTimeout(() => { accrueUpkeepOnce().catch(()=>{}); }, 15000);
}

module.exports = scheduleDailyReset;
