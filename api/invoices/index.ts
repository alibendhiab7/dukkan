import type { VercelRequest, VercelResponse } from '@vercel/node';
import { turso } from '../db/turso';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'GET') {
      const { tenant_id } = req.query;
      if (tenant_id && tenant_id !== '0') {
        const r = await turso.execute({
          sql: 'SELECT * FROM tenant_invoices WHERE tenant_id = ? ORDER BY created_at DESC',
          args: [tenant_id as string]
        });
        return res.status(200).json(r.rows);
      }
      const r = await turso.execute('SELECT * FROM tenant_invoices ORDER BY created_at DESC');
      return res.status(200).json(r.rows);
    }

    if (req.method === 'POST') {
      const iv = req.body;
      const id = iv.id || 'inv_' + Math.floor(Math.random() * 1000000);
      const invNum = iv.invoice_number || 'INV-' + Date.now().toString().slice(-6);
      
      await turso.execute({
        sql: 'INSERT INTO tenant_invoices (id, tenant_id, invoice_number, amount, tax, discount, final_total, status, issue_date, due_date, license_plan, duration_days, max_users, payment_method, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        args: [
          id,
          iv.tenant_id,
          invNum,
          iv.amount,
          iv.tax || 0,
          iv.discount || 0,
          iv.final_total,
          iv.status || 'unpaid',
          iv.issue_date || new Date().toISOString().split('T')[0],
          iv.due_date,
          iv.license_plan,
          iv.duration_days,
          iv.max_users,
          iv.payment_method || null,
          iv.notes || '',
          new Date().toISOString()
        ]
      });
      
      return res.status(201).json({ success: true, id, invoice_number: invNum });
    }

    if (req.method === 'PUT') {
      const iv = req.body;
      
      // If invoice is newly marked as paid, extend the store's subscription!
      if (iv.status === 'paid') {
        const invObj = await turso.execute({ sql: 'SELECT * FROM tenant_invoices WHERE id = ?', args: [iv.id] });
        if (invObj.rows.length > 0) {
          const invoice = invObj.rows[0] as any;
          
          const tenantObj = await turso.execute({ sql: 'SELECT * FROM tenants WHERE id = ?', args: [invoice.tenant_id] });
          if (tenantObj.rows.length > 0) {
            const tenant = tenantObj.rows[0] as any;
            
            let baseDate = new Date();
            if (new Date(tenant.subscription_expires_at) > baseDate) {
              baseDate = new Date(tenant.subscription_expires_at);
            }
            baseDate.setDate(baseDate.getDate() + invoice.duration_days);
            const newExpiry = baseDate.toISOString();
            
            // 1. Update store subscription
            await turso.execute({
              sql: 'UPDATE tenants SET subscription_expires_at = ?, license_plan = ?, max_users = ?, status = ? WHERE id = ?',
              args: [newExpiry, invoice.license_plan, invoice.max_users, 'active', invoice.tenant_id]
            });
            
            // 2. Log payment receipt in tenant_payments
            const pmtId = 'pmt_' + Math.floor(Math.random() * 1000000);
            await turso.execute({
              sql: 'INSERT INTO tenant_payments (id, tenant_id, amount, payment_date, payment_type, license_plan, duration_days, max_users, notes, performed_by, payment_method, coupon_code) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
              args: [
                pmtId,
                invoice.tenant_id,
                invoice.final_total,
                new Date().toISOString(),
                'renewal',
                invoice.license_plan,
                invoice.duration_days,
                invoice.max_users,
                `سداد الفاتورة رقم ${invoice.invoice_number}. ملاحظات: ${iv.notes || ''}`,
                'sysadmin',
                iv.payment_method || invoice.payment_method,
                invoice.discount > 0 ? 'COUPON' : null
              ]
            });
          }
        }
      }
      
      await turso.execute({
        sql: 'UPDATE tenant_invoices SET status = ?, payment_method = ?, notes = ? WHERE id = ?',
        args: [iv.status, iv.payment_method || null, iv.notes || '', iv.id]
      });
      
      return res.status(200).json({ success: true });
    }

    if (req.method === 'DELETE') {
      const { id } = req.query;
      await turso.execute({ sql: 'DELETE FROM tenant_invoices WHERE id = ?', args: [id as string] });
      return res.status(200).json({ success: true });
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
