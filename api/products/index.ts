import type { VercelRequest, VercelResponse } from '@vercel/node';
import { turso } from '../db/turso';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'GET') {
      const { tenant_id, barcode, category, low_stock, threshold } = req.query;
      if (barcode && tenant_id) {
        const r = await turso.execute({ sql: 'SELECT * FROM products WHERE barcode = ? AND tenant_id = ?', args: [barcode as string, tenant_id as string] });
        return res.status(200).json(r.rows[0] || null);
      }
      if (category && tenant_id) {
        const r = await turso.execute({ sql: 'SELECT * FROM products WHERE category = ? AND tenant_id = ?', args: [category as string, tenant_id as string] });
        return res.status(200).json(r.rows);
      }
      if (low_stock && tenant_id) {
        const t = parseInt(threshold as string) || 5;
        const r = await turso.execute({ sql: 'SELECT * FROM products WHERE tenant_id = ? AND quantity < ?', args: [tenant_id as string, t] });
        return res.status(200).json(r.rows);
      }
      if (tenant_id) {
        const r = await turso.execute({ sql: 'SELECT * FROM products WHERE tenant_id = ?', args: [tenant_id as string] });
        return res.status(200).json(r.rows);
      }
      const r = await turso.execute('SELECT * FROM products');
      return res.status(200).json(r.rows);
    }

    if (req.method === 'POST') {
      const p = req.body;
      await turso.execute({
        sql: 'INSERT INTO products (id, tenant_id, name, barcode, purchase_price, sale_price, currency, quantity, category, unit_of_measure, min_stock, max_stock, image_url, expiry_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        args: [p.id, p.tenant_id, p.name, p.barcode, p.purchase_price, p.sale_price, p.currency || 'SAR', p.quantity || 0, p.category || null, p.unit_of_measure || 'piece', p.min_stock || 5, p.max_stock || 100, p.image_url || null, p.expiry_date || null]
      });
      return res.status(201).json({ success: true });
    }

    if (req.method === 'PUT') {
      const p = req.body;
      await turso.execute({
        sql: 'UPDATE products SET name = ?, barcode = ?, purchase_price = ?, sale_price = ?, currency = ?, quantity = ?, category = ?, unit_of_measure = ?, min_stock = ?, max_stock = ?, image_url = ?, expiry_date = ? WHERE id = ? AND tenant_id = ?',
        args: [p.name, p.barcode, p.purchase_price, p.sale_price, p.currency, p.quantity, p.category || null, p.unit_of_measure || 'piece', p.min_stock || 5, p.max_stock || 100, p.image_url || null, p.expiry_date || null, p.id, p.tenant_id]
      });
      return res.status(200).json({ success: true });
    }

    if (req.method === 'DELETE') {
      const { id, tenant_id } = req.query;
      await turso.execute({ sql: 'DELETE FROM products WHERE id = ? AND tenant_id = ?', args: [id as string, tenant_id as string] });
      return res.status(200).json({ success: true });
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
