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
      const r = await turso.execute({ sql: 'SELECT * FROM financial_costs WHERE tenant_id = ? ORDER BY cost_date DESC', args: [tenant_id as string] });
      return res.status(200).json(r.rows);
    }
    if (req.method === 'POST') {
      const c = req.body;
      await turso.execute({ sql: 'INSERT INTO financial_costs (id, tenant_id, category, description, amount, currency, cost_date, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', args: [c.id, tenant_id as string, c.category, c.description, c.amount, c.currency || 'SAR', c.cost_date, c.created_by, c.created_at] });
      return res.status(201).json({ success: true });
    }
    if (req.method === 'PUT') {
      const c = req.body;
      await turso.execute({ sql: 'UPDATE financial_costs SET category = ?, description = ?, amount = ?, currency = ?, cost_date = ? WHERE id = ? AND tenant_id = ?', args: [c.category, c.description, c.amount, c.currency, c.cost_date, c.id, tenant_id as string] });
      return res.status(200).json({ success: true });
    }
    if (req.method === 'DELETE') {
      const { id } = req.query;
      await turso.execute({ sql: 'DELETE FROM financial_costs WHERE id = ? AND tenant_id = ?', args: [id as string, tenant_id as string] });
      return res.status(200).json({ success: true });
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
