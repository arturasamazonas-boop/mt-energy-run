// Entry point. Uses PostgreSQL when DATABASE_URL is set, otherwise an in-memory store.
import { createApp } from './server/app.mjs';
import { createMemoryStore } from './server/store-memory.mjs';

const port = Number(process.env.PORT || 3000);
const production = process.env.NODE_ENV === 'production';

let store;
if (process.env.DATABASE_URL) {
  const { createPgStore } = await import('./server/store-pg.mjs');
  store = createPgStore(process.env.DATABASE_URL);
} else {
  if (production) console.warn('[mt-energy-run] WARNING: DATABASE_URL is not set – progress is kept in memory only and is lost on restart.');
  store = createMemoryStore();
}
await store.init();

const server = createApp({
  store,
  adminToken: process.env.ADMIN_TOKEN || '',
  birthdayMode: process.env.BIRTHDAY_MODE || 'auto',
});
server.listen(port, () => console.log(`[mt-energy-run] listening on http://localhost:${port} (storage: ${store.kind})`));

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    server.close();
    store.close().finally(() => process.exit(0));
  });
}
