import type { VercelRequest, VercelResponse } from '@vercel/node';
import { turso } from '../../db/turso';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { tenant_id } = req.query;
    if (!tenant_id) return res.status(400).json({ error: 'tenant_id required' });

    if (req.method === 'GET') {
      const r = await turso.execute({ sql: 'SELECT * FROM exchange_rates WHERE tenant_id = ? ORDER BY updated_at DESC LIMIT 1', args: [tenant_id as string] });
      return res.status(200).json(r.rows[0] || null);
    }
    if (req.method === 'POST' || req.method === 'PUT') {
      const { sar_to_yer } = req.body;
      const now = new Date().toISOString();
      const existing = await turso.execute({ sql: 'SELECT * FROM exchange_rates WHERE tenant_id = ?', args: [tenant_id as string] });
      if (existing.rows.length > 0) {
        await turso.execute({ sql: 'UPDATE exchange_rates SET sar_to_yer = ?, updated_at = ? WHERE tenant_id = ?', args: [sar_to_yer, now, tenant_id as string] });
      } else {
        const id = 'rate_' + Math.floor(Math.random() * 1000000);
        await turso.execute({ sql: 'INSERT INTO exchange_rates (id, tenant_id, sar_to_yer, updated_at) VALUES (?, ?, ?, ?)', args: [id, tenant_id as string, sar_to_yer, now] });
      }
      return res.status(200).json({ success: true });
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
