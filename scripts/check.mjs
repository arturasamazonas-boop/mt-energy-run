// Syntax check for every JS module in the project (node --check).
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const roots = ['server', 'shared', 'public/js', 'public/dev', 'scripts', 'test'];
const files = ['server.mjs', 'public/sw.js'];
const walk = (d) => {
  for (const f of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, f.name);
    if (f.isDirectory()) walk(p);
    else if (/\.(m?js)$/.test(f.name)) files.push(p);
  }
};
roots.forEach((r) => fs.existsSync(r) && walk(r));
let bad = 0;
for (const f of files) {
  try {
    execFileSync(process.execPath, ['--check', f], { stdio: 'pipe' });
  } catch (e) {
    bad++;
    console.error(`✗ ${f}\n${e.stderr}`);
  }
}
JSON.parse(fs.readFileSync('public/manifest.webmanifest', 'utf8'));
console.log(bad ? `${bad} file(s) failed` : `syntax OK (${files.length} files)`);
process.exit(bad ? 1 : 0);
