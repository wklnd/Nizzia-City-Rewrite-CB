#!/usr/bin/env node
/**
 * Reset all active cooldowns for players.
 *
 * Usage:
 *   node backend/tools/resetCooldowns.js              # reset for ALL players
 *   node backend/tools/resetCooldowns.js --user <id>  # reset for one player (numeric Player.id or User ObjectId)
 *   node backend/tools/resetCooldowns.js --dry        # show counts only, no writes
 */

require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Player = require('../models/Player');

function parseArgs(argv){
  const out = { dry:false, user:null };
  for (let i=2; i<argv.length; i++){
    const a = argv[i];
    if (a === '--dry' || a === '--dry-run') out.dry = true;
    else if (a === '--user' && i+1 < argv.length) { out.user = argv[++i]; }
  }
  return out;
}

async function resolvePlayerFilter(userArg){
  if (!userArg) return {};
  // Try as numeric Player.id
  const asNum = Number(userArg);
  if (!Number.isNaN(asNum)) {
    const p = await Player.findOne({ id: asNum }).select('_id');
    if (p) return { _id: p._id };
  }
  // Try as Player.user (auth id) or direct _id
  if (mongoose.Types.ObjectId.isValid(userArg)){
    const pByUser = await Player.findOne({ user: userArg }).select('_id');
    if (pByUser) return { _id: pByUser._id };
    // Fallback: direct _id
    return { _id: userArg };
  }
  // Fallback to user field match
  return { user: userArg };
}

async function main(){
  const args = parseArgs(process.argv);
  await connectDB();

  const filter = await resolvePlayerFilter(args.user);
  const baseUpdate = { $set: {
    'cooldowns.drugCooldown': 0,
    'cooldowns.boosterCooldown': 0,
    'cooldowns.medicalCooldown': 0,
    'cooldowns.alcoholCooldown': 0,
    'cooldowns.drugs': {},
  }};

  // Dry-run: count documents that currently have any active cooldowns
  const activeAny = {
    $or: [
      { 'cooldowns.drugCooldown': { $gt: 0 } },
      { 'cooldowns.boosterCooldown': { $gt: 0 } },
      { 'cooldowns.medicalCooldown': { $gt: 0 } },
      { 'cooldowns.alcoholCooldown': { $gt: 0 } },
      { 'cooldowns.drugs': { $exists: true, $ne: {} } },
    ]
  };
  const query = Object.keys(filter).length ? { $and: [filter, activeAny] } : activeAny;

  const count = await Player.countDocuments(query);
  console.log(`Players with any active cooldowns${args.user? ' (targeted)':''}: ${count}`);

  if (args.dry) {
    console.log('Dry-run: no changes applied.');
    await mongoose.connection.close();
    return;
  }

  const res = await Player.updateMany(query, baseUpdate);
  const modified = res.modifiedCount ?? res.nModified ?? 0;
  console.log(`Cooldowns reset. Modified documents: ${modified}`);

  await mongoose.connection.close();
}

main().catch(err => { console.error('Error resetting cooldowns:', err); try{ mongoose.connection.close(); }catch(_){} process.exit(1); });
