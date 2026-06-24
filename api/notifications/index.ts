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
      const r = await turso.execute({ sql: 'SELECT * FROM notifications WHERE tenant_id = ? ORDER BY created_at DESC', args: [tenant_id as string] });
      return res.status(200).json(r.rows);
    }
    if (req.method === 'POST') {
      const n = req.body;
      const id = 'notif_' + Math.floor(Math.random() * 1000000);
      await turso.execute({ sql: 'INSERT INTO notifications (id, tenant_id, title, message, type, is_read, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)', args: [id, tenant_id as string, n.title, n.message, n.type || 'info', n.is_read ? 1 : 0, new Date().toISOString()] });
      return res.status(201).json({ success: true });
    }
    if (req.method === 'PUT') {
      const { id, is_read } = req.body;
      await turso.execute({ sql: 'UPDATE notifications SET is_read = ? WHERE id = ? AND tenant_id = ?', args: [is_read ? 1 : 0, id, tenant_id as string] });
      return res.status(200).json({ success: true });
    }
    if (req.method === 'DELETE') {
      const { id } = req.query;
      await turso.execute({ sql: 'DELETE FROM notifications WHERE id = ? AND tenant_id = ?', args: [id as string, tenant_id as string] });
      return res.status(200).json({ success: true });
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
