// Normalize Player records to satisfy current schema enums
// - Fix gender synonyms: Woman->Female, Man->Male, Non-binary/NB->Enby, lowercase variants
// Usage: node backend/tools/database/normalizePlayers.js

const mongoose = require('mongoose');
const connectDB = require('../../config/db');
const Player = require('../../models/Player');

function normalizeGender(g) {
  if (!g) return g;
  const s = String(g).trim().toLowerCase();
  if (s === 'male' || s === 'man' || s === 'm') return 'Male';
  if (s === 'female' || s === 'woman' || s === 'f') return 'Female';
  if (s === 'enby' || s === 'nb' || s === 'non-binary' || s === 'nonbinary' || s === 'non binary') return 'Enby';
  // If already correct casing
  if (g === 'Male' || g === 'Female' || g === 'Enby') return g;
  return null; // unknown/invalid
}

(async function main(){
  try {
    await connectDB();
    const total = await Player.countDocuments({});
    console.log(`Player count: ${total}`);
    const players = await Player.find({});
    let fixed = 0;
    let skipped = 0;
    for (const p of players) {
      const normalized = normalizeGender(p.gender);
      if (!normalized) { skipped++; continue; }
      if (normalized !== p.gender) {
        p.gender = normalized;
        try {
          await p.save();
          fixed++;
          console.log(`Fixed gender for player id=${p.id} name="${p.name}": ${p.gender}`);
        } catch (e) {
          console.error(`Failed to save player id=${p.id} name="${p.name}":`, e.message);
        }
      }
    }
    console.log(`Done. Fixed ${fixed} player(s). Skipped ${skipped}.`);
  } catch (err) {
    console.error('Fatal:', err);
  } finally {
    try { await mongoose.connection.close(); } catch {}
    process.exit(0);
  }
})();
