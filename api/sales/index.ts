import type { VercelRequest, VercelResponse } from '@vercel/node';
import { turso } from '../../db/turso';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'GET') {
      const { tenant_id, id, from, to } = req.query;
      if (id && tenant_id) {
        const sales = await turso.execute({ sql: 'SELECT * FROM sales WHERE id = ? AND tenant_id = ?', args: [id as string, tenant_id as string] });
        if (sales.rows.length === 0) return res.status(200).json(null);
        const sale = sales.rows[0] as any;
        const items = await turso.execute({ sql: 'SELECT si.*, p.name as product_name FROM sale_items si LEFT JOIN products p ON si.product_id = p.id WHERE si.sale_id = ?', args: [id as string] });
        sale.items = items.rows;
        return res.status(200).json(sale);
      }
      if (from && to && tenant_id) {
        const r = await turso.execute({ sql: 'SELECT * FROM sales WHERE tenant_id = ? AND created_at >= ? AND created_at <= ? ORDER BY created_at DESC', args: [tenant_id as string, from as string, to as string] });
        return res.status(200).json(r.rows);
      }
      if (tenant_id) {
        const r = await turso.execute({ sql: 'SELECT * FROM sales WHERE tenant_id = ? ORDER BY created_at DESC', args: [tenant_id as string] });
        return res.status(200).json(r.rows);
      }
      const r = await turso.execute('SELECT * FROM sales ORDER BY created_at DESC');
      return res.status(200).json(r.rows);
    }

    if (req.method === 'POST') {
      const { sale, items } = req.body;
      await turso.execute({ sql: 'INSERT INTO sales (id, tenant_id, total, created_by, created_at, customer_id, notes) VALUES (?, ?, ?, ?, ?, ?, ?)', args: [sale.id, sale.tenant_id, sale.total, sale.created_by, sale.created_at, sale.customer_id || null, sale.notes || null] });

      for (const item of items) {
        await turso.execute({ sql: 'INSERT INTO sale_items (id, sale_id, product_id, qty, price) VALUES (?, ?, ?, ?, ?)', args: [item.id, item.sale_id, item.product_id, item.qty, item.price] });
        await turso.execute({ sql: 'UPDATE products SET quantity = quantity - ? WHERE id = ? AND tenant_id = ?', args: [item.qty, item.product_id, sale.tenant_id] });
        await turso.execute({ sql: 'INSERT INTO inventory_movements (id, tenant_id, product_id, type, quantity, created_at) VALUES (?, ?, ?, ?, ?, ?)', args: [`mov_${item.id}`, sale.tenant_id, item.product_id, 'out', item.qty, sale.created_at] });
      }
      return res.status(201).json({ success: true });
    }

    if (req.method === 'DELETE') {
      const { id, tenant_id } = req.query;
      const items = await turso.execute({ sql: 'SELECT * FROM sale_items WHERE sale_id = ?', args: [id as string] });
      for (const item of items.rows as any[]) {
        await turso.execute({ sql: 'UPDATE products SET quantity = quantity + ? WHERE id = ? AND tenant_id = ?', args: [item.qty, item.product_id, tenant_id as string] });
        await turso.execute({ sql: 'INSERT INTO inventory_movements (id, tenant_id, product_id, type, quantity, created_at) VALUES (?, ?, ?, ?, ?, ?)', args: [`mov_void_${item.id}`, tenant_id as string, item.product_id, 'in', item.qty, new Date().toISOString()] });
      }
      await turso.execute({ sql: 'DELETE FROM sale_items WHERE sale_id = ?', args: [id as string] });
      await turso.execute({ sql: 'DELETE FROM sales WHERE id = ? AND tenant_id = ?', args: [id as string, tenant_id as string] });
      return res.status(200).json({ success: true });
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
