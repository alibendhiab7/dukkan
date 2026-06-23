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
  Tenant,
  User,
  TenantSettings,
  Product,
  InventoryMovement,
  Sale,
  SaleItem,
  ExchangeRate,
  AuditLog
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
}

// --- Tenant Settings Repository Implementation ---
export class SqliteTenantSettingsRepository implements ITenantSettingsRepository {
  async getByTenantId(tenantId: string): Promise<TenantSettings | null> {
    const rows = await db.query<TenantSettings>(
      'SELECT * FROM tenant_settings WHERE tenant_id = ?',
      [tenantId]
    );
    if (rows.length === 0) return null;
    
    // Map numerical values (0/1) from SQLite to boolean
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

  async create(p: Product): Promise<void> {
    await db.execute(
      'INSERT INTO products (id, tenant_id, name, barcode, purchase_price, sale_price, currency, quantity) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [p.id, p.tenant_id, p.name, p.barcode, p.purchase_price, p.sale_price, p.currency, p.quantity]
    );
  }

  async update(p: Product): Promise<void> {
    await db.execute(
      'UPDATE products SET name = ?, barcode = ?, purchase_price = ?, sale_price = ?, currency = ?, quantity = ? WHERE id = ? AND tenant_id = ?',
      [p.name, p.barcode, p.purchase_price, p.sale_price, p.currency, p.quantity, p.id, p.tenant_id]
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
        'UPDATE products SET name = ?, barcode = ?, purchase_price = ?, sale_price = ?, currency = ?, quantity = ? WHERE id = ? AND tenant_id = ?',
        [p.name, p.barcode, p.purchase_price, p.sale_price, p.currency, newQty, p.id, p.tenant_id]
      );
    }
  }
}

// --- Inventory Movement Repository Implementation ---
export class SqliteInventoryMovementRepository implements IInventoryMovementRepository {
  async getByTenant(tenantId: string): Promise<InventoryMovement[]> {
    // Join product to get name for logs
    const movements = await db.query<InventoryMovement>(
      'SELECT * FROM inventory_movements WHERE tenant_id = ? ORDER BY created_at DESC',
      [tenantId]
    );
    
    // Enrich with product names
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
    
    // Find all products to enrich item with product name
    // (Since we are local, query the products table)
    const products = await db.query<Product>('SELECT id, name FROM products');
    const nameMap = new Map(products.map(p => [p.id, p.name]));

    return items.map(item => ({
      ...item,
      product_name: nameMap.get(item.product_id) || 'منتج غير معروف'
    }));
  }

  async create(sale: Sale, items: SaleItem[]): Promise<void> {
    // Perform all changes in a transaction to keep integrity
    await db.transaction(async (tx) => {
      // 1. Insert Sales Invoice Header
      await tx.execute(
        'INSERT INTO sales (id, tenant_id, total, created_by, created_at) VALUES (?, ?, ?, ?, ?)',
        [sale.id, sale.tenant_id, sale.total, sale.created_by, sale.created_at]
      );

      // 2. Insert Sale Items, update stock, and log inventory movements
      for (const item of items) {
        await tx.execute(
          'INSERT INTO sale_items (id, sale_id, product_id, qty, price) VALUES (?, ?, ?, ?, ?)',
          [item.id, item.sale_id, item.product_id, item.qty, item.price]
        );

        // Fetch product to update stock
        const prodRows = await tx.query<Product>(
          'SELECT * FROM products WHERE id = ? AND tenant_id = ?',
          [item.product_id, sale.tenant_id]
        );

        if (prodRows.length > 0) {
          const p = prodRows[0];
          const newQty = p.quantity - item.qty;
          
          // Update product stock
          await tx.execute(
            'UPDATE products SET name = ?, barcode = ?, purchase_price = ?, sale_price = ?, currency = ?, quantity = ? WHERE id = ? AND tenant_id = ?',
            [p.name, p.barcode, p.purchase_price, p.sale_price, p.currency, newQty, p.id, sale.tenant_id]
          );

          // Add movement log
          await tx.execute(
            'INSERT INTO inventory_movements (id, tenant_id, product_id, type, quantity, created_at) VALUES (?, ?, ?, ?, ?, ?)',
            [`mov_${item.id}`, sale.tenant_id, item.product_id, 'out', item.qty, sale.created_at]
          );
        }
      }
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

  async create(log: Omit<AuditLog, 'id' | 'created_at'>): Promise<void> {
    const id = 'log_' + Math.floor(Math.random() * 1000000);
    const now = new Date().toISOString();
    await db.execute(
      'INSERT INTO audit_logs (id, tenant_id, action, performed_by, created_at) VALUES (?, ?, ?, ?, ?)',
      [id, log.tenant_id, log.action, log.performed_by, now]
    );
  }
}

// Global Repository Factory Registry for Clean Dependency Injection
export const tenantRepo = new SqliteTenantRepository();
export const userRepo = new SqliteUserRepository();
export const settingsRepo = new SqliteTenantSettingsRepository();
export const productRepo = new SqliteProductRepository();
export const movementRepo = new SqliteInventoryMovementRepository();
export const salesRepo = new SqliteSalesRepository();
export const rateRepo = new SqliteExchangeRateRepository();
export const auditRepo = new SqliteAuditLogRepository();
