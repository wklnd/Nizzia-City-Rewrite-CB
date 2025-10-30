#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const backendRoot = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.resolve(repoRoot, 'backend');

// Directories to ignore (npm packages excluded via node_modules)
const IGNORE_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', 'coverage', '.next', '.cache'
]);

// File extensions to include
const ALLOWED_EXT = new Set(['.js', '.mjs', '.cjs', '.ts']);

// Skip minified files
const MINIFIED_RE = /\.min\.(js|mjs|cjs)$/i;

async function countFileLines(filePath) {
  const data = await fs.promises.readFile(filePath, 'utf8');
  // Count all lines (including blanks); adjust if you want to exclude blanks/comments
  return data.split(/\r\n|\r|\n/).length;
}

async function walk(dir) {
  const dirents = await fs.promises.readdir(dir, { withFileTypes: true });
  let files = 0;
  let lines = 0;

  for (const de of dirents) {
    // Skip ignored dirs
    if (de.isDirectory()) {
      if (IGNORE_DIRS.has(de.name)) continue;
      const sub = await walk(path.join(dir, de.name));
      files += sub.files;
      lines += sub.lines;
      continue;
    }

    if (de.isFile()) {
      const ext = path.extname(de.name);
      if (!ALLOWED_EXT.has(ext)) continue;
      if (MINIFIED_RE.test(de.name)) continue;

      const full = path.join(dir, de.name);
      const lc = await countFileLines(full);
      files += 1;
      lines += lc;
    }
  }
  return { files, lines };
}

(async () => {
  try {
    const exists = fs.existsSync(backendRoot);
    if (!exists) {
      console.error(`Backend folder not found: ${backendRoot}`);
      process.exit(1);
    }
    const { files, lines } = await walk(backendRoot);
    console.log(`Backend path: ${backendRoot}`);
    console.log(`Files counted: ${files}`);
    console.log(`Total LOC (all lines): ${lines}`);
    console.log(`Excluded directories: ${Array.from(IGNORE_DIRS).join(', ')}`);
    console.log(`Included extensions: ${Array.from(ALLOWED_EXT).join(', ')}`);
  } catch (e) {
    console.error('Error while counting LOC:', e.message);
    process.exit(1);
  }
})();