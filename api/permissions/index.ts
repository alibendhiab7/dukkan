import type { VercelRequest, VercelResponse } from '@vercel/node';
import { turso } from '../../db/turso';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { tenant_id } = req.query;
    if (!tenant_id) return res.status(400).json({ error: 'tenant_id required' });

    if (req.method === 'GET') {
      const r = await turso.execute({ sql: 'SELECT * FROM user_permissions WHERE tenant_id = ?', args: [tenant_id as string] });
      const perms: Record<string, Record<string, boolean>> = {};
      for (const row of r.rows as any[]) {
        if (!perms[row.user_id]) perms[row.user_id] = {};
        perms[row.user_id][row.permission_key] = Boolean(row.is_granted);
      }
      return res.status(200).json(perms);
    }
    if (req.method === 'POST') {
      const { user_id, permissions } = req.body;
      await turso.execute({ sql: 'DELETE FROM user_permissions WHERE user_id = ?', args: [user_id] });
      for (const [key, val] of Object.entries(permissions as Record<string, boolean>)) {
        const id = `${user_id}_${key}`;
        await turso.execute({ sql: 'INSERT INTO user_permissions (id, tenant_id, user_id, permission_key, is_granted) VALUES (?, ?, ?, ?, ?)', args: [id, tenant_id as string, user_id, key, val ? 1 : 0] });
      }
      return res.status(200).json({ success: true });
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
