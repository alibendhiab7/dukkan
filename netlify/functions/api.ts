import { createClient } from '@libsql/client';
import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';

// ──────────────────────────────────────────────
// Turso client
// ──────────────────────────────────────────────
const turso = createClient({
  url: process.env['TURSO_DATABASE_URL']!,
  authToken: process.env['TURSO_AUTH_TOKEN']!,
});

// ──────────────────────────────────────────────
// Helper: build a JSON response
// ──────────────────────────────────────────────
function json(statusCode: number, body: unknown) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
    body: JSON.stringify(body),
  };
}

// ──────────────────────────────────────────────
// Main handler
// ──────────────────────────────────────────────
export const handler: Handler = async (event: HandlerEvent, _ctx: HandlerContext) => {
  const method = event.httpMethod;

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: '',
    };
  }

  // The original path contains the part after /api/
  // Netlify passes it via event.path as /.netlify/functions/api/auth/login
  // or via the :splat param in event.path
  const rawPath = event.path || '';
  // Normalize: extract the segment after /api/
  // Possible formats:
  //   /.netlify/functions/api/auth/login
  //   /api/auth/login   (when accessed directly)
  let apiPath = rawPath
    .replace('/.netlify/functions/api', '')
    .replace('/api', '');

  // Ensure leading slash
  if (!apiPath.startsWith('/')) apiPath = '/' + apiPath;

  const query = (event.queryStringParameters || {}) as Record<string, string>;
  let body: any = {};
  if (event.body) {
    try { body = JSON.parse(event.body); } catch { body = {}; }
  }

  try {
    // ── /auth/login ─────────────────────────────
    if (apiPath === '/auth/login') {
      if (method !== 'POST') return json(405, { error: 'Method Not Allowed' });
      const { username, password, tenant_id } = body;
      let user: any;
      if (tenant_id) {
        const r = await turso.execute({ sql: 'SELECT * FROM users WHERE tenant_id = ? AND username = ?', args: [tenant_id, username] });
        user = r.rows[0];
      }
      if (!user) {
        const r = await turso.execute({ sql: 'SELECT * FROM users WHERE username = ?', args: [username] });
        user = r.rows[0];
      }
      if (!user) return json(401, { error: 'Invalid credentials' });
      const tenant = await turso.execute({ sql: 'SELECT * FROM tenants WHERE id = ?', args: [(user as any).tenant_id] });
      return json(200, { user, tenant: tenant.rows[0] || null });
    }

    // ── /system/init ────────────────────────────
    if (apiPath === '/system/init') {
      const result = await turso.execute('SELECT COUNT(*) as tables_count FROM sqlite_master WHERE type="table"');
      return json(200, { status: 'ok', tables: (result.rows[0] as any).tables_count });
    }

    // ── /tenants/payments ───────────────────────
    if (apiPath === '/tenants/payments') {
      if (method === 'GET') {
        const { tenant_id } = query;
        if (tenant_id) {
          const r = await turso.execute({ sql: 'SELECT * FROM tenant_payments WHERE tenant_id = ? ORDER BY payment_date DESC', args: [tenant_id] });
          return json(200, r.rows);
        }
        const r = await turso.execute('SELECT * FROM tenant_payments ORDER BY payment_date DESC');
        return json(200, r.rows);
      }
      if (method === 'POST') {
        const p = body;
        const id = p.id || 'pmt_' + Math.floor(Math.random() * 1000000);
        await turso.execute({ sql: 'INSERT INTO tenant_payments (id, tenant_id, amount, payment_date, payment_type, license_plan, duration_days, max_users, notes, performed_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', args: [id, p.tenant_id, p.amount, p.payment_date || new Date().toISOString(), p.payment_type, p.license_plan, p.duration_days, p.max_users, p.notes || '', p.performed_by || 'sysadmin'] });
        return json(201, { success: true, id });
      }
    }

    // ── /tenants ────────────────────────────────
    if (apiPath === '/tenants') {
      if (method === 'GET') {
        const { tenant_id, id, client_code } = query;
        if (client_code) {
          const r = await turso.execute({ sql: 'SELECT * FROM tenants WHERE client_code = ?', args: [client_code] });
          return json(200, r.rows[0] || null);
        }
        const targetId = tenant_id || id;
        if (targetId) {
          const r = await turso.execute({ sql: 'SELECT * FROM tenants WHERE id = ?', args: [targetId] });
          return json(200, r.rows[0] || null);
        }
        const r = await turso.execute('SELECT * FROM tenants');
        return json(200, r.rows);
      }
      if (method === 'POST') {
        const t = body;
        await turso.execute({ sql: 'INSERT INTO tenants (id, client_code, store_name, status, subscription_expires_at, license_plan, max_users) VALUES (?, ?, ?, ?, ?, ?, ?)', args: [t.id, t.client_code, t.store_name, t.status || 'active', t.subscription_expires_at, t.license_plan, t.max_users || 5] });
        return json(201, { success: true });
      }
      if (method === 'PUT') {
        const t = body;
        await turso.execute({ sql: 'UPDATE tenants SET client_code = ?, store_name = ?, status = ?, subscription_expires_at = ?, license_plan = ?, max_users = ? WHERE id = ?', args: [t.client_code, t.store_name, t.status, t.subscription_expires_at, t.license_plan, t.max_users || 5, t.id] });
        return json(200, { success: true });
      }
      if (method === 'DELETE') {
        const { id } = query;
        if (!id) return json(400, { error: 'Missing tenant ID' });
        await turso.batch([
          { sql: 'DELETE FROM audit_logs WHERE tenant_id = ?', args: [id] },
          { sql: 'DELETE FROM debt_logs WHERE tenant_id = ?', args: [id] },
          { sql: 'DELETE FROM debts WHERE tenant_id = ?', args: [id] },
          { sql: 'DELETE FROM return_items WHERE return_id IN (SELECT id FROM product_returns WHERE tenant_id = ?)', args: [id] },
          { sql: 'DELETE FROM product_returns WHERE tenant_id = ?', args: [id] },
          { sql: 'DELETE FROM sale_items WHERE sale_id IN (SELECT id FROM sales WHERE tenant_id = ?)', args: [id] },
          { sql: 'DELETE FROM sales WHERE tenant_id = ?', args: [id] },
          { sql: 'DELETE FROM inventory_movements WHERE tenant_id = ?', args: [id] },
          { sql: 'DELETE FROM promotions WHERE tenant_id = ?', args: [id] },
          { sql: 'DELETE FROM coupons WHERE tenant_id = ?', args: [id] },
          { sql: 'DELETE FROM customers WHERE tenant_id = ?', args: [id] },
          { sql: 'DELETE FROM financial_costs WHERE tenant_id = ?', args: [id] },
          { sql: 'DELETE FROM notifications WHERE tenant_id = ?', args: [id] },
          { sql: 'DELETE FROM exchange_rates WHERE tenant_id = ?', args: [id] },
          { sql: 'DELETE FROM products WHERE tenant_id = ?', args: [id] },
          { sql: 'DELETE FROM user_permissions WHERE tenant_id = ?', args: [id] },
          { sql: 'DELETE FROM users WHERE tenant_id = ?', args: [id] },
          { sql: 'DELETE FROM tenant_settings WHERE tenant_id = ?', args: [id] },
          { sql: 'DELETE FROM tenant_payments WHERE tenant_id = ?', args: [id] },
          { sql: 'DELETE FROM tenants WHERE id = ?', args: [id] },
        ]);
        return json(200, { success: true });
      }
    }

    // ── /users ───────────────────────────────────
    if (apiPath === '/users') {
      if (method === 'GET') {
        const { tenant_id, username } = query;
        if (username && tenant_id) {
          const r = await turso.execute({ sql: 'SELECT * FROM users WHERE tenant_id = ? AND username = ?', args: [tenant_id, username] });
          return json(200, r.rows[0] || null);
        }
        if (username) {
          const r = await turso.execute({ sql: 'SELECT * FROM users WHERE username = ?', args: [username] });
          return json(200, r.rows[0] || null);
        }
        if (tenant_id) {
          const r = await turso.execute({ sql: 'SELECT * FROM users WHERE tenant_id = ?', args: [tenant_id] });
          return json(200, r.rows);
        }
        const r = await turso.execute('SELECT * FROM users');
        return json(200, r.rows);
      }
      if (method === 'POST') {
        const u = body;
        await turso.execute({ sql: 'INSERT INTO users (id, tenant_id, username, password_hash, role) VALUES (?, ?, ?, ?, ?)', args: [u.id, u.tenant_id, u.username, u.password_hash, u.role] });
        return json(201, { success: true });
      }
      if (method === 'PUT') {
        const u = body;
        await turso.execute({ sql: 'UPDATE users SET username = ?, password_hash = ?, role = ? WHERE id = ? AND tenant_id = ?', args: [u.username, u.password_hash, u.role, u.id, u.tenant_id] });
        return json(200, { success: true });
      }
      if (method === 'DELETE') {
        const { id, tenant_id } = query;
        await turso.execute({ sql: 'DELETE FROM users WHERE id = ? AND tenant_id = ?', args: [id, tenant_id] });
        return json(200, { success: true });
      }
    }

    // ── /products ────────────────────────────────
    if (apiPath === '/products') {
      if (method === 'GET') {
        const { tenant_id, barcode, category, low_stock, threshold } = query;
        if (barcode && tenant_id) {
          const r = await turso.execute({ sql: 'SELECT * FROM products WHERE barcode = ? AND tenant_id = ?', args: [barcode, tenant_id] });
          return json(200, r.rows[0] || null);
        }
        if (category && tenant_id) {
          const r = await turso.execute({ sql: 'SELECT * FROM products WHERE category = ? AND tenant_id = ?', args: [category, tenant_id] });
          return json(200, r.rows);
        }
        if (low_stock && tenant_id) {
          const t = parseInt(threshold) || 5;
          const r = await turso.execute({ sql: 'SELECT * FROM products WHERE tenant_id = ? AND quantity < ?', args: [tenant_id, t] });
          return json(200, r.rows);
        }
        if (tenant_id) {
          const r = await turso.execute({ sql: 'SELECT * FROM products WHERE tenant_id = ?', args: [tenant_id] });
          return json(200, r.rows);
        }
        const r = await turso.execute('SELECT * FROM products');
        return json(200, r.rows);
      }
      if (method === 'POST') {
        const p = body;
        await turso.execute({ sql: 'INSERT INTO products (id, tenant_id, name, barcode, purchase_price, sale_price, currency, quantity, category, unit_of_measure, min_stock, max_stock, image_url, expiry_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', args: [p.id, p.tenant_id, p.name, p.barcode, p.purchase_price, p.sale_price, p.currency || 'SAR', p.quantity || 0, p.category || null, p.unit_of_measure || 'piece', p.min_stock || 5, p.max_stock || 100, p.image_url || null, p.expiry_date || null] });
        return json(201, { success: true });
      }
      if (method === 'PUT') {
        const p = body;
        await turso.execute({ sql: 'UPDATE products SET name = ?, barcode = ?, purchase_price = ?, sale_price = ?, currency = ?, quantity = ?, category = ?, unit_of_measure = ?, min_stock = ?, max_stock = ?, image_url = ?, expiry_date = ? WHERE id = ? AND tenant_id = ?', args: [p.name, p.barcode, p.purchase_price, p.sale_price, p.currency, p.quantity, p.category || null, p.unit_of_measure || 'piece', p.min_stock || 5, p.max_stock || 100, p.image_url || null, p.expiry_date || null, p.id, p.tenant_id] });
        return json(200, { success: true });
      }
      if (method === 'DELETE') {
        const { id, tenant_id } = query;
        await turso.execute({ sql: 'DELETE FROM products WHERE id = ? AND tenant_id = ?', args: [id, tenant_id] });
        return json(200, { success: true });
      }
    }

    // ── /sales ───────────────────────────────────
    if (apiPath === '/sales') {
      if (method === 'GET') {
        const { tenant_id, id, from, to } = query;
        if (id && tenant_id) {
          const sales = await turso.execute({ sql: 'SELECT * FROM sales WHERE id = ? AND tenant_id = ?', args: [id, tenant_id] });
          if (sales.rows.length === 0) return json(200, null);
          const sale = sales.rows[0] as any;
          const items = await turso.execute({ sql: 'SELECT si.*, p.name as product_name FROM sale_items si LEFT JOIN products p ON si.product_id = p.id WHERE si.sale_id = ?', args: [id] });
          sale.items = items.rows;
          return json(200, sale);
        }
        if (from && to && tenant_id) {
          const r = await turso.execute({ sql: 'SELECT * FROM sales WHERE tenant_id = ? AND created_at >= ? AND created_at <= ? ORDER BY created_at DESC', args: [tenant_id, from, to] });
          return json(200, r.rows);
        }
        if (tenant_id) {
          const r = await turso.execute({ sql: 'SELECT * FROM sales WHERE tenant_id = ? ORDER BY created_at DESC', args: [tenant_id] });
          return json(200, r.rows);
        }
        const r = await turso.execute('SELECT * FROM sales ORDER BY created_at DESC');
        return json(200, r.rows);
      }
      if (method === 'POST') {
        const { sale, items } = body;
        await turso.execute({ sql: 'INSERT INTO sales (id, tenant_id, total, created_by, created_at, customer_id, notes) VALUES (?, ?, ?, ?, ?, ?, ?)', args: [sale.id, sale.tenant_id, sale.total, sale.created_by, sale.created_at, sale.customer_id || null, sale.notes || null] });
        for (const item of items) {
          await turso.execute({ sql: 'INSERT INTO sale_items (id, sale_id, product_id, qty, price) VALUES (?, ?, ?, ?, ?)', args: [item.id, item.sale_id, item.product_id, item.qty, item.price] });
          await turso.execute({ sql: 'UPDATE products SET quantity = quantity - ? WHERE id = ? AND tenant_id = ?', args: [item.qty, item.product_id, sale.tenant_id] });
          await turso.execute({ sql: 'INSERT INTO inventory_movements (id, tenant_id, product_id, type, quantity, created_at) VALUES (?, ?, ?, ?, ?, ?)', args: [`mov_${item.id}`, sale.tenant_id, item.product_id, 'out', item.qty, sale.created_at] });
        }
        return json(201, { success: true });
      }
      if (method === 'DELETE') {
        const { id, tenant_id } = query;
        const items = await turso.execute({ sql: 'SELECT * FROM sale_items WHERE sale_id = ?', args: [id] });
        for (const item of items.rows as any[]) {
          await turso.execute({ sql: 'UPDATE products SET quantity = quantity + ? WHERE id = ? AND tenant_id = ?', args: [item.qty, item.product_id, tenant_id] });
          await turso.execute({ sql: 'INSERT INTO inventory_movements (id, tenant_id, product_id, type, quantity, created_at) VALUES (?, ?, ?, ?, ?, ?)', args: [`mov_void_${item.id}`, tenant_id, item.product_id, 'in', item.qty, new Date().toISOString()] });
        }
        await turso.execute({ sql: 'DELETE FROM sale_items WHERE sale_id = ?', args: [id] });
        await turso.execute({ sql: 'DELETE FROM sales WHERE id = ? AND tenant_id = ?', args: [id, tenant_id] });
        return json(200, { success: true });
      }
    }

    // ── /customers ───────────────────────────────
    if (apiPath === '/customers') {
      if (method === 'GET') {
        const { tenant_id, id, search } = query;
        if (id && tenant_id) {
          const r = await turso.execute({ sql: 'SELECT * FROM customers WHERE id = ? AND tenant_id = ?', args: [id, tenant_id] });
          return json(200, r.rows[0] || null);
        }
        if (search && tenant_id) {
          const r = await turso.execute({ sql: 'SELECT * FROM customers WHERE tenant_id = ? AND (name LIKE ? OR phone LIKE ?)', args: [tenant_id, `%${search}%`, `%${search}%`] });
          return json(200, r.rows);
        }
        if (tenant_id) {
          const r = await turso.execute({ sql: 'SELECT * FROM customers WHERE tenant_id = ? ORDER BY created_at DESC', args: [tenant_id] });
          return json(200, r.rows);
        }
        const r = await turso.execute('SELECT * FROM customers');
        return json(200, r.rows);
      }
      if (method === 'POST') {
        const c = body;
        await turso.execute({ sql: 'INSERT INTO customers (id, tenant_id, name, phone, email, address, loyalty_points, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', args: [c.id, c.tenant_id, c.name, c.phone, c.email || null, c.address || null, c.loyalty_points || 0, c.created_at] });
        return json(201, { success: true });
      }
      if (method === 'PUT') {
        const c = body;
        await turso.execute({ sql: 'UPDATE customers SET name = ?, phone = ?, email = ?, address = ?, loyalty_points = ? WHERE id = ? AND tenant_id = ?', args: [c.name, c.phone, c.email || null, c.address || null, c.loyalty_points, c.id, c.tenant_id] });
        return json(200, { success: true });
      }
      if (method === 'DELETE') {
        const { id, tenant_id } = query;
        await turso.execute({ sql: 'DELETE FROM customers WHERE id = ? AND tenant_id = ?', args: [id, tenant_id] });
        return json(200, { success: true });
      }
    }

    // ── /notifications ───────────────────────────
    if (apiPath === '/notifications') {
      const tenant_id = query.tenant_id || body?.tenant_id;
      if (!tenant_id) return json(400, { error: 'tenant_id required' });
      if (method === 'GET') {
        const r = await turso.execute({ sql: 'SELECT * FROM notifications WHERE tenant_id = ? ORDER BY created_at DESC', args: [tenant_id] });
        return json(200, r.rows);
      }
      if (method === 'POST') {
        const n = body;
        const id = 'notif_' + Math.floor(Math.random() * 1000000);
        await turso.execute({ sql: 'INSERT INTO notifications (id, tenant_id, title, message, type, is_read, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)', args: [id, tenant_id, n.title, n.message, n.type || 'info', n.is_read ? 1 : 0, new Date().toISOString()] });
        return json(201, { success: true });
      }
      if (method === 'PUT') {
        const { id, is_read } = body;
        await turso.execute({ sql: 'UPDATE notifications SET is_read = ? WHERE id = ? AND tenant_id = ?', args: [is_read ? 1 : 0, id, tenant_id] });
        return json(200, { success: true });
      }
      if (method === 'DELETE') {
        const { id } = query;
        await turso.execute({ sql: 'DELETE FROM notifications WHERE id = ? AND tenant_id = ?', args: [id, tenant_id] });
        return json(200, { success: true });
      }
    }

    // ── /coupons ─────────────────────────────────
    if (apiPath === '/coupons') {
      const { tenant_id, code } = query;
      if (method === 'GET') {
        if (code && tenant_id) {
          const r = await turso.execute({ sql: 'SELECT * FROM coupons WHERE code = ? AND tenant_id = ?', args: [code.toUpperCase(), tenant_id] });
          return json(200, r.rows[0] || null);
        }
        if (tenant_id) {
          const r = await turso.execute({ sql: 'SELECT * FROM coupons WHERE tenant_id = ? ORDER BY created_at DESC', args: [tenant_id] });
          return json(200, r.rows);
        }
      }
      if (method === 'POST') {
        const c = body;
        await turso.execute({ sql: 'INSERT INTO coupons (id, tenant_id, code, discount_type, discount_value, max_uses, used_count, min_cart_total, expires_at, is_active, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', args: [c.id, c.tenant_id, c.code.toUpperCase(), c.discount_type, c.discount_value, c.max_uses, c.used_count || 0, c.min_cart_total || 0, c.expires_at, c.is_active ? 1 : 0, c.created_at] });
        return json(201, { success: true });
      }
      if (method === 'PUT') {
        const c = body;
        await turso.execute({ sql: 'UPDATE coupons SET code = ?, discount_type = ?, discount_value = ?, max_uses = ?, used_count = ?, min_cart_total = ?, expires_at = ?, is_active = ? WHERE id = ? AND tenant_id = ?', args: [c.code.toUpperCase(), c.discount_type, c.discount_value, c.max_uses, c.used_count, c.min_cart_total, c.expires_at, c.is_active ? 1 : 0, c.id, c.tenant_id] });
        return json(200, { success: true });
      }
      if (method === 'DELETE') {
        const { id, tenant_id: tid } = query;
        await turso.execute({ sql: 'DELETE FROM coupons WHERE id = ? AND tenant_id = ?', args: [id, tid] });
        return json(200, { success: true });
      }
    }

    // ── /costs ───────────────────────────────────
    if (apiPath === '/costs') {
      const tenant_id = query.tenant_id || body?.tenant_id;
      if (!tenant_id) return json(400, { error: 'tenant_id required' });
      if (method === 'GET') {
        const r = await turso.execute({ sql: 'SELECT * FROM financial_costs WHERE tenant_id = ? ORDER BY cost_date DESC', args: [tenant_id] });
        return json(200, r.rows);
      }
      if (method === 'POST') {
        const c = body;
        await turso.execute({ sql: 'INSERT INTO financial_costs (id, tenant_id, category, description, amount, currency, cost_date, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', args: [c.id, tenant_id, c.category, c.description, c.amount, c.currency || 'SAR', c.cost_date, c.created_by, c.created_at] });
        return json(201, { success: true });
      }
      if (method === 'PUT') {
        const c = body;
        await turso.execute({ sql: 'UPDATE financial_costs SET category = ?, description = ?, amount = ?, currency = ?, cost_date = ? WHERE id = ? AND tenant_id = ?', args: [c.category, c.description, c.amount, c.currency, c.cost_date, c.id, tenant_id] });
        return json(200, { success: true });
      }
      if (method === 'DELETE') {
        const { id } = query;
        await turso.execute({ sql: 'DELETE FROM financial_costs WHERE id = ? AND tenant_id = ?', args: [id, tenant_id] });
        return json(200, { success: true });
      }
    }

    // ── /debts ───────────────────────────────────
    if (apiPath === '/debts') {
      const tenant_id = query.tenant_id || body?.tenant_id;
      if (!tenant_id) return json(400, { error: 'tenant_id required' });
      if (method === 'GET') {
        const debts = await turso.execute({ sql: 'SELECT d.*, c.name as customer_name FROM debts d LEFT JOIN customers c ON d.customer_id = c.id WHERE d.tenant_id = ? ORDER BY d.created_at DESC', args: [tenant_id] });
        return json(200, debts.rows);
      }
      if (method === 'POST') {
        const d = body;
        await turso.execute({ sql: 'INSERT INTO debts (id, tenant_id, customer_id, amount, currency, description, status, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', args: [d.id, tenant_id, d.customer_id, d.amount, d.currency || 'SAR', d.description || null, d.status || 'pending', d.created_by, d.created_at] });
        return json(201, { success: true });
      }
      if (method === 'PUT') {
        const d = body;
        await turso.execute({ sql: 'UPDATE debts SET amount = ?, status = ?, description = ? WHERE id = ? AND tenant_id = ?', args: [d.amount, d.status, d.description || null, d.id, tenant_id] });
        return json(200, { success: true });
      }
      if (method === 'DELETE') {
        const { id } = query;
        await turso.execute({ sql: 'DELETE FROM debts WHERE id = ? AND tenant_id = ?', args: [id, tenant_id] });
        return json(200, { success: true });
      }
    }

    // ── /promotions ──────────────────────────────
    if (apiPath === '/promotions') {
      const tenant_id = query.tenant_id || body?.tenant_id;
      if (!tenant_id) return json(400, { error: 'tenant_id required' });
      if (method === 'GET') {
        const r = await turso.execute({ sql: 'SELECT * FROM promotions WHERE tenant_id = ? ORDER BY valid_from DESC', args: [tenant_id] });
        return json(200, r.rows);
      }
      if (method === 'POST') {
        const p = body;
        await turso.execute({ sql: 'INSERT INTO promotions (id, tenant_id, name, type, product_id, min_qty, free_qty, discount_percent, valid_from, valid_to, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', args: [p.id, tenant_id, p.name, p.type, p.product_id || null, p.min_qty || 0, p.free_qty || 0, p.discount_percent || null, p.valid_from, p.valid_to, p.is_active ? 1 : 0] });
        return json(201, { success: true });
      }
      if (method === 'PUT') {
        const p = body;
        await turso.execute({ sql: 'UPDATE promotions SET name = ?, type = ?, product_id = ?, min_qty = ?, free_qty = ?, discount_percent = ?, valid_from = ?, valid_to = ?, is_active = ? WHERE id = ? AND tenant_id = ?', args: [p.name, p.type, p.product_id || null, p.min_qty, p.free_qty, p.discount_percent || null, p.valid_from, p.valid_to, p.is_active ? 1 : 0, p.id, tenant_id] });
        return json(200, { success: true });
      }
      if (method === 'DELETE') {
        const { id } = query;
        await turso.execute({ sql: 'DELETE FROM promotions WHERE id = ? AND tenant_id = ?', args: [id, tenant_id] });
        return json(200, { success: true });
      }
    }

    // ── /returns ─────────────────────────────────
    if (apiPath === '/returns') {
      const tenant_id = query.tenant_id || body?.tenant_id || body?.ret?.tenant_id;
      if (!tenant_id) return json(400, { error: 'tenant_id required' });
      if (method === 'GET') {
        const r = await turso.execute({ sql: 'SELECT * FROM product_returns WHERE tenant_id = ? ORDER BY created_at DESC', args: [tenant_id] });
        return json(200, r.rows);
      }
      if (method === 'POST') {
        const { ret, items } = body;
        await turso.execute({ sql: 'INSERT INTO product_returns (id, tenant_id, sale_id, total_refund, reason, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)', args: [ret.id, tenant_id, ret.sale_id, ret.total_refund, ret.reason, ret.created_by, ret.created_at] });
        for (const item of items) {
          await turso.execute({ sql: 'INSERT INTO return_items (id, return_id, product_id, qty, price) VALUES (?, ?, ?, ?, ?)', args: [item.id, ret.id, item.product_id, item.qty, item.price] });
          await turso.execute({ sql: 'UPDATE products SET quantity = quantity + ? WHERE id = ? AND tenant_id = ?', args: [item.qty, item.product_id, tenant_id] });
          await turso.execute({ sql: 'INSERT INTO inventory_movements (id, tenant_id, product_id, type, quantity, created_at) VALUES (?, ?, ?, ?, ?, ?)', args: [`mov_return_${item.id}`, tenant_id, item.product_id, 'in', item.qty, ret.created_at] });
        }
        return json(201, { success: true });
      }
    }

    // ── /rates ───────────────────────────────────
    if (apiPath === '/rates') {
      const tenant_id = query.tenant_id || body?.tenant_id;
      if (!tenant_id) return json(400, { error: 'tenant_id required' });
      if (method === 'GET') {
        const r = await turso.execute({ sql: 'SELECT * FROM exchange_rates WHERE tenant_id = ? ORDER BY updated_at DESC LIMIT 1', args: [tenant_id] });
        return json(200, r.rows[0] || null);
      }
      if (method === 'POST' || method === 'PUT') {
        const { sar_to_yer } = body;
        const now = new Date().toISOString();
        const existing = await turso.execute({ sql: 'SELECT * FROM exchange_rates WHERE tenant_id = ?', args: [tenant_id] });
        if (existing.rows.length > 0) {
          await turso.execute({ sql: 'UPDATE exchange_rates SET sar_to_yer = ?, updated_at = ? WHERE tenant_id = ?', args: [sar_to_yer, now, tenant_id] });
        } else {
          const id = 'rate_' + Math.floor(Math.random() * 1000000);
          await turso.execute({ sql: 'INSERT INTO exchange_rates (id, tenant_id, sar_to_yer, updated_at) VALUES (?, ?, ?, ?)', args: [id, tenant_id, sar_to_yer, now] });
        }
        return json(200, { success: true });
      }
    }

    // ── /settings ────────────────────────────────
    if (apiPath === '/settings') {
      const tenant_id = query.tenant_id || body?.tenant_id;
      if (!tenant_id) return json(400, { error: 'tenant_id required' });
      if (method === 'GET') {
        const r = await turso.execute({ sql: 'SELECT * FROM tenant_settings WHERE tenant_id = ?', args: [tenant_id] });
        const s = r.rows[0] as any;
        if (s) {
          s.enable_inventory = Boolean(s.enable_inventory);
          s.enable_sales = Boolean(s.enable_sales);
          s.enable_reports = Boolean(s.enable_reports);
          s.enable_employees = Boolean(s.enable_employees);
        }
        return json(200, s || null);
      }
      if (method === 'POST' || method === 'PUT') {
        const s = body;
        const inv = s.enable_inventory ? 1 : 0;
        const sal = s.enable_sales ? 1 : 0;
        const rep = s.enable_reports ? 1 : 0;
        const emp = s.enable_employees ? 1 : 0;
        const existing = await turso.execute({ sql: 'SELECT * FROM tenant_settings WHERE tenant_id = ?', args: [tenant_id] });
        if (existing.rows.length > 0) {
          await turso.execute({ sql: 'UPDATE tenant_settings SET enable_inventory = ?, enable_sales = ?, enable_reports = ?, enable_employees = ? WHERE tenant_id = ?', args: [inv, sal, rep, emp, tenant_id] });
        } else {
          await turso.execute({ sql: 'INSERT INTO tenant_settings (tenant_id, enable_inventory, enable_sales, enable_reports, enable_employees) VALUES (?, ?, ?, ?, ?)', args: [tenant_id, inv, sal, rep, emp] });
        }
        return json(200, { success: true });
      }
    }

    // ── /permissions ─────────────────────────────
    if (apiPath === '/permissions') {
      const { tenant_id } = query;
      if (!tenant_id) return json(400, { error: 'tenant_id required' });
      if (method === 'GET') {
        const r = await turso.execute({ sql: 'SELECT * FROM user_permissions WHERE tenant_id = ?', args: [tenant_id] });
        const perms: Record<string, Record<string, boolean>> = {};
        for (const row of r.rows as any[]) {
          if (!perms[row.user_id]) perms[row.user_id] = {};
          perms[row.user_id][row.permission_key] = Boolean(row.is_granted);
        }
        return json(200, perms);
      }
      if (method === 'POST') {
        const { user_id, permissions } = body;
        await turso.execute({ sql: 'DELETE FROM user_permissions WHERE user_id = ?', args: [user_id] });
        for (const [key, val] of Object.entries(permissions as Record<string, boolean>)) {
          const id = `${user_id}_${key}`;
          await turso.execute({ sql: 'INSERT INTO user_permissions (id, tenant_id, user_id, permission_key, is_granted) VALUES (?, ?, ?, ?, ?)', args: [id, tenant_id, user_id, key, val ? 1 : 0] });
        }
        return json(200, { success: true });
      }
    }

    // ── /reports ─────────────────────────────────
    if (apiPath === '/reports') {
      const { tenant_id, type, from, to } = query;
      if (type === 'dashboard' && tenant_id) {
        const [products, sales, customers, lowStock, costs] = await Promise.all([
          turso.execute({ sql: 'SELECT COUNT(*) as count FROM products WHERE tenant_id = ?', args: [tenant_id] }),
          turso.execute({ sql: 'SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as total FROM sales WHERE tenant_id = ?', args: [tenant_id] }),
          turso.execute({ sql: 'SELECT COUNT(*) as count FROM customers WHERE tenant_id = ?', args: [tenant_id] }),
          turso.execute({ sql: 'SELECT COUNT(*) as count FROM products WHERE tenant_id = ? AND quantity < 5', args: [tenant_id] }),
          turso.execute({ sql: 'SELECT COALESCE(SUM(amount), 0) as total FROM financial_costs WHERE tenant_id = ?', args: [tenant_id] }),
        ]);
        return json(200, {
          products_count: (products.rows[0] as any).count,
          sales_count: (sales.rows[0] as any).count,
          sales_total: (sales.rows[0] as any).total,
          customers_count: (customers.rows[0] as any).count,
          low_stock_count: (lowStock.rows[0] as any).count,
          costs_total: (costs.rows[0] as any).total,
        });
      }
      if (type === 'products' && tenant_id) {
        const r = await turso.execute({ sql: 'SELECT * FROM products WHERE tenant_id = ?', args: [tenant_id] });
        return json(200, r.rows);
      }
      if (type === 'sales' && tenant_id) {
        if (from && to) {
          const r = await turso.execute({ sql: 'SELECT * FROM sales WHERE tenant_id = ? AND created_at >= ? AND created_at <= ? ORDER BY created_at DESC', args: [tenant_id, from, to] });
          return json(200, r.rows);
        }
        const r = await turso.execute({ sql: 'SELECT * FROM sales WHERE tenant_id = ? ORDER BY created_at DESC', args: [tenant_id] });
        return json(200, r.rows);
      }
      if (type === 'costs' && tenant_id) {
        if (from && to) {
          const r = await turso.execute({ sql: 'SELECT * FROM financial_costs WHERE tenant_id = ? AND cost_date >= ? AND cost_date <= ? ORDER BY cost_date DESC', args: [tenant_id, from, to] });
          return json(200, r.rows);
        }
        const r = await turso.execute({ sql: 'SELECT * FROM financial_costs WHERE tenant_id = ? ORDER BY cost_date DESC', args: [tenant_id] });
        return json(200, r.rows);
      }
      if (type === 'audit' && tenant_id) {
        const r = await turso.execute({ sql: 'SELECT * FROM audit_logs WHERE tenant_id = ? ORDER BY created_at DESC', args: [tenant_id] });
        return json(200, r.rows);
      }
      if (type === 'inventory' && tenant_id) {
        const r = await turso.execute({ sql: 'SELECT im.*, p.name as product_name FROM inventory_movements im LEFT JOIN products p ON im.product_id = p.id WHERE im.tenant_id = ? ORDER BY im.created_at DESC', args: [tenant_id] });
        return json(200, r.rows);
      }
      return json(400, { error: 'Invalid report type' });
    }

    // ── 404 ──────────────────────────────────────
    return json(404, { error: `Route not found: ${apiPath}` });

  } catch (err: any) {
    console.error('[Netlify Function Error]', err);
    return json(500, { error: err.message || 'Internal Server Error' });
  }
};
