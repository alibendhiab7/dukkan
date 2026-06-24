import type { VercelRequest, VercelResponse } from '@vercel/node';
import { turso } from '../db/turso';
import { migrate } from '../db/schema';
import { seed } from '../db/seed';

let initialized = false;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (!initialized) {
      await migrate();
      await seed();
      initialized = true;
    }
    const result = await turso.execute('SELECT COUNT(*) as tables_count FROM sqlite_master WHERE type="table"');
    return res.status(200).json({ status: 'ok', tables: (result.rows[0] as any).tables_count });
  } catch (err: any) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
}
