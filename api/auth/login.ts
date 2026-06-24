import type { VercelRequest, VercelResponse } from '@vercel/node';
import { turso } from '../../db/turso';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'POST') {
      const { username, password, tenant_id } = req.body;
      let user;
      if (tenant_id) {
        const r = await turso.execute({ sql: 'SELECT * FROM users WHERE tenant_id = ? AND username = ?', args: [tenant_id, username] });
        user = r.rows[0] as any;
      }
      if (!user) {
        const r = await turso.execute({ sql: 'SELECT * FROM users WHERE username = ?', args: [username] });
        user = r.rows[0] as any;
      }
      if (!user) return res.status(401).json({ error: 'Invalid credentials' });

      const tenant = await turso.execute({ sql: 'SELECT * FROM tenants WHERE id = ?', args: [user.tenant_id] });
      return res.status(200).json({ user, tenant: tenant.rows[0] || null });
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
