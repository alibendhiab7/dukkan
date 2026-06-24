import { migrate } from './schema';

migrate()
  .then(() => process.exit(0))
  .catch((e) => { console.error('[Migrate] Failed:', e); process.exit(1); });
