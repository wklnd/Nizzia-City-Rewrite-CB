#!/usr/bin/env node
/**
 * Properties Import/Export Tool
 *
 * Export all properties to JSON or import properties from a JSON file into MongoDB.
 * Falls back to config when DB is empty; this tool lets you seed/switch to DB-backed
 * catalog without changing runtime code.
 *
 * Usage:
 *   # Export (pretty JSON)
 *   node backend/tools/properties/propertiesImportExport.js --export props.json --pretty
 *
 *   # Import (upsert by id, do not wipe existing)
 *   node backend/tools/properties/propertiesImportExport.js --import props.json
 *
 *   # Import after truncating the collection (DANGEROUS)
 *   node backend/tools/properties/propertiesImportExport.js --import props.json --truncate
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const connectDB = require('../../config/db');
const { Property } = require('../../models/Property');

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { pretty: false, truncate: false, upsert: true };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--export') out.exportFile = args[++i] || 'properties_export.json';
    else if (a === '--import') out.importFile = args[++i];
    else if (a === '--file') out.file = args[++i];
    else if (a === '--pretty') out.pretty = true;
    else if (a === '--no-pretty') out.pretty = false;
    else if (a === '--truncate') out.truncate = true;
    else if (a === '--no-upsert') out.upsert = false;
  }
  if (!out.exportFile && !out.importFile && out.file) out.exportFile = out.file;
  return out;
}

function pickFields(obj){
  const out = {};
  const F = ['id','name','cost','upkeep','baseHappyMax','upgradeLimits','market'];
  for (const k of F) if (k in obj) out[k] = obj[k];
  if ('id' in out) out.id = String(out.id);
  return out;
}

async function exportProperties(filePath, pretty=false){
  const rows = await Property.find().lean();
  const clean = rows.map(({ __v, _id, ...rest }) => rest);
  const outPath = path.resolve(process.cwd(), filePath || 'properties_export.json');
  const json = pretty ? JSON.stringify(clean, null, 2) : JSON.stringify(clean);
  fs.writeFileSync(outPath, json);
  console.log(`Exported ${clean.length} properties -> ${outPath}`);
}

async function importProperties(filePath, { truncate=false, upsert=true } = {}){
  const inPath = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(inPath)) throw new Error(`File not found: ${inPath}`);
  const raw = fs.readFileSync(inPath, 'utf8');
  let data = [];
  try { data = JSON.parse(raw); } catch(e){ throw new Error(`Invalid JSON: ${e.message}`); }
  const list = Array.isArray(data) ? data : (Array.isArray(data.properties) ? data.properties : []);
  if (!Array.isArray(list) || list.length === 0) {
    console.log('Nothing to import (empty list)');
    return { matched: 0, upserted: 0, created: 0 };
  }
  if (truncate) {
    const res = await Property.deleteMany({});
    console.log(`Truncated properties collection (deleted ${res.deletedCount || 0})`);
  }
  let matched = 0, upserted = 0, created = 0, failed = 0;
  for (const row of list) {
    try {
      const payload = pickFields(row || {});
      if (!payload.id || !payload.name) throw new Error('Missing required fields (id, name)');
      if (upsert) {
        const existing = await Property.findOne({ id: payload.id });
        if (existing) {
          matched++;
          await Property.updateOne({ _id: existing._id }, { $set: payload });
        } else {
          await Property.create(payload);
          upserted++;
        }
      } else {
        await Property.create(payload);
        created++;
      }
    } catch (e) {
      failed++;
      console.error(`Import failed for id=${row?.id}:`, e.message || e);
    }
  }
  console.log(`Import complete. matched=${matched} upserted=${upserted} created=${created} failed=${failed}`);
  return { matched, upserted, created, failed };
}

(async () => {
  try {
    const opts = parseArgs();
    if (!opts.exportFile && !opts.importFile) {
      console.log('Usage:');
      console.log('  node backend/tools/properties/propertiesImportExport.js --export <file> [--pretty]');
      console.log('  node backend/tools/properties/propertiesImportExport.js --import <file> [--truncate] [--no-upsert]');
      process.exit(2);
    }
    await connectDB();
    if (opts.exportFile) await exportProperties(opts.exportFile, opts.pretty);
    if (opts.importFile) await importProperties(opts.importFile, { truncate: opts.truncate, upsert: opts.upsert });
    process.exit(0);
  } catch (e) {
    console.error('Properties import/export failed:', e?.message || e);
    process.exit(1);
  }
})();
