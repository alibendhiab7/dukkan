import type { VercelRequest, VercelResponse } from '@vercel/node';
import { turso } from '../db/turso';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'GET') {
      const { tenant_id, id, search } = req.query;
      if (id && tenant_id) {
        const r = await turso.execute({ sql: 'SELECT * FROM customers WHERE id = ? AND tenant_id = ?', args: [id as string, tenant_id as string] });
        return res.status(200).json(r.rows[0] || null);
      }
      if (search && tenant_id) {
        const r = await turso.execute({ sql: 'SELECT * FROM customers WHERE tenant_id = ? AND (name LIKE ? OR phone LIKE ?)', args: [tenant_id as string, `%${search}%`, `%${search}%`] });
        return res.status(200).json(r.rows);
      }
      if (tenant_id) {
        const r = await turso.execute({ sql: 'SELECT * FROM customers WHERE tenant_id = ? ORDER BY created_at DESC', args: [tenant_id as string] });
        return res.status(200).json(r.rows);
      }
      const r = await turso.execute('SELECT * FROM customers');
      return res.status(200).json(r.rows);
    }

    if (req.method === 'POST') {
      const c = req.body;
      await turso.execute({ sql: 'INSERT INTO customers (id, tenant_id, name, phone, email, address, loyalty_points, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', args: [c.id, c.tenant_id, c.name, c.phone, c.email || null, c.address || null, c.loyalty_points || 0, c.created_at] });
      return res.status(201).json({ success: true });
    }

    if (req.method === 'PUT') {
      const c = req.body;
      await turso.execute({ sql: 'UPDATE customers SET name = ?, phone = ?, email = ?, address = ?, loyalty_points = ? WHERE id = ? AND tenant_id = ?', args: [c.name, c.phone, c.email || null, c.address || null, c.loyalty_points, c.id, c.tenant_id] });
      return res.status(200).json({ success: true });
    }

    if (req.method === 'DELETE') {
      const { id, tenant_id } = req.query;
      await turso.execute({ sql: 'DELETE FROM customers WHERE id = ? AND tenant_id = ?', args: [id as string, tenant_id as string] });
      return res.status(200).json({ success: true });
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
