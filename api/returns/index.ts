import type { VercelRequest, VercelResponse } from '@vercel/node';
import { turso } from '../../db/turso';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { tenant_id } = req.query;
    if (!tenant_id) return res.status(400).json({ error: 'tenant_id required' });

    if (req.method === 'GET') {
      const r = await turso.execute({ sql: 'SELECT * FROM product_returns WHERE tenant_id = ? ORDER BY created_at DESC', args: [tenant_id as string] });
      return res.status(200).json(r.rows);
    }
    if (req.method === 'POST') {
      const { ret, items } = req.body;
      await turso.execute({ sql: 'INSERT INTO product_returns (id, tenant_id, sale_id, total_refund, reason, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)', args: [ret.id, tenant_id as string, ret.sale_id, ret.total_refund, ret.reason, ret.created_by, ret.created_at] });
      for (const item of items) {
        await turso.execute({ sql: 'INSERT INTO return_items (id, return_id, product_id, qty, price) VALUES (?, ?, ?, ?, ?)', args: [item.id, ret.id, item.product_id, item.qty, item.price] });
        await turso.execute({ sql: 'UPDATE products SET quantity = quantity + ? WHERE id = ? AND tenant_id = ?', args: [item.qty, item.product_id, tenant_id as string] });
        await turso.execute({ sql: 'INSERT INTO inventory_movements (id, tenant_id, product_id, type, quantity, created_at) VALUES (?, ?, ?, ?, ?, ?)', args: [`mov_return_${item.id}`, tenant_id as string, item.product_id, 'in', item.qty, ret.created_at] });
      }
      return res.status(201).json({ success: true });
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
