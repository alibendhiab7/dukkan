// src/core/repositories/sqlite/index.ts
import { db } from '../../database/db';
import type {
  ITenantRepository,
  IUserRepository,
  ITenantSettingsRepository,
  IProductRepository,
  IInventoryMovementRepository,
  ISalesRepository,
  IExchangeRateRepository,
  IAuditLogRepository,
  ICustomerRepository,
  INotificationRepository,
  ICouponRepository,
  IProductReturnRepository,
  IFinancialCostRepository,
  Tenant,
  User,
  TenantSettings,
  Product,
  InventoryMovement,
  Sale,
  SaleItem,
  ExchangeRate,
  AuditLog,
  Customer,
  Notification,
  Coupon,
  ProductReturn,
  ReturnItem,
  FinancialCost
} from '../interfaces';

// --- Tenant Repository Implementation ---
export class SqliteTenantRepository implements ITenantRepository {
  async getAll(): Promise<Tenant[]> {
    return db.query<Tenant>('SELECT * FROM tenants');
  }

  async getById(id: string): Promise<Tenant | null> {
    const rows = await db.query<Tenant>('SELECT * FROM tenants WHERE id = ?', [id]);
    return rows.length > 0 ? rows[0] : null;
  }

  async getByClientCode(code: string): Promise<Tenant | null> {
    const rows = await db.query<Tenant>('SELECT * FROM tenants WHERE client_code = ?', [code]);
    return rows.length > 0 ? rows[0] : null;
  }

  async create(tenant: Tenant): Promise<void> {
    await db.execute(
      'INSERT INTO tenants (id, client_code, store_name, status, subscription_expires_at, license_plan) VALUES (?, ?, ?, ?, ?, ?)',
      [tenant.id, tenant.client_code, tenant.store_name, tenant.status, tenant.subscription_expires_at, tenant.license_plan]
    );
  }

  async update(tenant: Tenant): Promise<void> {
    await db.execute(
      'UPDATE tenants SET client_code = ?, store_name = ?, status = ?, subscription_expires_at = ?, license_plan = ? WHERE id = ?',
      [tenant.client_code, tenant.store_name, tenant.status, tenant.subscription_expires_at, tenant.license_plan, tenant.id]
    );
  }

  async delete(id: string): Promise<void> {
    await db.execute('DELETE FROM tenants WHERE id = ?', [id]);
  }
}

// --- User Repository Implementation ---
export class SqliteUserRepository implements IUserRepository {
  async getByUsername(tenantId: string, username: string): Promise<User | null> {
    const rows = await db.query<User>(
      'SELECT * FROM users WHERE tenant_id = ? AND username = ?',
      [tenantId, username]
    );
    return rows.length > 0 ? rows[0] : null;
  }

  async getByUsernameGlobal(username: string): Promise<User | null> {
    const rows = await db.query<User>(
      'SELECT * FROM users WHERE tenant_id = ? AND username = ?',
      ['0', username]
    );
    return rows.length > 0 ? rows[0] : null;
  }

  async getByTenant(tenantId: string): Promise<User[]> {
    return db.query<User>('SELECT * FROM users WHERE tenant_id = ?', [tenantId]);
  }

  async create(user: User): Promise<void> {
    await db.execute(
      'INSERT INTO users (id, tenant_id, username, password_hash, role) VALUES (?, ?, ?, ?, ?)',
      [user.id, user.tenant_id, user.username, user.password_hash, user.role]
    );
  }

  async update(user: User): Promise<void> {
    await db.execute(
      'UPDATE users SET username = ?, password_hash = ?, role = ? WHERE id = ? AND tenant_id = ?',
      [user.username, user.password_hash, user.role, user.id, user.tenant_id]
    );
  }

  async delete(id: string, tenantId: string): Promise<void> {
    await db.execute('DELETE FROM users WHERE id = ? AND tenant_id = ?', [id, tenantId]);
  }

  async getPermissions(userId: string): Promise<Record<string, boolean>> {
    const rows = await db.query('SELECT * FROM user_permissions WHERE user_id = ?', [userId]);
    const perms: Record<string, boolean> = {};
    for (const r of rows) {
      perms[r.permission_key] = r.is_granted === 1 || r.is_granted === true || r.is_granted === '1';
    }
    return perms;
  }

  async savePermissions(userId: string, tenantId: string, permissions: Record<string, boolean>): Promise<void> {
    await db.execute('DELETE FROM user_permissions WHERE user_id = ?', [userId]);
    for (const [key, val] of Object.entries(permissions)) {
      const id = `${userId}_${key}`;
      await db.execute(
        'INSERT INTO user_permissions (id, tenant_id, user_id, permission_key, is_granted) VALUES (?, ?, ?, ?, ?)',
        [id, tenantId, userId, key, val ? 1 : 0]
      );
    }
  }
}

// --- Tenant Settings Repository Implementation ---
export class SqliteTenantSettingsRepository implements ITenantSettingsRepository {
  async getByTenantId(tenantId: string): Promise<TenantSettings | null> {
    const rows = await db.query<TenantSettings>(
      'SELECT * FROM tenant_settings WHERE tenant_id = ?',
      [tenantId]
    );
    if (rows.length === 0) return null;
    
    const r = rows[0];
    return {
      tenant_id: r.tenant_id,
      enable_inventory: Boolean(r.enable_inventory),
      enable_sales: Boolean(r.enable_sales),
      enable_reports: Boolean(r.enable_reports),
      enable_employees: Boolean(r.enable_employees)
    };
  }

  async upsert(settings: TenantSettings): Promise<void> {
    const existing = await this.getByTenantId(settings.tenant_id);
    const inv = settings.enable_inventory ? 1 : 0;
    const sal = settings.enable_sales ? 1 : 0;
    const rep = settings.enable_reports ? 1 : 0;
    const emp = settings.enable_employees ? 1 : 0;

    if (existing) {
      await db.execute(
        'UPDATE tenant_settings SET enable_inventory = ?, enable_sales = ?, enable_reports = ?, enable_employees = ? WHERE tenant_id = ?',
        [inv, sal, rep, emp, settings.tenant_id]
      );
    } else {
      await db.execute(
        'INSERT INTO tenant_settings (tenant_id, enable_inventory, enable_sales, enable_reports, enable_employees) VALUES (?, ?, ?, ?, ?)',
        [settings.tenant_id, inv, sal, rep, emp]
      );
    }
  }
}

// --- Product Repository Implementation ---
export class SqliteProductRepository implements IProductRepository {
  async getAll(tenantId: string): Promise<Product[]> {
    return db.query<Product>('SELECT * FROM products WHERE tenant_id = ?', [tenantId]);
  }

  async getById(id: string, tenantId: string): Promise<Product | null> {
    const rows = await db.query<Product>(
      'SELECT * FROM products WHERE id = ? AND tenant_id = ?',
      [id, tenantId]
    );
    return rows.length > 0 ? rows[0] : null;
  }

  async getByBarcode(barcode: string, tenantId: string): Promise<Product | null> {
    const rows = await db.query<Product>(
      'SELECT * FROM products WHERE barcode = ? AND tenant_id = ?',
      [barcode, tenantId]
    );
    return rows.length > 0 ? rows[0] : null;
  }

  async getByCategory(category: string, tenantId: string): Promise<Product[]> {
    return db.query<Product>(
      'SELECT * FROM products WHERE category = ? AND tenant_id = ?',
      [category, tenantId]
    );
  }

  async getLowStock(tenantId: string, threshold: number = 5): Promise<Product[]> {
    return db.query<Product>(
      'SELECT * FROM products WHERE tenant_id = ? AND quantity < ?',
      [tenantId, threshold]
    );
  }

  async create(p: Product): Promise<void> {
    await db.execute(
      `INSERT INTO products (id, tenant_id, name, barcode, purchase_price, sale_price, currency, quantity, category, unit_of_measure, min_stock, max_stock, image_url, expiry_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [p.id, p.tenant_id, p.name, p.barcode, p.purchase_price, p.sale_price, p.currency, p.quantity, p.category || null, p.unit_of_measure || 'piece', p.min_stock || 5, p.max_stock || 100, p.image_url || null, p.expiry_date || null]
    );
  }

  async update(p: Product): Promise<void> {
    await db.execute(
      `UPDATE products SET name = ?, barcode = ?, purchase_price = ?, sale_price = ?, currency = ?, quantity = ?, category = ?, unit_of_measure = ?, min_stock = ?, max_stock = ?, image_url = ?, expiry_date = ? WHERE id = ? AND tenant_id = ?`,
      [p.name, p.barcode, p.purchase_price, p.sale_price, p.currency, p.quantity, p.category || null, p.unit_of_measure || 'piece', p.min_stock || 5, p.max_stock || 100, p.image_url || null, p.expiry_date || null, p.id, p.tenant_id]
    );
  }

  async delete(id: string, tenantId: string): Promise<void> {
    await db.execute('DELETE FROM products WHERE id = ? AND tenant_id = ?', [id, tenantId]);
  }

  async updateStock(id: string, tenantId: string, delta: number): Promise<void> {
    const p = await this.getById(id, tenantId);
    if (p) {
      const newQty = p.quantity + delta;
      await db.execute(
        `UPDATE products SET name = ?, barcode = ?, purchase_price = ?, sale_price = ?, currency = ?, quantity = ?, category = ?, unit_of_measure = ?, min_stock = ?, max_stock = ?, image_url = ?, expiry_date = ? WHERE id = ? AND tenant_id = ?`,
        [p.name, p.barcode, p.purchase_price, p.sale_price, p.currency, newQty, p.category || null, p.unit_of_measure || 'piece', p.min_stock || 5, p.max_stock || 100, p.image_url || null, p.expiry_date || null, p.id, p.tenant_id]
      );
    }
  }
}

// --- Inventory Movement Repository Implementation ---
export class SqliteInventoryMovementRepository implements IInventoryMovementRepository {
  async getByTenant(tenantId: string): Promise<InventoryMovement[]> {
    const movements = await db.query<InventoryMovement>(
      'SELECT * FROM inventory_movements WHERE tenant_id = ? ORDER BY created_at DESC',
      [tenantId]
    );
    
    const products = await db.query<Product>('SELECT * FROM products WHERE tenant_id = ?', [tenantId]);
    const prodMap = new Map(products.map(p => [p.id, p.name]));

    return movements.map(m => ({
      ...m,
      product_name: prodMap.get(m.product_id) || 'منتج غير معروف'
    }));
  }

  async getByProduct(productId: string, tenantId: string): Promise<InventoryMovement[]> {
    const movements = await db.query<InventoryMovement>(
      'SELECT * FROM inventory_movements WHERE product_id = ? AND tenant_id = ? ORDER BY created_at DESC',
      [productId, tenantId]
    );

    const products = await db.query<Product>('SELECT * FROM products WHERE tenant_id = ?', [tenantId]);
    const prodMap = new Map(products.map(p => [p.id, p.name]));

    return movements.map(m => ({
      ...m,
      product_name: prodMap.get(m.product_id) || 'منتج غير معروف'
    }));
  }

  async create(m: InventoryMovement): Promise<void> {
    await db.execute(
      'INSERT INTO inventory_movements (id, tenant_id, product_id, type, quantity, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [m.id, m.tenant_id, m.product_id, m.type, m.quantity, m.created_at]
    );
  }
}

// --- Sales Repository Implementation ---
export class SqliteSalesRepository implements ISalesRepository {
  async getAll(tenantId: string): Promise<Sale[]> {
    return db.query<Sale>('SELECT * FROM sales WHERE tenant_id = ? ORDER BY created_at DESC', [tenantId]);
  }

  async getById(id: string, tenantId: string): Promise<Sale | null> {
    const sales = await db.query<Sale>('SELECT * FROM sales WHERE id = ? AND tenant_id = ?', [id, tenantId]);
    if (sales.length === 0) return null;
    const sale = sales[0];
    sale.items = await this.getItems(id);
    return sale;
  }

  async getItems(saleId: string): Promise<SaleItem[]> {
    const items = await db.query<SaleItem>('SELECT * FROM sale_items WHERE sale_id = ?', [saleId]);
    
    const products = await db.query<Product>('SELECT id, name FROM products');
    const nameMap = new Map(products.map(p => [p.id, p.name]));

    return items.map(item => ({
      ...item,
      product_name: nameMap.get(item.product_id) || 'منتج غير معروف'
    }));
  }

  async getByDateRange(tenantId: string, from: string, to: string): Promise<Sale[]> {
    return db.query<Sale>(
      'SELECT * FROM sales WHERE tenant_id = ? AND created_at >= ? AND created_at <= ? ORDER BY created_at DESC',
      [tenantId, from, to]
    );
  }

  async getByCustomer(customerId: string, tenantId: string): Promise<Sale[]> {
    return db.query<Sale>(
      'SELECT * FROM sales WHERE customer_id = ? AND tenant_id = ? ORDER BY created_at DESC',
      [customerId, tenantId]
    );
  }

  async create(sale: Sale, items: SaleItem[]): Promise<void> {
    await db.transaction(async (tx) => {
      await tx.execute(
        'INSERT INTO sales (id, tenant_id, total, created_by, created_at, customer_id, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [sale.id, sale.tenant_id, sale.total, sale.created_by, sale.created_at, sale.customer_id || null, sale.notes || null]
      );

      for (const item of items) {
        await tx.execute(
          'INSERT INTO sale_items (id, sale_id, product_id, qty, price) VALUES (?, ?, ?, ?, ?)',
          [item.id, item.sale_id, item.product_id, item.qty, item.price]
        );

        const prodRows = await tx.query<Product>(
          'SELECT * FROM products WHERE id = ? AND tenant_id = ?',
          [item.product_id, sale.tenant_id]
        );

        if (prodRows.length > 0) {
          const p = prodRows[0];
          const newQty = p.quantity - item.qty;
          
          await tx.execute(
            `UPDATE products SET name = ?, barcode = ?, purchase_price = ?, sale_price = ?, currency = ?, quantity = ?, category = ?, unit_of_measure = ?, min_stock = ?, max_stock = ?, image_url = ?, expiry_date = ? WHERE id = ? AND tenant_id = ?`,
            [p.name, p.barcode, p.purchase_price, p.sale_price, p.currency, newQty, p.category || null, p.unit_of_measure || 'piece', p.min_stock || 5, p.max_stock || 100, p.image_url || null, p.expiry_date || null, p.id, sale.tenant_id]
          );

          await tx.execute(
            'INSERT INTO inventory_movements (id, tenant_id, product_id, type, quantity, created_at) VALUES (?, ?, ?, ?, ?, ?)',
            [`mov_${item.id}`, sale.tenant_id, item.product_id, 'out', item.qty, sale.created_at]
          );
        }
      }
    });
  }

  async voidSale(saleId: string, tenantId: string, username: string): Promise<void> {
    await db.transaction(async (tx) => {
      const saleRows = await tx.query<Sale>('SELECT * FROM sales WHERE id = ? AND tenant_id = ?', [saleId, tenantId]);
      if (saleRows.length === 0) throw new Error('Sale not found');
      const items = await this.getItems(saleId);
      
      for (const item of items) {
        const prodRows = await tx.query<Product>(
          'SELECT * FROM products WHERE id = ? AND tenant_id = ?',
          [item.product_id, tenantId]
        );

        if (prodRows.length > 0) {
          const p = prodRows[0];
          const newQty = p.quantity + item.qty;
          
          await tx.execute(
            `UPDATE products SET name = ?, barcode = ?, purchase_price = ?, sale_price = ?, currency = ?, quantity = ?, category = ?, unit_of_measure = ?, min_stock = ?, max_stock = ?, image_url = ?, expiry_date = ? WHERE id = ? AND tenant_id = ?`,
            [p.name, p.barcode, p.purchase_price, p.sale_price, p.currency, newQty, p.category || null, p.unit_of_measure || 'piece', p.min_stock || 5, p.max_stock || 100, p.image_url || null, p.expiry_date || null, p.id, tenantId]
          );

          await tx.execute(
            'INSERT INTO inventory_movements (id, tenant_id, product_id, type, quantity, created_at) VALUES (?, ?, ?, ?, ?, ?)',
            [`mov_void_${item.id}`, tenantId, item.product_id, 'in', item.qty, new Date().toISOString()]
          );
        }
      }

      await tx.execute('DELETE FROM sale_items WHERE sale_id = ?', [saleId]);
      await tx.execute('DELETE FROM sales WHERE id = ? AND tenant_id = ?', [saleId, tenantId]);

      await tx.execute(
        'INSERT INTO audit_logs (id, tenant_id, action, performed_by, created_at) VALUES (?, ?, ?, ?, ?)',
        [`audit_void_${saleId}`, tenantId, `إلغاء الفاتورة ${saleId}`, username, new Date().toISOString()]
      );
    });
  }
}

// --- Exchange Rate Repository Implementation ---
export class SqliteExchangeRateRepository implements IExchangeRateRepository {
  async getLatest(tenantId: string): Promise<ExchangeRate | null> {
    const rows = await db.query<ExchangeRate>(
      'SELECT * FROM exchange_rates WHERE tenant_id = ? ORDER BY updated_at DESC LIMIT 1',
      [tenantId]
    );
    return rows.length > 0 ? rows[0] : null;
  }

  async updateRate(tenantId: string, sarToYer: number): Promise<void> {
    const existing = await this.getLatest(tenantId);
    const now = new Date().toISOString();
    if (existing) {
      await db.execute(
        'UPDATE exchange_rates SET sar_to_yer = ?, updated_at = ? WHERE tenant_id = ?',
        [sarToYer, now, tenantId]
      );
    } else {
      const id = 'rate_' + Math.floor(Math.random() * 1000000);
      await db.execute(
        'INSERT INTO exchange_rates (id, tenant_id, sar_to_yer, updated_at) VALUES (?, ?, ?, ?)',
        [id, tenantId, sarToYer, now]
      );
    }
  }
}

// --- Audit Log Repository Implementation ---
export class SqliteAuditLogRepository implements IAuditLogRepository {
  async getAll(tenantId: string): Promise<AuditLog[]> {
    return db.query<AuditLog>(
      'SELECT * FROM audit_logs WHERE tenant_id = ? ORDER BY created_at DESC',
      [tenantId]
    );
  }

  async getByDateRange(tenantId: string, from: string, to: string): Promise<AuditLog[]> {
    return db.query<AuditLog>(
      'SELECT * FROM audit_logs WHERE tenant_id = ? AND created_at >= ? AND created_at <= ? ORDER BY created_at DESC',
      [tenantId, from, to]
    );
  }

  async create(log: Omit<AuditLog, 'id' | 'created_at'>): Promise<void> {
    const id = 'log_' + Math.floor(Math.random() * 1000000);
    const now = new Date().toISOString();
    await db.execute(
      'INSERT INTO audit_logs (id, tenant_id, action, performed_by, created_at) VALUES (?, ?, ?, ?, ?)',
      [id, log.tenant_id, log.action, log.performed_by, now]
    );
  }
}

// --- Customer Repository Implementation ---
export class SqliteCustomerRepository implements ICustomerRepository {
  async getAll(tenantId: string): Promise<Customer[]> {
    return db.query<Customer>('SELECT * FROM customers WHERE tenant_id = ? ORDER BY created_at DESC', [tenantId]);
  }

  async getById(id: string, tenantId: string): Promise<Customer | null> {
    const rows = await db.query<Customer>(
      'SELECT * FROM customers WHERE id = ? AND tenant_id = ?',
      [id, tenantId]
    );
    return rows.length > 0 ? rows[0] : null;
  }

  async search(query: string, tenantId: string): Promise<Customer[]> {
    return db.query<Customer>(
      "SELECT * FROM customers WHERE tenant_id = ? AND (name LIKE ? OR phone LIKE ?) ORDER BY created_at DESC",
      [tenantId, `%${query}%`, `%${query}%`]
    );
  }

  async create(c: Customer): Promise<void> {
    await db.execute(
      'INSERT INTO customers (id, tenant_id, name, phone, email, address, loyalty_points, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [c.id, c.tenant_id, c.name, c.phone, c.email || null, c.address || null, c.loyalty_points || 0, c.created_at]
    );
  }

  async update(c: Customer): Promise<void> {
    await db.execute(
      'UPDATE customers SET name = ?, phone = ?, email = ?, address = ?, loyalty_points = ? WHERE id = ? AND tenant_id = ?',
      [c.name, c.phone, c.email || null, c.address || null, c.loyalty_points, c.id, c.tenant_id]
    );
  }

  async delete(id: string, tenantId: string): Promise<void> {
    await db.execute('DELETE FROM customers WHERE id = ? AND tenant_id = ?', [id, tenantId]);
  }

  async addLoyaltyPoints(customerId: string, tenantId: string, points: number): Promise<void> {
    const c = await this.getById(customerId, tenantId);
    if (c) {
      await this.update({ ...c, loyalty_points: c.loyalty_points + points });
    }
  }
}

// --- Notification Repository Implementation ---
export class SqliteNotificationRepository implements INotificationRepository {
  async getAll(tenantId: string): Promise<Notification[]> {
    return db.query<Notification>(
      'SELECT * FROM notifications WHERE tenant_id = ? ORDER BY created_at DESC',
      [tenantId]
    );
  }

  async getUnread(tenantId: string): Promise<Notification[]> {
    return db.query<Notification>(
      'SELECT * FROM notifications WHERE tenant_id = ? AND is_read = 0 ORDER BY created_at DESC',
      [tenantId]
    );
  }

  async create(n: Omit<Notification, 'id' | 'created_at'>): Promise<void> {
    const id = 'notif_' + Math.floor(Math.random() * 1000000);
    const now = new Date().toISOString();
    await db.execute(
      'INSERT INTO notifications (id, tenant_id, title, message, type, is_read, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, n.tenant_id, n.title, n.message, n.type, n.is_read ? 1 : 0, now]
    );
  }

  async markAsRead(id: string, tenantId: string): Promise<void> {
    await db.execute(
      'UPDATE notifications SET is_read = 1 WHERE id = ? AND tenant_id = ?',
      [id, tenantId]
    );
  }

  async markAllAsRead(tenantId: string): Promise<void> {
    await db.execute(
      'UPDATE notifications SET is_read = 1 WHERE tenant_id = ?',
      [tenantId]
    );
  }

  async delete(id: string, tenantId: string): Promise<void> {
    await db.execute('DELETE FROM notifications WHERE id = ? AND tenant_id = ?', [id, tenantId]);
  }
}

// --- Coupon Repository Implementation ---
export class SqliteCouponRepository implements ICouponRepository {
  async getAll(tenantId: string): Promise<Coupon[]> {
    return db.query<Coupon>('SELECT * FROM coupons WHERE tenant_id = ? ORDER BY created_at DESC', [tenantId]);
  }

  async getByCode(code: string, tenantId: string): Promise<Coupon | null> {
    const rows = await db.query<Coupon>(
      'SELECT * FROM coupons WHERE code = ? AND tenant_id = ?',
      [code.toUpperCase(), tenantId]
    );
    return rows.length > 0 ? rows[0] : null;
  }

  async create(c: Coupon): Promise<void> {
    await db.execute(
      'INSERT INTO coupons (id, tenant_id, code, discount_type, discount_value, max_uses, used_count, min_cart_total, expires_at, is_active, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [c.id, c.tenant_id, c.code.toUpperCase(), c.discount_type, c.discount_value, c.max_uses, c.used_count || 0, c.min_cart_total || 0, c.expires_at, c.is_active ? 1 : 0, c.created_at]
    );
  }

  async update(c: Coupon): Promise<void> {
    await db.execute(
      'UPDATE coupons SET code = ?, discount_type = ?, discount_value = ?, max_uses = ?, used_count = ?, min_cart_total = ?, expires_at = ?, is_active = ? WHERE id = ? AND tenant_id = ?',
      [c.code.toUpperCase(), c.discount_type, c.discount_value, c.max_uses, c.used_count, c.min_cart_total, c.expires_at, c.is_active ? 1 : 0, c.id, c.tenant_id]
    );
  }

  async delete(id: string, tenantId: string): Promise<void> {
    await db.execute('DELETE FROM coupons WHERE id = ? AND tenant_id = ?', [id, tenantId]);
  }

  async incrementUsage(id: string, tenantId: string): Promise<void> {
    const c = await db.query<Coupon>('SELECT * FROM coupons WHERE id = ? AND tenant_id = ?', [id, tenantId]);
    if (c.length > 0) {
      await db.execute(
        'UPDATE coupons SET used_count = ? WHERE id = ? AND tenant_id = ?',
        [c[0].used_count + 1, id, tenantId]
      );
    }
  }
}

// --- Product Return Repository Implementation ---
export class SqliteProductReturnRepository implements IProductReturnRepository {
  async getAll(tenantId: string): Promise<ProductReturn[]> {
    return db.query<ProductReturn>(
      'SELECT * FROM product_returns WHERE tenant_id = ? ORDER BY created_at DESC',
      [tenantId]
    );
  }

  async getById(id: string, tenantId: string): Promise<ProductReturn | null> {
    const rows = await db.query<ProductReturn>(
      'SELECT * FROM product_returns WHERE id = ? AND tenant_id = ?',
      [id, tenantId]
    );
    if (rows.length === 0) return null;
    const ret = rows[0];
    ret.items = await this.getItems(id);
    return ret;
  }

  async getItems(returnId: string): Promise<ReturnItem[]> {
    const items = await db.query<ReturnItem>('SELECT * FROM return_items WHERE return_id = ?', [returnId]);
    const products = await db.query<Product>('SELECT id, name FROM products');
    const nameMap = new Map(products.map(p => [p.id, p.name]));
    return items.map(item => ({
      ...item,
      product_name: nameMap.get(item.product_id) || 'منتج غير معروف'
    }));
  }

  async create(returnData: ProductReturn, items: ReturnItem[]): Promise<void> {
    await db.transaction(async (tx) => {
      await tx.execute(
        'INSERT INTO product_returns (id, tenant_id, sale_id, total_refund, reason, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [returnData.id, returnData.tenant_id, returnData.sale_id, returnData.total_refund, returnData.reason, returnData.created_by, returnData.created_at]
      );

      for (const item of items) {
        await tx.execute(
          'INSERT INTO return_items (id, return_id, product_id, qty, price) VALUES (?, ?, ?, ?, ?)',
          [item.id, returnData.id, item.product_id, item.qty, item.price]
        );

        const prodRows = await tx.query<Product>(
          'SELECT * FROM products WHERE id = ? AND tenant_id = ?',
          [item.product_id, returnData.tenant_id]
        );

        if (prodRows.length > 0) {
          const p = prodRows[0];
          const newQty = p.quantity + item.qty;
          await tx.execute(
            `UPDATE products SET name = ?, barcode = ?, purchase_price = ?, sale_price = ?, currency = ?, quantity = ?, category = ?, unit_of_measure = ?, min_stock = ?, max_stock = ?, image_url = ?, expiry_date = ? WHERE id = ? AND tenant_id = ?`,
            [p.name, p.barcode, p.purchase_price, p.sale_price, p.currency, newQty, p.category || null, p.unit_of_measure || 'piece', p.min_stock || 5, p.max_stock || 100, p.image_url || null, p.expiry_date || null, p.id, returnData.tenant_id]
          );

          await tx.execute(
            'INSERT INTO inventory_movements (id, tenant_id, product_id, type, quantity, created_at) VALUES (?, ?, ?, ?, ?, ?)',
            [`mov_return_${item.id}`, returnData.tenant_id, item.product_id, 'in', item.qty, returnData.created_at]
          );
        }
      }
    });
  }
}

// --- Financial Cost Repository Implementation ---
export class SqliteFinancialCostRepository implements IFinancialCostRepository {
  async getAll(tenantId: string): Promise<FinancialCost[]> {
    return db.query<FinancialCost>(
      'SELECT * FROM financial_costs WHERE tenant_id = ? ORDER BY cost_date DESC',
      [tenantId]
    );
  }

  async getByDateRange(tenantId: string, from: string, to: string): Promise<FinancialCost[]> {
    return db.query<FinancialCost>(
      'SELECT * FROM financial_costs WHERE tenant_id = ? AND cost_date >= ? AND cost_date <= ? ORDER BY cost_date DESC',
      [tenantId, from, to]
    );
  }

  async create(c: FinancialCost): Promise<void> {
    await db.execute(
      'INSERT INTO financial_costs (id, tenant_id, category, description, amount, currency, cost_date, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [c.id, c.tenant_id, c.category, c.description, c.amount, c.currency, c.cost_date, c.created_by, c.created_at]
    );
  }

  async update(c: FinancialCost): Promise<void> {
    await db.execute(
      'UPDATE financial_costs SET category = ?, description = ?, amount = ?, currency = ?, cost_date = ? WHERE id = ? AND tenant_id = ?',
      [c.category, c.description, c.amount, c.currency, c.cost_date, c.id, c.tenant_id]
    );
  }

  async delete(id: string, tenantId: string): Promise<void> {
    await db.execute('DELETE FROM financial_costs WHERE id = ? AND tenant_id = ?', [id, tenantId]);
  }

  async getTotal(tenantId: string, category?: string): Promise<number> {
    let result;
    if (category) {
      result = await db.query<{ total: number }>(
        'SELECT SUM(amount) as total FROM financial_costs WHERE tenant_id = ? AND category = ?',
        [tenantId, category]
      );
    } else {
      result = await db.query<{ total: number }>(
        'SELECT SUM(amount) as total FROM financial_costs WHERE tenant_id = ?',
        [tenantId]
      );
    }
    return result.length > 0 ? (result[0].total || 0) : 0;
  }
}

// Global Repository Factory Registry
export const tenantRepo = new SqliteTenantRepository();
export const userRepo = new SqliteUserRepository();
export const settingsRepo = new SqliteTenantSettingsRepository();
export const productRepo = new SqliteProductRepository();
export const movementRepo = new SqliteInventoryMovementRepository();
export const salesRepo = new SqliteSalesRepository();
export const rateRepo = new SqliteExchangeRateRepository();
export const auditRepo = new SqliteAuditLogRepository();
export const customerRepo = new SqliteCustomerRepository();
export const notificationRepo = new SqliteNotificationRepository();
export const couponRepo = new SqliteCouponRepository();
export const returnRepo = new SqliteProductReturnRepository();
export const costRepo = new SqliteFinancialCostRepository();
