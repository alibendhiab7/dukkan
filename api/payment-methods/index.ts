import type { VercelRequest, VercelResponse } from '@vercel/node';
import { turso } from '../db/turso';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'GET') {
      const r = await turso.execute('SELECT * FROM platform_payment_methods ORDER BY created_at DESC');
      return res.status(200).json(r.rows);
    }

    if (req.method === 'POST') {
      const p = req.body;
      const id = p.id || 'pm_' + Math.floor(Math.random() * 1000000);
      await turso.execute({
        sql: 'INSERT INTO platform_payment_methods (id, name, details, is_active, created_at) VALUES (?, ?, ?, ?, ?)',
        args: [
          id,
          p.name,
          p.details || '',
          p.is_active ? 1 : 0,
          new Date().toISOString()
        ]
      });
      return res.status(201).json({ success: true, id });
    }

    if (req.method === 'PUT') {
      const p = req.body;
      await turso.execute({
        sql: 'UPDATE platform_payment_methods SET name = ?, details = ?, is_active = ? WHERE id = ?',
        args: [p.name, p.details || '', p.is_active ? 1 : 0, p.id]
      });
      return res.status(200).json({ success: true });
    }

    if (req.method === 'DELETE') {
      const { id } = req.query;
      await turso.execute({ sql: 'DELETE FROM platform_payment_methods WHERE id = ?', args: [id as string] });
      return res.status(200).json({ success: true });
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
