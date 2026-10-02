// Runs every test file in sequence. PostgreSQL tests run only when TEST_DATABASE_URL is set.
import { execFileSync } from 'node:child_process';

const tests = ['worldgen.mjs', 'sim.mjs', 'feasibility.mjs', 'rules.mjs', 'store.mjs', 'api.mjs', 'static.mjs'];
for (const t of tests) {
  process.stdout.write(`• ${t} … `);
  execFileSync(process.execPath, [`test/${t}`], { stdio: 'inherit' });
}
console.log('All tests passed.');
