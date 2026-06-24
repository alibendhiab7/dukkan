import type { VercelRequest, VercelResponse } from '@vercel/node';
import { turso } from '../../db/turso';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'GET') {
      const { tenant_id, client_code } = req.query;
      if (client_code) {
        const r = await turso.execute({ sql: 'SELECT * FROM tenants WHERE client_code = ?', args: [client_code as string] });
        return res.status(200).json(r.rows[0] || null);
      }
      if (tenant_id) {
        const r = await turso.execute({ sql: 'SELECT * FROM tenants WHERE id = ?', args: [tenant_id as string] });
        return res.status(200).json(r.rows[0] || null);
      }
      const r = await turso.execute('SELECT * FROM tenants');
      return res.status(200).json(r.rows);
    }

    if (req.method === 'POST') {
      const t = req.body;
      await turso.execute({ sql: 'INSERT INTO tenants (id, client_code, store_name, status, subscription_expires_at, license_plan) VALUES (?, ?, ?, ?, ?, ?)', args: [t.id, t.client_code, t.store_name, t.status || 'active', t.subscription_expires_at, t.license_plan] });
      return res.status(201).json({ success: true });
    }

    if (req.method === 'PUT') {
      const t = req.body;
      await turso.execute({ sql: 'UPDATE tenants SET client_code = ?, store_name = ?, status = ?, subscription_expires_at = ?, license_plan = ? WHERE id = ?', args: [t.client_code, t.store_name, t.status, t.subscription_expires_at, t.license_plan, t.id] });
      return res.status(200).json({ success: true });
    }

    if (req.method === 'DELETE') {
      const { id } = req.query;
      await turso.execute({ sql: 'DELETE FROM tenants WHERE id = ?', args: [id as string] });
      return res.status(200).json({ success: true });
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
