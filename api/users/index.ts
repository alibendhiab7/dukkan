import type { VercelRequest, VercelResponse } from '@vercel/node';
import { turso } from '../../db/turso';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'GET') {
      const { tenant_id, username } = req.query;
      if (username && tenant_id) {
        const r = await turso.execute({ sql: 'SELECT * FROM users WHERE tenant_id = ? AND username = ?', args: [tenant_id as string, username as string] });
        return res.status(200).json(r.rows[0] || null);
      }
      if (username) {
        const r = await turso.execute({ sql: 'SELECT * FROM users WHERE username = ?', args: [username as string] });
        return res.status(200).json(r.rows[0] || null);
      }
      if (tenant_id) {
        const r = await turso.execute({ sql: 'SELECT * FROM users WHERE tenant_id = ?', args: [tenant_id as string] });
        return res.status(200).json(r.rows);
      }
      const r = await turso.execute('SELECT * FROM users');
      return res.status(200).json(r.rows);
    }

    if (req.method === 'POST') {
      const u = req.body;
      await turso.execute({ sql: 'INSERT INTO users (id, tenant_id, username, password_hash, role) VALUES (?, ?, ?, ?, ?)', args: [u.id, u.tenant_id, u.username, u.password_hash, u.role] });
      return res.status(201).json({ success: true });
    }

    if (req.method === 'PUT') {
      const u = req.body;
      await turso.execute({ sql: 'UPDATE users SET username = ?, password_hash = ?, role = ? WHERE id = ? AND tenant_id = ?', args: [u.username, u.password_hash, u.role, u.id, u.tenant_id] });
      return res.status(200).json({ success: true });
    }

    if (req.method === 'DELETE') {
      const { id, tenant_id } = req.query;
      await turso.execute({ sql: 'DELETE FROM users WHERE id = ? AND tenant_id = ?', args: [id as string, tenant_id as string] });
      return res.status(200).json({ success: true });
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
