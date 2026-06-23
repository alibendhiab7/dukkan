// src/core/repositories/interfaces.ts

// --- Data Models ---

export interface Tenant {
  id: string;
  client_code: string;
  store_name: string;
  status: 'active' | 'suspended';
  subscription_expires_at: string;
  license_plan: string;
}

export interface User {
  id: string;
  tenant_id: string;
  username: string;
  password_hash: string;
  role: 'sysadmin' | 'admin' | 'employee';
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
}

export interface InventoryMovement {
  id: string;
  tenant_id: string;
  product_id: string;
  type: 'in' | 'out'; // 'in' for adding stock, 'out' for sales/adjustments
  quantity: number;
  created_at: string;
  product_name?: string; // joined for display
}

export interface Sale {
  id: string;
  tenant_id: string;
  total: number;
  created_by: string; // username
  created_at: string;
  items?: SaleItem[]; // embedded for details
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  qty: number;
  price: number;
  product_name?: string; // joined for display
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
  performed_by: string; // username/system
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
  getByUsername(tenantId: string, username: string): Promise<User | null>;
  getByUsernameGlobal(username: string): Promise<User | null>; // For SysAdmins
  getByTenant(tenantId: string): Promise<User[]>;
  create(user: User): Promise<void>;
  update(user: User): Promise<void>;
  delete(id: string, tenantId: string): Promise<void>;
}

export interface ITenantSettingsRepository {
  getByTenantId(tenantId: string): Promise<TenantSettings | null>;
  upsert(settings: TenantSettings): Promise<void>;
}

export interface IProductRepository {
  getAll(tenantId: string): Promise<Product[]>;
  getById(id: string, tenantId: string): Promise<Product | null>;
  getByBarcode(barcode: string, tenantId: string): Promise<Product | null>;
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
  create(sale: Sale, items: SaleItem[]): Promise<void>;
}

export interface IExchangeRateRepository {
  getLatest(tenantId: string): Promise<ExchangeRate | null>;
  updateRate(tenantId: string, sarToYer: number): Promise<void>;
}

export interface IAuditLogRepository {
  getAll(tenantId: string): Promise<AuditLog[]>;
  create(log: Omit<AuditLog, 'id' | 'created_at'>): Promise<void>;
}
