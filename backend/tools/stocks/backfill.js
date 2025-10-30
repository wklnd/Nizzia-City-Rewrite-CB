#!/usr/bin/env node
/*
  Stock History Backfill Tool
  Usage:
    node backend/tools/stocks/backfill.js [--days 90] [--step 15] [--symbols NIZZ,FLY]

  Options:
    --days     How many days back to generate (1-365). Default 90.
    --step     Minutes between synthetic samples (1-60). Default 15.
    --symbols  Comma-separated list of symbols to backfill. Default: all.

  Notes:
    - Reads MongoDB URI from .env (MONGODB_URI) or uses default local DB.
    - Does not overwrite existing data; it generates up to the earliest existing point.
*/

require('dotenv').config();
const path = require('path');
const connectDB = require('../../config/db');
const { backfillHistory } = require('../../services/stockService');

function parseArgs(argv){
  const out = { days: 90, step: 15, symbols: null };
  for (let i = 2; i < argv.length; i++){
    const a = argv[i];
    if (a === '--days') { out.days = Math.min(365, Math.max(1, Number(argv[++i] || out.days))); continue; }
    if (a === '--step') { out.step = Math.min(60, Math.max(1, Number(argv[++i] || out.step))); continue; }
    if (a === '--symbols') {
      const v = (argv[++i] || '').trim();
      out.symbols = v ? v.split(',').map(s=>s.trim().toUpperCase()).filter(Boolean) : null;
      continue;
    }
    if (a === '--help' || a === '-h') { out.help = true; }
  }
  return out;
}

async function main(){
  const args = parseArgs(process.argv);
  if (args.help){
    console.log('Usage: node backend/tools/stocks/backfill.js [--days 90] [--step 15] [--symbols NIZZ,FLY]');
    process.exit(0);
  }
  await connectDB();
  const { results, since, stepMinutes } = await backfillHistory({ symbols: args.symbols, days: args.days, stepMinutes: args.step });
  console.log(`Backfill complete since ${since.toISOString()} (step ${stepMinutes}m):`);
  for (const r of results){
    console.log(`  ${r.symbol}: inserted ${r.inserted}`);
  }
  process.exit(0);
}

main().catch(err => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
