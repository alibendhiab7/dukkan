import type { VercelRequest, VercelResponse } from '@vercel/node';
import { turso } from '../db/turso';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'GET') {
      const { tenant_id, id, client_code } = req.query;
      if (client_code) {
        const r = await turso.execute({ sql: 'SELECT * FROM tenants WHERE client_code = ?', args: [client_code as string] });
        return res.status(200).json(r.rows[0] || null);
      }
      const targetId = tenant_id || id;
      if (targetId) {
        const r = await turso.execute({ sql: 'SELECT * FROM tenants WHERE id = ?', args: [targetId as string] });
        return res.status(200).json(r.rows[0] || null);
      }
      const r = await turso.execute('SELECT * FROM tenants');
      return res.status(200).json(r.rows);
    }

    if (req.method === 'POST') {
      const t = req.body;
      await turso.execute({ sql: 'INSERT INTO tenants (id, client_code, store_name, status, subscription_expires_at, license_plan, max_users) VALUES (?, ?, ?, ?, ?, ?, ?)', args: [t.id, t.client_code, t.store_name, t.status || 'active', t.subscription_expires_at, t.license_plan, t.max_users || 5] });
      return res.status(201).json({ success: true });
    }

    if (req.method === 'PUT') {
      const t = req.body;
      await turso.execute({ sql: 'UPDATE tenants SET client_code = ?, store_name = ?, status = ?, subscription_expires_at = ?, license_plan = ?, max_users = ? WHERE id = ?', args: [t.client_code, t.store_name, t.status, t.subscription_expires_at, t.license_plan, t.max_users || 5, t.id] });
      return res.status(200).json({ success: true });
    }

    if (req.method === 'DELETE') {
      const { id } = req.query;
      const tenantId = id as string;
      if (!tenantId) {
        return res.status(400).json({ error: 'Missing tenant ID' });
      }

      await turso.batch([
        { sql: 'DELETE FROM audit_logs WHERE tenant_id = ?', args: [tenantId] },
        { sql: 'DELETE FROM debt_logs WHERE tenant_id = ?', args: [tenantId] },
        { sql: 'DELETE FROM debts WHERE tenant_id = ?', args: [tenantId] },
        { sql: 'DELETE FROM return_items WHERE return_id IN (SELECT id FROM product_returns WHERE tenant_id = ?)', args: [tenantId] },
        { sql: 'DELETE FROM product_returns WHERE tenant_id = ?', args: [tenantId] },
        { sql: 'DELETE FROM sale_items WHERE sale_id IN (SELECT id FROM sales WHERE tenant_id = ?)', args: [tenantId] },
        { sql: 'DELETE FROM sales WHERE tenant_id = ?', args: [tenantId] },
        { sql: 'DELETE FROM inventory_movements WHERE tenant_id = ?', args: [tenantId] },
        { sql: 'DELETE FROM promotions WHERE tenant_id = ?', args: [tenantId] },
        { sql: 'DELETE FROM coupons WHERE tenant_id = ?', args: [tenantId] },
        { sql: 'DELETE FROM customers WHERE tenant_id = ?', args: [tenantId] },
        { sql: 'DELETE FROM financial_costs WHERE tenant_id = ?', args: [tenantId] },
        { sql: 'DELETE FROM notifications WHERE tenant_id = ?', args: [tenantId] },
        { sql: 'DELETE FROM exchange_rates WHERE tenant_id = ?', args: [tenantId] },
        { sql: 'DELETE FROM products WHERE tenant_id = ?', args: [tenantId] },
        { sql: 'DELETE FROM user_permissions WHERE tenant_id = ?', args: [tenantId] },
        { sql: 'DELETE FROM users WHERE tenant_id = ?', args: [tenantId] },
        { sql: 'DELETE FROM tenant_settings WHERE tenant_id = ?', args: [tenantId] },
        { sql: 'DELETE FROM tenant_payments WHERE tenant_id = ?', args: [tenantId] },
        { sql: 'DELETE FROM tenants WHERE id = ?', args: [tenantId] }
      ]);

      return res.status(200).json({ success: true });
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
