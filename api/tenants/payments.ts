import type { VercelRequest, VercelResponse } from '@vercel/node';
import { turso } from '../db/turso';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'GET') {
      const { tenant_id } = req.query;
      if (tenant_id) {
        const r = await turso.execute({ 
          sql: 'SELECT * FROM tenant_payments WHERE tenant_id = ? ORDER BY payment_date DESC', 
          args: [tenant_id as string] 
        });
        return res.status(200).json(r.rows);
      }
      const r = await turso.execute('SELECT * FROM tenant_payments ORDER BY payment_date DESC');
      return res.status(200).json(r.rows);
    }

    if (req.method === 'POST') {
      const p = req.body;
      const id = p.id || 'pmt_' + Math.floor(Math.random() * 1000000);
      await turso.execute({ 
        sql: 'INSERT INTO tenant_payments (id, tenant_id, amount, payment_date, payment_type, license_plan, duration_days, max_users, notes, performed_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', 
        args: [
          id, 
          p.tenant_id, 
          p.amount, 
          p.payment_date || new Date().toISOString(), 
          p.payment_type, 
          p.license_plan, 
          p.duration_days, 
          p.max_users, 
          p.notes || '', 
          p.performed_by || 'sysadmin'
        ] 
      });
      return res.status(201).json({ success: true, id });
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
