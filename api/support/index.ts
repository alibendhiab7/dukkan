import type { VercelRequest, VercelResponse } from '@vercel/node';
import { turso } from '../db/turso';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'GET') {
      const { tenant_id } = req.query;
      if (tenant_id && tenant_id !== '0') {
        const r = await turso.execute({
          sql: 'SELECT * FROM support_tickets WHERE tenant_id = ? ORDER BY created_at DESC',
          args: [tenant_id as string]
        });
        return res.status(200).json(r.rows);
      }
      const r = await turso.execute('SELECT * FROM support_tickets ORDER BY created_at DESC');
      return res.status(200).json(r.rows);
    }

    if (req.method === 'POST') {
      const t = req.body;
      const id = t.id || 'tk_' + Math.floor(Math.random() * 1000000);
      await turso.execute({
        sql: 'INSERT INTO support_tickets (id, tenant_id, title, description, status, priority, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        args: [
          id,
          t.tenant_id,
          t.title,
          t.description,
          t.status || 'open',
          t.priority || 'medium',
          new Date().toISOString()
        ]
      });
      return res.status(201).json({ success: true, id });
    }

    if (req.method === 'PUT') {
      const t = req.body;
      const now = new Date().toISOString();
      await turso.execute({
        sql: 'UPDATE support_tickets SET status = ?, response = ?, resolved_at = ? WHERE id = ?',
        args: [t.status, t.response || null, t.response ? now : null, t.id]
      });

      if (t.response) {
        const notifId = 'notif_tk_' + Math.floor(Math.random() * 1000000);
        await turso.execute({
          sql: 'INSERT INTO notifications (id, tenant_id, title, message, type, is_read, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
          args: [notifId, t.tenant_id, 'تم الرد على تذكرة الدعم الفني', `رد الإدارة: ${t.response.substring(0, 100)}...`, 'info', 0, now]
        });
      }
      return res.status(200).json({ success: true });
    }

    if (req.method === 'DELETE') {
      const { id } = req.query;
      await turso.execute({ sql: 'DELETE FROM support_tickets WHERE id = ?', args: [id as string] });
      return res.status(200).json({ success: true });
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
