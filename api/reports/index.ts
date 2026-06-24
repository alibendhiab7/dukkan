import type { VercelRequest, VercelResponse } from '@vercel/node';
import { turso } from '../../db/turso';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { tenant_id, type } = req.query;

    if (type === 'dashboard' && tenant_id) {
      const [products, sales, customers, lowStock, costs] = await Promise.all([
        turso.execute({ sql: 'SELECT COUNT(*) as count FROM products WHERE tenant_id = ?', args: [tenant_id as string] }),
        turso.execute({ sql: 'SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as total FROM sales WHERE tenant_id = ?', args: [tenant_id as string] }),
        turso.execute({ sql: 'SELECT COUNT(*) as count FROM customers WHERE tenant_id = ?', args: [tenant_id as string] }),
        turso.execute({ sql: 'SELECT COUNT(*) as count FROM products WHERE tenant_id = ? AND quantity < 5', args: [tenant_id as string] }),
        turso.execute({ sql: 'SELECT COALESCE(SUM(amount), 0) as total FROM financial_costs WHERE tenant_id = ?', args: [tenant_id as string] }),
      ]);
      return res.status(200).json({
        products_count: (products.rows[0] as any).count,
        sales_count: (sales.rows[0] as any).count,
        sales_total: (sales.rows[0] as any).total,
        customers_count: (customers.rows[0] as any).count,
        low_stock_count: (lowStock.rows[0] as any).count,
        costs_total: (costs.rows[0] as any).total,
      });
    }

    if (type === 'products' && tenant_id) {
      const r = await turso.execute({ sql: 'SELECT * FROM products WHERE tenant_id = ?', args: [tenant_id as string] });
      return res.status(200).json(r.rows);
    }

    if (type === 'sales' && tenant_id) {
      const { from, to } = req.query;
      if (from && to) {
        const r = await turso.execute({ sql: 'SELECT * FROM sales WHERE tenant_id = ? AND created_at >= ? AND created_at <= ? ORDER BY created_at DESC', args: [tenant_id as string, from as string, to as string] });
        return res.status(200).json(r.rows);
      }
      const r = await turso.execute({ sql: 'SELECT * FROM sales WHERE tenant_id = ? ORDER BY created_at DESC', args: [tenant_id as string] });
      return res.status(200).json(r.rows);
    }

    if (type === 'costs' && tenant_id) {
      const { from, to } = req.query;
      if (from && to) {
        const r = await turso.execute({ sql: 'SELECT * FROM financial_costs WHERE tenant_id = ? AND cost_date >= ? AND cost_date <= ? ORDER BY cost_date DESC', args: [tenant_id as string, from as string, to as string] });
        return res.status(200).json(r.rows);
      }
      const r = await turso.execute({ sql: 'SELECT * FROM financial_costs WHERE tenant_id = ? ORDER BY cost_date DESC', args: [tenant_id as string] });
      return res.status(200).json(r.rows);
    }

    if (type === 'audit' && tenant_id) {
      const r = await turso.execute({ sql: 'SELECT * FROM audit_logs WHERE tenant_id = ? ORDER BY created_at DESC', args: [tenant_id as string] });
      return res.status(200).json(r.rows);
    }

    if (type === 'inventory' && tenant_id) {
      const r = await turso.execute({ sql: 'SELECT im.*, p.name as product_name FROM inventory_movements im LEFT JOIN products p ON im.product_id = p.id WHERE im.tenant_id = ? ORDER BY im.created_at DESC', args: [tenant_id as string] });
      return res.status(200).json(r.rows);
    }

    return res.status(400).json({ error: 'Invalid report type' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
