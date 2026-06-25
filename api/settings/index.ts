import type { VercelRequest, VercelResponse } from '@vercel/node';
import { turso } from '../db/turso';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const tenant_id = (req.query.tenant_id as string) || (req.body?.tenant_id as string);
    if (!tenant_id) return res.status(400).json({ error: 'tenant_id required' });

    if (req.method === 'GET') {
      const r = await turso.execute({ sql: 'SELECT * FROM tenant_settings WHERE tenant_id = ?', args: [tenant_id as string] });
      const s = r.rows[0] as any;
      if (s) {
        s.enable_inventory = Boolean(s.enable_inventory);
        s.enable_sales = Boolean(s.enable_sales);
        s.enable_reports = Boolean(s.enable_reports);
        s.enable_employees = Boolean(s.enable_employees);
      }
      return res.status(200).json(s || null);
    }
    if (req.method === 'POST' || req.method === 'PUT') {
      const s = req.body;
      const inv = s.enable_inventory ? 1 : 0;
      const sal = s.enable_sales ? 1 : 0;
      const rep = s.enable_reports ? 1 : 0;
      const emp = s.enable_employees ? 1 : 0;
      const existing = await turso.execute({ sql: 'SELECT * FROM tenant_settings WHERE tenant_id = ?', args: [tenant_id as string] });
      if (existing.rows.length > 0) {
        await turso.execute({ sql: 'UPDATE tenant_settings SET enable_inventory = ?, enable_sales = ?, enable_reports = ?, enable_employees = ? WHERE tenant_id = ?', args: [inv, sal, rep, emp, tenant_id as string] });
      } else {
        await turso.execute({ sql: 'INSERT INTO tenant_settings (tenant_id, enable_inventory, enable_sales, enable_reports, enable_employees) VALUES (?, ?, ?, ?, ?)', args: [tenant_id as string, inv, sal, rep, emp] });
      }
      return res.status(200).json({ success: true });
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
