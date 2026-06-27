import type { VercelRequest, VercelResponse } from '@vercel/node';
import { turso } from '../db/turso';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const { title, message, type } = req.body;
    
    // Select all active tenants except system admin (id = 0)
    const tenants = await turso.execute("SELECT id FROM tenants WHERE id != '0'");
    const now = new Date().toISOString();
    
    const queries = tenants.rows.map(t => {
      const id = 'notif_bc_' + Math.floor(Math.random() * 1000000);
      return {
        sql: 'INSERT INTO notifications (id, tenant_id, title, message, type, is_read, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        args: [
          id,
          (t as any).id,
          title,
          message,
          type || 'info',
          0,
          now
        ]
      };
    });

    if (queries.length > 0) {
      await turso.batch(queries);
    }

    return res.status(200).json({ success: true, count: queries.length });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
