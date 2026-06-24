import type { VercelRequest, VercelResponse } from '@vercel/node';
import { turso } from '../../db/turso';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { tenant_id, code } = req.query;
    if (req.method === 'GET') {
      if (code && tenant_id) {
        const r = await turso.execute({ sql: 'SELECT * FROM coupons WHERE code = ? AND tenant_id = ?', args: [(code as string).toUpperCase(), tenant_id as string] });
        return res.status(200).json(r.rows[0] || null);
      }
      if (tenant_id) {
        const r = await turso.execute({ sql: 'SELECT * FROM coupons WHERE tenant_id = ? ORDER BY created_at DESC', args: [tenant_id as string] });
        return res.status(200).json(r.rows);
      }
    }
    if (req.method === 'POST') {
      const c = req.body;
      await turso.execute({ sql: 'INSERT INTO coupons (id, tenant_id, code, discount_type, discount_value, max_uses, used_count, min_cart_total, expires_at, is_active, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', args: [c.id, c.tenant_id, c.code.toUpperCase(), c.discount_type, c.discount_value, c.max_uses, c.used_count || 0, c.min_cart_total || 0, c.expires_at, c.is_active ? 1 : 0, c.created_at] });
      return res.status(201).json({ success: true });
    }
    if (req.method === 'PUT') {
      const c = req.body;
      await turso.execute({ sql: 'UPDATE coupons SET code = ?, discount_type = ?, discount_value = ?, max_uses = ?, used_count = ?, min_cart_total = ?, expires_at = ?, is_active = ? WHERE id = ? AND tenant_id = ?', args: [c.code.toUpperCase(), c.discount_type, c.discount_value, c.max_uses, c.used_count, c.min_cart_total, c.expires_at, c.is_active ? 1 : 0, c.id, c.tenant_id] });
      return res.status(200).json({ success: true });
    }
    if (req.method === 'DELETE') {
      const { id, tenant_id } = req.query;
      await turso.execute({ sql: 'DELETE FROM coupons WHERE id = ? AND tenant_id = ?', args: [id as string, tenant_id as string] });
      return res.status(200).json({ success: true });
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
