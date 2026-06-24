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
      const debts = await turso.execute({ sql: 'SELECT d.*, c.name as customer_name FROM debts d LEFT JOIN customers c ON d.customer_id = c.id WHERE d.tenant_id = ? ORDER BY d.created_at DESC', args: [tenant_id as string] });
      return res.status(200).json(debts.rows);
    }
    if (req.method === 'POST') {
      const d = req.body;
      await turso.execute({ sql: 'INSERT INTO debts (id, tenant_id, customer_id, amount, currency, description, status, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', args: [d.id, tenant_id as string, d.customer_id, d.amount, d.currency || 'SAR', d.description || null, d.status || 'pending', d.created_by, d.created_at] });
      return res.status(201).json({ success: true });
    }
    if (req.method === 'PUT') {
      const d = req.body;
      await turso.execute({ sql: 'UPDATE debts SET amount = ?, status = ?, description = ? WHERE id = ? AND tenant_id = ?', args: [d.amount, d.status, d.description || null, d.id, tenant_id as string] });
      return res.status(200).json({ success: true });
    }
    if (req.method === 'DELETE') {
      const { id } = req.query;
      await turso.execute({ sql: 'DELETE FROM debts WHERE id = ? AND tenant_id = ?', args: [id as string, tenant_id as string] });
      return res.status(200).json({ success: true });
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
