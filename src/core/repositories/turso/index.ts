import { api } from '../../api/client';
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

export class TursoTenantRepository implements ITenantRepository {
  async getAll(): Promise<Tenant[]> { return api.tenants.getAll(); }
  async getById(id: string): Promise<Tenant | null> { return api.tenants.getById(id); }
  async getByClientCode(code: string): Promise<Tenant | null> { return api.tenants.getByCode(code); }
  async create(tenant: Tenant): Promise<void> { await api.tenants.create(tenant); }
  async update(tenant: Tenant): Promise<void> { await api.tenants.update(tenant); }
  async delete(id: string): Promise<void> { await api.tenants.remove(id); }
}

export class TursoUserRepository implements IUserRepository {
  async getByUsername(tenantId: string, username: string): Promise<User | null> {
    return api.users.getByUsername(tenantId, username);
  }
  async getByUsernameGlobal(username: string): Promise<User | null> {
    return api.users.getGlobalByUsername(username);
  }
  async getByTenant(tenantId: string): Promise<User[]> {
    return api.users.getByTenant(tenantId);
  }
  async create(user: User): Promise<void> { await api.users.create(user); }
  async update(user: User): Promise<void> { await api.users.update(user); }
  async delete(id: string, tenantId: string): Promise<void> { await api.users.remove(id, tenantId); }
  async getPermissions(userId: string): Promise<Record<string, boolean>> {
    const all = await api.permissions.get('0');
    return all[userId] || {};
  }
  async savePermissions(userId: string, tenantId: string, permissions: Record<string, boolean>): Promise<void> {
    await api.permissions.save(tenantId, userId, permissions);
  }
}

export class TursoTenantSettingsRepository implements ITenantSettingsRepository {
  async getByTenantId(tenantId: string): Promise<TenantSettings | null> {
    return api.settings.getByTenant(tenantId);
  }
  async upsert(settings: TenantSettings): Promise<void> {
    await api.settings.upsert(settings);
  }
}

export class TursoProductRepository implements IProductRepository {
  async getAll(tenantId: string): Promise<Product[]> { return api.products.getAll(tenantId); }
  async getById(id: string, tenantId: string): Promise<Product | null> { return api.products.getById(id, tenantId); }
  async getByBarcode(barcode: string, tenantId: string): Promise<Product | null> { return api.products.getByBarcode(barcode, tenantId); }
  async getByCategory(category: string, tenantId: string): Promise<Product[]> { return api.products.getByCategory(category, tenantId); }
  async getLowStock(tenantId: string, threshold: number = 5): Promise<Product[]> { return api.products.getLowStock(tenantId, threshold); }
  async create(product: Product): Promise<void> { await api.products.create(product); }
  async update(product: Product): Promise<void> { await api.products.update(product); }
  async delete(id: string, tenantId: string): Promise<void> { await api.products.remove(id, tenantId); }
  async updateStock(id: string, tenantId: string, delta: number): Promise<void> {
    const p = await this.getById(id, tenantId);
    if (p) {
      await api.products.update({ ...p, quantity: p.quantity + delta });
    }
  }
}

export class TursoInventoryMovementRepository implements IInventoryMovementRepository {
  async getByTenant(tenantId: string): Promise<InventoryMovement[]> {
    return api.reports.inventory(tenantId) as Promise<InventoryMovement[]>;
  }
  async getByProduct(productId: string, tenantId: string): Promise<InventoryMovement[]> {
    const all = await this.getByTenant(tenantId);
    return all.filter(m => m.product_id === productId);
  }
  async create(movement: InventoryMovement): Promise<void> {
    await api.reports.inventory(movement.tenant_id);
  }
}

export class TursoSalesRepository implements ISalesRepository {
  async getAll(tenantId: string): Promise<Sale[]> { return api.sales.getAll(tenantId); }
  async getById(id: string, tenantId: string): Promise<Sale | null> { return api.sales.getById(id, tenantId); }
  async getItems(saleId: string): Promise<SaleItem[]> {
    const sale = await api.sales.getById(saleId, '0');
    return sale?.items || [];
  }
  async getByDateRange(tenantId: string, from: string, to: string): Promise<Sale[]> {
    return api.sales.getByDateRange(tenantId, from, to);
  }
  async getByCustomer(customerId: string, tenantId: string): Promise<Sale[]> {
    const all = await api.sales.getAll(tenantId);
    return all.filter(s => s.customer_id === customerId);
  }
  async create(sale: Sale, items: SaleItem[]): Promise<void> {
    await api.sales.create(sale, items);
  }
  async voidSale(saleId: string, tenantId: string, _username: string): Promise<void> {
    await api.sales.remove(saleId, tenantId);
    await api.reports.audit(tenantId);
  }
}

export class TursoExchangeRateRepository implements IExchangeRateRepository {
  async getLatest(tenantId: string): Promise<ExchangeRate | null> { return api.rates.getLatest(tenantId); }
  async updateRate(tenantId: string, sarToYer: number): Promise<void> { await api.rates.update(tenantId, sarToYer); }
}

export class TursoAuditLogRepository implements IAuditLogRepository {
  async getAll(tenantId: string): Promise<AuditLog[]> { return api.reports.audit(tenantId); }
  async getByDateRange(tenantId: string, from: string, to: string): Promise<AuditLog[]> {
    const all = await api.reports.audit(tenantId);
    return all.filter(l => l.created_at >= from && l.created_at <= to);
  }
  async create(log: Omit<AuditLog, 'id' | 'created_at'>): Promise<void> {
    await api.notifications.create({ ...log, title: log.action, message: '', type: 'info', is_read: false });
  }
}

export class TursoCustomerRepository implements ICustomerRepository {
  async getAll(tenantId: string): Promise<Customer[]> { return api.customers.getAll(tenantId); }
  async getById(id: string, tenantId: string): Promise<Customer | null> { return api.customers.getById(id, tenantId); }
  async search(query: string, tenantId: string): Promise<Customer[]> { return api.customers.search(query, tenantId); }
  async create(customer: Customer): Promise<void> { await api.customers.create(customer); }
  async update(customer: Customer): Promise<void> { await api.customers.update(customer); }
  async delete(id: string, tenantId: string): Promise<void> { await api.customers.remove(id, tenantId); }
  async addLoyaltyPoints(customerId: string, tenantId: string, points: number): Promise<void> {
    const c = await this.getById(customerId, tenantId);
    if (c) await this.update({ ...c, loyalty_points: c.loyalty_points + points });
  }
}

export class TursoNotificationRepository implements INotificationRepository {
  async getAll(tenantId: string): Promise<Notification[]> { return api.notifications.getAll(tenantId); }
  async getUnread(tenantId: string): Promise<Notification[]> {
    const all = await api.notifications.getAll(tenantId);
    return all.filter(n => !n.is_read);
  }
  async create(notification: Omit<Notification, 'id' | 'created_at'>): Promise<void> {
    await api.notifications.create(notification);
  }
  async markAsRead(id: string, tenantId: string): Promise<void> {
    await api.notifications.update(id, tenantId, true);
  }
  async markAllAsRead(tenantId: string): Promise<void> {
    const all = await api.notifications.getAll(tenantId);
    for (const n of all) {
      if (!n.is_read) await api.notifications.update(n.id, tenantId, true);
    }
  }
  async delete(id: string, tenantId: string): Promise<void> {
    await api.notifications.remove(id, tenantId);
  }
}

export class TursoCouponRepository implements ICouponRepository {
  async getAll(tenantId: string): Promise<Coupon[]> { return api.coupons.getAll(tenantId); }
  async getByCode(code: string, tenantId: string): Promise<Coupon | null> { return api.coupons.getByCode(code, tenantId); }
  async create(coupon: Coupon): Promise<void> { await api.coupons.create(coupon); }
  async update(coupon: Coupon): Promise<void> { await api.coupons.update(coupon); }
  async delete(id: string, tenantId: string): Promise<void> { await api.coupons.remove(id, tenantId); }
  async incrementUsage(id: string, tenantId: string): Promise<void> {
    const all = await api.coupons.getAll(tenantId);
    const c = all.find(x => x.id === id);
    if (c) await api.coupons.update({ ...c, used_count: c.used_count + 1 });
  }
}

export class TursoProductReturnRepository implements IProductReturnRepository {
  async getAll(tenantId: string): Promise<ProductReturn[]> { return api.returns.getAll(tenantId); }
  async getById(id: string, tenantId: string): Promise<ProductReturn | null> {
    const all = await api.returns.getAll(tenantId);
    return all.find(r => r.id === id) || null;
  }
  async getItems(_returnId: string): Promise<ReturnItem[]> { return []; }
  async create(returnData: ProductReturn, items: ReturnItem[]): Promise<void> {
    await api.returns.create(returnData, items);
  }
}

export class TursoFinancialCostRepository implements IFinancialCostRepository {
  async getAll(tenantId: string): Promise<FinancialCost[]> { return api.costs.getAll(tenantId); }
  async getByDateRange(tenantId: string, from: string, to: string): Promise<FinancialCost[]> {
    const all = await api.costs.getAll(tenantId);
    return all.filter(c => c.cost_date >= from && c.cost_date <= to);
  }
  async create(cost: FinancialCost): Promise<void> { await api.costs.create(cost); }
  async update(cost: FinancialCost): Promise<void> { await api.costs.update(cost); }
  async delete(id: string, tenantId: string): Promise<void> { await api.costs.remove(id, tenantId); }
  async getTotal(tenantId: string, category?: string): Promise<number> {
    const all = await api.costs.getAll(tenantId);
    const filtered = category ? all.filter(c => c.category === category) : all;
    return filtered.reduce((sum, c) => sum + c.amount, 0);
  }
}

export const tenantRepo = new TursoTenantRepository();
export const userRepo = new TursoUserRepository();
export const settingsRepo = new TursoTenantSettingsRepository();
export const productRepo = new TursoProductRepository();
export const movementRepo = new TursoInventoryMovementRepository();
export const salesRepo = new TursoSalesRepository();
export const rateRepo = new TursoExchangeRateRepository();
export const auditRepo = new TursoAuditLogRepository();
export const customerRepo = new TursoCustomerRepository();
export const notificationRepo = new TursoNotificationRepository();
export const couponRepo = new TursoCouponRepository();
export const returnRepo = new TursoProductReturnRepository();
export const costRepo = new TursoFinancialCostRepository();
