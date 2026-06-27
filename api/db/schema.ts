import { turso } from './turso';

export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY,
  client_code TEXT NOT NULL UNIQUE,
  store_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  subscription_expires_at TEXT NOT NULL,
  license_plan TEXT NOT NULL,
  max_users INTEGER DEFAULT 5
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  username TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'employee',
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE TABLE IF NOT EXISTS tenant_settings (
  tenant_id TEXT PRIMARY KEY,
  enable_inventory INTEGER NOT NULL DEFAULT 1,
  enable_sales INTEGER NOT NULL DEFAULT 1,
  enable_reports INTEGER NOT NULL DEFAULT 1,
  enable_employees INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  barcode TEXT NOT NULL,
  purchase_price REAL NOT NULL DEFAULT 0,
  sale_price REAL NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'SAR',
  quantity INTEGER NOT NULL DEFAULT 0,
  category TEXT,
  unit_of_measure TEXT DEFAULT 'piece',
  min_stock INTEGER DEFAULT 5,
  max_stock INTEGER DEFAULT 100,
  image_url TEXT,
  expiry_date TEXT,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE TABLE IF NOT EXISTS inventory_movements (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  type TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE IF NOT EXISTS sales (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  total REAL NOT NULL DEFAULT 0,
  discount REAL DEFAULT 0,
  discount_type TEXT,
  final_total REAL,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  customer_id TEXT,
  notes TEXT,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE TABLE IF NOT EXISTS sale_items (
  id TEXT PRIMARY KEY,
  sale_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  qty INTEGER NOT NULL,
  price REAL NOT NULL,
  discount REAL DEFAULT 0,
  FOREIGN KEY (sale_id) REFERENCES sales(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE IF NOT EXISTS exchange_rates (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  sar_to_yer REAL NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  action TEXT NOT NULL,
  performed_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  is_read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE TABLE IF NOT EXISTS financial_costs (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  amount REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'SAR',
  cost_date TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  address TEXT,
  loyalty_points INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE TABLE IF NOT EXISTS coupons (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  code TEXT NOT NULL,
  discount_type TEXT NOT NULL,
  discount_value REAL NOT NULL,
  max_uses INTEGER NOT NULL DEFAULT 100,
  used_count INTEGER NOT NULL DEFAULT 0,
  min_cart_total REAL NOT NULL DEFAULT 0,
  expires_at TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE TABLE IF NOT EXISTS product_returns (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  sale_id TEXT NOT NULL,
  total_refund REAL NOT NULL,
  reason TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  FOREIGN KEY (sale_id) REFERENCES sales(id)
);

CREATE TABLE IF NOT EXISTS return_items (
  id TEXT PRIMARY KEY,
  return_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  qty INTEGER NOT NULL,
  price REAL NOT NULL,
  FOREIGN KEY (return_id) REFERENCES product_returns(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE IF NOT EXISTS user_permissions (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  permission_key TEXT NOT NULL,
  is_granted INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS debts (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  customer_id TEXT NOT NULL,
  amount REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'SAR',
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE TABLE IF NOT EXISTS debt_logs (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  debt_id TEXT NOT NULL,
  action TEXT NOT NULL,
  amount REAL,
  performed_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  FOREIGN KEY (debt_id) REFERENCES debts(id)
);

CREATE TABLE IF NOT EXISTS promotions (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  product_id TEXT,
  min_qty INTEGER NOT NULL DEFAULT 0,
  free_qty INTEGER NOT NULL DEFAULT 0,
  discount_percent REAL,
  valid_from TEXT NOT NULL,
  valid_to TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE INDEX IF NOT EXISTS idx_users_tenant_username ON users (tenant_id, username);
CREATE INDEX IF NOT EXISTS idx_users_username ON users (username);
CREATE INDEX IF NOT EXISTS idx_products_tenant_barcode ON products (tenant_id, barcode);
CREATE INDEX IF NOT EXISTS idx_products_tenant_category ON products (tenant_id, category);
CREATE INDEX IF NOT EXISTS idx_products_tenant_quantity ON products (tenant_id, quantity);
CREATE INDEX IF NOT EXISTS idx_sales_tenant_created ON sales (tenant_id, created_at);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items (sale_id);
CREATE INDEX IF NOT EXISTS idx_movements_tenant ON inventory_movements (tenant_id);
CREATE INDEX IF NOT EXISTS idx_movements_product ON inventory_movements (product_id);
CREATE INDEX IF NOT EXISTS idx_debts_tenant ON debts (tenant_id);
CREATE INDEX IF NOT EXISTS idx_debts_customer ON debts (customer_id);
CREATE INDEX IF NOT EXISTS idx_customers_tenant ON customers (tenant_id);
CREATE INDEX IF NOT EXISTS idx_notifications_tenant ON notifications (tenant_id);
CREATE INDEX IF NOT EXISTS idx_costs_tenant ON financial_costs (tenant_id);
CREATE INDEX IF NOT EXISTS idx_promotions_tenant ON promotions (tenant_id);
CREATE INDEX IF NOT EXISTS idx_coupons_tenant ON coupons (tenant_id);
CREATE INDEX IF NOT EXISTS idx_returns_tenant ON product_returns (tenant_id);
CREATE INDEX IF NOT EXISTS idx_permissions_tenant_user ON user_permissions (tenant_id, user_id);

CREATE TABLE IF NOT EXISTS tenant_payments (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  amount REAL NOT NULL,
  payment_date TEXT NOT NULL,
  payment_type TEXT NOT NULL,
  license_plan TEXT NOT NULL,
  duration_days INTEGER NOT NULL,
  max_users INTEGER NOT NULL,
  notes TEXT,
  performed_by TEXT NOT NULL,
  payment_method TEXT,
  coupon_code TEXT,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE INDEX IF NOT EXISTS idx_tenant_payments_tenant ON tenant_payments (tenant_id);

CREATE TABLE IF NOT EXISTS platform_payment_methods (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  details TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tenant_invoices (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  invoice_number TEXT NOT NULL UNIQUE,
  amount REAL NOT NULL,
  tax REAL DEFAULT 0,
  discount REAL DEFAULT 0,
  final_total REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'unpaid',
  issue_date TEXT NOT NULL,
  due_date TEXT NOT NULL,
  license_plan TEXT NOT NULL,
  duration_days INTEGER NOT NULL,
  max_users INTEGER NOT NULL,
  payment_method TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE INDEX IF NOT EXISTS idx_tenant_invoices_tenant ON tenant_invoices (tenant_id);

CREATE TABLE IF NOT EXISTS platform_coupons (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  discount_type TEXT NOT NULL,
  discount_value REAL NOT NULL,
  expires_at TEXT NOT NULL,
  max_uses INTEGER NOT NULL DEFAULT 100,
  used_count INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS support_tickets (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  priority TEXT NOT NULL DEFAULT 'medium',
  created_at TEXT NOT NULL,
  resolved_at TEXT,
  response TEXT,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_tenant ON support_tickets (tenant_id);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_tenant ON push_subscriptions (tenant_id);
`;

export async function migrate() {
  const statements = SCHEMA_SQL.split(';').filter(s => s.trim());
  for (const stmt of statements) {
    try {
      await turso.execute(stmt.trim());
    } catch (err: any) {
      if (!err.message.includes('already exists') && !err.message.includes('duplicate')) {
        throw err;
      }
    }
  }
  try {
    await turso.execute('ALTER TABLE tenants ADD COLUMN max_users INTEGER DEFAULT 5');
  } catch (err: any) {
    if (!err.message.includes('duplicate column') && !err.message.includes('already exists')) {
      console.log('[Migrate] Note: max_users column migration:', err.message);
    }
  }
  try {
    await turso.execute('ALTER TABLE tenant_payments ADD COLUMN payment_method TEXT');
  } catch (err: any) {
    if (!err.message.includes('duplicate column') && !err.message.includes('already exists')) {
      console.log('[Migrate] Note: payment_method column migration:', err.message);
    }
  }
  try {
    await turso.execute('ALTER TABLE tenant_payments ADD COLUMN coupon_code TEXT');
  } catch (err: any) {
    if (!err.message.includes('duplicate column') && !err.message.includes('already exists')) {
      console.log('[Migrate] Note: coupon_code column migration:', err.message);
    }
  }
  console.log('[Turso] Schema migration complete');
}
