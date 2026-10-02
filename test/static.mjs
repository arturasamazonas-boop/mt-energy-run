// Every module imported by the browser must exist on disk.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const seen = new Set();
function resolve(spec, from) {
  if (spec.startsWith('/shared/')) return path.join('shared', spec.slice(8));
  if (spec.startsWith('/')) return path.join('public', spec.slice(1));
  return path.join(path.dirname(from), spec);
}
function visit(file) {
  if (seen.has(file)) return;
  seen.add(file);
  assert.ok(fs.existsSync(file), `missing module ${file}`);
  const src = fs.readFileSync(file, 'utf8');
  for (const m of src.matchAll(/(?:import|export)[^'"]*?from\s*['"]([^'"]+)['"]/g)) visit(resolve(m[1], file));
}
visit('public/js/main.js');
visit('public/dev/preview.js');
const html = fs.readFileSync('public/index.html', 'utf8');
for (const m of html.matchAll(/(?:href|src)="(\/[^"]+)"/g)) assert.ok(fs.existsSync(path.join('public', m[1])), `missing ${m[1]}`);
for (const f of fs.readFileSync('public/css/fonts.css', 'utf8').matchAll(/url\((\/fonts\/[^)]+)\)/g)) assert.ok(fs.existsSync(path.join('public', f[1])), `missing ${f[1]}`);
console.log(`ok (${seen.size} modules)`);
