import { migrate } from './schema';
import { seed } from './seed';

migrate()
  .then(() => seed())
  .then(() => process.exit(0))
  .catch((e) => { console.error('[Seed] Failed:', e); process.exit(1); });
