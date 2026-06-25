import type { VercelRequest, VercelResponse } from '@vercel/node';
import { turso } from '../db/turso';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const tenant_id = (req.query.tenant_id as string) || (req.body?.tenant_id as string);
    if (!tenant_id) return res.status(400).json({ error: 'tenant_id required' });

    if (req.method === 'GET') {
      const r = await turso.execute({ sql: 'SELECT * FROM promotions WHERE tenant_id = ? ORDER BY valid_from DESC', args: [tenant_id as string] });
      return res.status(200).json(r.rows);
    }
    if (req.method === 'POST') {
      const p = req.body;
      await turso.execute({ sql: 'INSERT INTO promotions (id, tenant_id, name, type, product_id, min_qty, free_qty, discount_percent, valid_from, valid_to, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', args: [p.id, tenant_id as string, p.name, p.type, p.product_id || null, p.min_qty || 0, p.free_qty || 0, p.discount_percent || null, p.valid_from, p.valid_to, p.is_active ? 1 : 0] });
      return res.status(201).json({ success: true });
    }
    if (req.method === 'PUT') {
      const p = req.body;
      await turso.execute({ sql: 'UPDATE promotions SET name = ?, type = ?, product_id = ?, min_qty = ?, free_qty = ?, discount_percent = ?, valid_from = ?, valid_to = ?, is_active = ? WHERE id = ? AND tenant_id = ?', args: [p.name, p.type, p.product_id || null, p.min_qty, p.free_qty, p.discount_percent || null, p.valid_from, p.valid_to, p.is_active ? 1 : 0, p.id, tenant_id as string] });
      return res.status(200).json({ success: true });
    }
    if (req.method === 'DELETE') {
      const { id } = req.query;
      await turso.execute({ sql: 'DELETE FROM promotions WHERE id = ? AND tenant_id = ?', args: [id as string, tenant_id as string] });
      return res.status(200).json({ success: true });
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
