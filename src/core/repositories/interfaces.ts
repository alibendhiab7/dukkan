// src/core/repositories/interfaces.ts

// --- Data Models ---

export interface Tenant {
  id: string;
  client_code: string;
  store_name: string;
  status: 'active' | 'suspended';
  subscription_expires_at: string;
  license_plan: string;
  max_users?: number;
}

export interface TenantPayment {
  id: string;
  tenant_id: string;
  amount: number;
  payment_date: string;
  payment_type: 'initial_setup' | 'renewal' | 'upgrade' | 'downgrade';
  license_plan: string;
  duration_days: number;
  max_users: number;
  notes?: string;
  performed_by: string;
}

export interface User {
  id: string;
  tenant_id: string;
  username: string;
  password_hash: string;
  role: 'sysadmin' | 'admin' | 'employee';
  permissions?: Record<string, boolean>;
}

export interface TenantSettings {
  tenant_id: string;
  enable_inventory: boolean;
  enable_sales: boolean;
  enable_reports: boolean;
  enable_employees: boolean;
}

export interface Product {
  id: string;
  tenant_id: string;
  name: string;
  barcode: string;
  purchase_price: number;
  sale_price: number;
  currency: 'SAR' | 'YER';
  quantity: number;
  category?: string;
  unit_of_measure?: string;
  min_stock?: number;
  max_stock?: number;
  image_url?: string;
  expiry_date?: string;
}

export interface InventoryMovement {
  id: string;
  tenant_id: string;
  product_id: string;
  type: 'in' | 'out';
  quantity: number;
  created_at: string;
  product_name?: string;
}

export interface Sale {
  id: string;
  tenant_id: string;
  total: number;
  discount?: number;
  discount_type?: 'percentage' | 'fixed';
  final_total?: number;
  created_by: string;
  created_at: string;
  customer_id?: string;
  customer_name?: string;
  notes?: string;
  items?: SaleItem[];
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  qty: number;
  price: number;
  discount?: number;
  product_name?: string;
}

export interface ExchangeRate {
  id: string;
  tenant_id: string;
  sar_to_yer: number;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  tenant_id: string;
  action: string;
  performed_by: string;
  created_at: string;
}

export interface Customer {
  id: string;
  tenant_id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  loyalty_points: number;
  created_at: string;
}

export interface Notification {
  id: string;
  tenant_id: string;
  title: string;
  message: string;
  type: 'success' | 'warning' | 'info' | 'danger';
  is_read: boolean;
  created_at: string;
}

export interface Coupon {
  id: string;
  tenant_id: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  max_uses: number;
  used_count: number;
  min_cart_total: number;
  expires_at: string;
  is_active: boolean;
  created_at: string;
}

export interface ProductReturn {
  id: string;
  tenant_id: string;
  sale_id: string;
  total_refund: number;
  reason: string;
  created_by: string;
  created_at: string;
  items?: ReturnItem[];
}

export interface ReturnItem {
  id: string;
  return_id: string;
  product_id: string;
  qty: number;
  price: number;
  product_name?: string;
}

export interface FinancialCost {
  id: string;
  tenant_id: string;
  category: string;
  description: string;
  amount: number;
  currency: string;
  cost_date: string;
  created_by: string;
  created_at: string;
}

// --- Repository Interfaces ---

export interface ITenantRepository {
  getAll(): Promise<Tenant[]>;
  getById(id: string): Promise<Tenant | null>;
  getByClientCode(code: string): Promise<Tenant | null>;
  create(tenant: Tenant): Promise<void>;
  update(tenant: Tenant): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface IUserRepository {
  getAll(): Promise<User[]>;
  getByUsername(tenantId: string, username: string): Promise<User | null>;
  getByUsernameGlobal(username: string): Promise<User | null>;
  getByTenant(tenantId: string): Promise<User[]>;
  create(user: User): Promise<void>;
  update(user: User): Promise<void>;
  delete(id: string, tenantId: string): Promise<void>;
  getPermissions(userId: string): Promise<Record<string, boolean>>;
  savePermissions(userId: string, tenantId: string, permissions: Record<string, boolean>): Promise<void>;
}

export interface ITenantSettingsRepository {
  getByTenantId(tenantId: string): Promise<TenantSettings | null>;
  upsert(settings: TenantSettings): Promise<void>;
}

export interface IProductRepository {
  getAll(tenantId: string): Promise<Product[]>;
  getById(id: string, tenantId: string): Promise<Product | null>;
  getByBarcode(barcode: string, tenantId: string): Promise<Product | null>;
  getByCategory(category: string, tenantId: string): Promise<Product[]>;
  getLowStock(tenantId: string, threshold: number): Promise<Product[]>;
  create(product: Product): Promise<void>;
  update(product: Product): Promise<void>;
  delete(id: string, tenantId: string): Promise<void>;
  updateStock(id: string, tenantId: string, delta: number): Promise<void>;
}

export interface IInventoryMovementRepository {
  getByTenant(tenantId: string): Promise<InventoryMovement[]>;
  getByProduct(productId: string, tenantId: string): Promise<InventoryMovement[]>;
  create(movement: InventoryMovement): Promise<void>;
}

export interface ISalesRepository {
  getAll(tenantId: string): Promise<Sale[]>;
  getById(id: string, tenantId: string): Promise<Sale | null>;
  getItems(saleId: string): Promise<SaleItem[]>;
  getByDateRange(tenantId: string, from: string, to: string): Promise<Sale[]>;
  getByCustomer(customerId: string, tenantId: string): Promise<Sale[]>;
  create(sale: Sale, items: SaleItem[]): Promise<void>;
  voidSale(saleId: string, tenantId: string, username: string): Promise<void>;
}

export interface IExchangeRateRepository {
  getLatest(tenantId: string): Promise<ExchangeRate | null>;
  updateRate(tenantId: string, sarToYer: number): Promise<void>;
}

export interface IAuditLogRepository {
  getAll(tenantId: string): Promise<AuditLog[]>;
  getByDateRange(tenantId: string, from: string, to: string): Promise<AuditLog[]>;
  create(log: Omit<AuditLog, 'id' | 'created_at'>): Promise<void>;
}

export interface ICustomerRepository {
  getAll(tenantId: string): Promise<Customer[]>;
  getById(id: string, tenantId: string): Promise<Customer | null>;
  search(query: string, tenantId: string): Promise<Customer[]>;
  create(customer: Customer): Promise<void>;
  update(customer: Customer): Promise<void>;
  delete(id: string, tenantId: string): Promise<void>;
  addLoyaltyPoints(customerId: string, tenantId: string, points: number): Promise<void>;
}

export interface INotificationRepository {
  getAll(tenantId: string): Promise<Notification[]>;
  getUnread(tenantId: string): Promise<Notification[]>;
  create(notification: Omit<Notification, 'id' | 'created_at'>): Promise<void>;
  markAsRead(id: string, tenantId: string): Promise<void>;
  markAllAsRead(tenantId: string): Promise<void>;
  delete(id: string, tenantId: string): Promise<void>;
}

export interface ICouponRepository {
  getAll(tenantId: string): Promise<Coupon[]>;
  getByCode(code: string, tenantId: string): Promise<Coupon | null>;
  create(coupon: Coupon): Promise<void>;
  update(coupon: Coupon): Promise<void>;
  delete(id: string, tenantId: string): Promise<void>;
  incrementUsage(id: string, tenantId: string): Promise<void>;
}

export interface IProductReturnRepository {
  getAll(tenantId: string): Promise<ProductReturn[]>;
  getById(id: string, tenantId: string): Promise<ProductReturn | null>;
  getItems(returnId: string): Promise<ReturnItem[]>;
  create(returnData: ProductReturn, items: ReturnItem[]): Promise<void>;
}

export interface IFinancialCostRepository {
  getAll(tenantId: string): Promise<FinancialCost[]>;
  getByDateRange(tenantId: string, from: string, to: string): Promise<FinancialCost[]>;
  create(cost: FinancialCost): Promise<void>;
  update(cost: FinancialCost): Promise<void>;
  delete(id: string, tenantId: string): Promise<void>;
  getTotal(tenantId: string, category?: string): Promise<number>;
}

export interface ITenantPaymentRepository {
  getAll(): Promise<TenantPayment[]>;
  getByTenant(tenantId: string): Promise<TenantPayment[]>;
  create(payment: TenantPayment): Promise<void>;
}

