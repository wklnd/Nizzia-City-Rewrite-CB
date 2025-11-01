#!/usr/bin/env node
/**
 * Items Import/Export Tool
 *
 * Export all items to JSON or import items from a JSON file into MongoDB.
 *
 * Usage:
 *   # Export (pretty JSON)
 *   node backend/tools/items/itemsImportExport.js --export items_export.json --pretty
 *
 *   # Import (upsert by custom id, do not wipe existing)
 *   node backend/tools/items/itemsImportExport.js --import items_export.json
 *
 *   # Import after truncating the collection (DANGEROUS)
 *   node backend/tools/items/itemsImportExport.js --import items_export.json --truncate
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const connectDB = require('../../config/db');
const Item = require('../../models/Item');

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { pretty: false, upsert: true, truncate: false };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--export') out.exportFile = args[++i] || 'items_export.json';
    else if (a === '--import') out.importFile = args[++i];
    else if (a === '--file') out.file = args[++i];
    else if (a === '--pretty') out.pretty = true;
    else if (a === '--no-pretty') out.pretty = false;
    else if (a === '--truncate') out.truncate = true;
    else if (a === '--no-upsert') out.upsert = false;
  }
  // Allow --file as shorthand for either direction
  if (!out.exportFile && !out.importFile && out.file) {
    // Default to export if only --file provided
    out.exportFile = out.file;
  }
  return out;
}

async function exportItems(filePath, pretty = false) {
  const items = await Item.find().lean();
  // Remove mongoose metadata
  const clean = items.map(({ __v, ...rest }) => rest);
  const outPath = path.resolve(process.cwd(), filePath || 'items_export.json');
  const json = pretty ? JSON.stringify(clean, null, 2) : JSON.stringify(clean);
  fs.writeFileSync(outPath, json);
  console.log(`Exported ${clean.length} items -> ${outPath}`);
}

function toStringId(v) {
  // Force item.id to string; accept numbers and strings
  if (v == null) return '';
  return String(v);
}

function pickItemFields(obj) {
  // Whitelist fields to avoid accidental injection
  const out = {};
  const F = [
    'name', 'id', 'type', 'type2', 'description',
    'effect', 'overdoseEffect', 'passiveEffect',
    'damage', 'armor', 'quality', 'coverage',
    'price', 'sellable', 'usable'
  ];
  for (const k of F) if (k in obj) out[k] = obj[k];
  // Coerce id to string as per schema
  if ('id' in out) out.id = toStringId(out.id);
  return out;
}

async function importItems(filePath, { upsert = true, truncate = false } = {}) {
  const inPath = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(inPath)) throw new Error(`File not found: ${inPath}`);
  const raw = fs.readFileSync(inPath, 'utf8');
  let data = [];
  try {
    data = JSON.parse(raw);
  } catch (e) {
    throw new Error(`Invalid JSON: ${e.message}`);
  }
  const list = Array.isArray(data) ? data : (Array.isArray(data.items) ? data.items : []);
  if (!Array.isArray(list) || list.length === 0) {
    console.log('Nothing to import (empty list)');
    return { matched: 0, upserted: 0, created: 0 };
  }

  if (truncate) {
    const res = await Item.deleteMany({});
    console.log(`Truncated items collection (deleted ${res.deletedCount || 0})`);
  }

  let matched = 0, upserted = 0, created = 0, failed = 0;
  for (const row of list) {
    try {
      const payload = pickItemFields(row || {});
      if (!payload.name || !payload.id || !payload.type) {
        throw new Error('Missing required fields (name, id, type)');
      }
      if (upsert) {
        const exists = await Item.findOne({ id: payload.id });
        if (exists) {
          matched++;
          await Item.updateOne({ _id: exists._id }, { $set: payload });
        } else {
          await Item.create(payload);
          upserted++;
        }
      } else {
        await Item.create(payload);
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
      console.log('  node backend/tools/items/itemsImportExport.js --export <file> [--pretty]');
      console.log('  node backend/tools/items/itemsImportExport.js --import <file> [--truncate] [--no-upsert]');
      process.exit(2);
    }
    await connectDB();
    if (opts.exportFile) await exportItems(opts.exportFile, opts.pretty);
    if (opts.importFile) await importItems(opts.importFile, { upsert: opts.upsert, truncate: opts.truncate });
    process.exit(0);
  } catch (e) {
    console.error('Items import/export failed:', e?.message || e);
    process.exit(1);
  }
})();
