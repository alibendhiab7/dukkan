import type { VercelRequest, VercelResponse } from '@vercel/node';
import { turso } from '../db/turso';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'GET') {
      const { code } = req.query;
      if (code) {
        const r = await turso.execute({
          sql: 'SELECT * FROM platform_coupons WHERE code = ? AND is_active = 1',
          args: [(code as string).toUpperCase().trim()]
        });
        return res.status(200).json(r.rows[0] || null);
      }
      const r = await turso.execute('SELECT * FROM platform_coupons ORDER BY created_at DESC');
      return res.status(200).json(r.rows);
    }

    if (req.method === 'POST') {
      const c = req.body;
      const id = c.id || 'cp_' + Math.floor(Math.random() * 1000000);
      await turso.execute({
        sql: 'INSERT INTO platform_coupons (id, code, discount_type, discount_value, expires_at, max_uses, used_count, is_active, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        args: [
          id,
          c.code.toUpperCase().trim(),
          c.discount_type,
          c.discount_value,
          c.expires_at,
          c.max_uses || 100,
          c.used_count || 0,
          c.is_active ? 1 : 0,
          new Date().toISOString()
        ]
      });
      return res.status(201).json({ success: true, id });
    }

    if (req.method === 'PUT') {
      const c = req.body;
      await turso.execute({
        sql: 'UPDATE platform_coupons SET code = ?, discount_type = ?, discount_value = ?, expires_at = ?, max_uses = ?, used_count = ?, is_active = ? WHERE id = ?',
        args: [
          c.code.toUpperCase().trim(),
          c.discount_type,
          c.discount_value,
          c.expires_at,
          c.max_uses,
          c.used_count,
          c.is_active ? 1 : 0,
          c.id
        ]
      });
      return res.status(200).json({ success: true });
    }

    if (req.method === 'DELETE') {
      const { id } = req.query;
      await turso.execute({ sql: 'DELETE FROM platform_coupons WHERE id = ?', args: [id as string] });
      return res.status(200).json({ success: true });
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
