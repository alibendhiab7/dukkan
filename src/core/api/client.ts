const API_BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'API request failed');
  }
  return res.json();
}

function qs(params: Record<string, string | undefined>): string {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined);
  return entries.length ? '?' + entries.map(([k, v]) => `${k}=${encodeURIComponent(v!)}`).join('&') : '';
}

export const api = {
  system: {
    init: () => request<{ status: string; tables: number }>('/system/init'),
  },

  tenants: {
    getAll: () => request<any[]>('/tenants'),
    getById: (id: string) => request<any>(`/tenants${qs({ id })}`),
    getByCode: (code: string) => request<any>(`/tenants${qs({ client_code: code })}`),
    create: (t: any) => request('/tenants', { method: 'POST', body: JSON.stringify(t) }),
    update: (t: any) => request('/tenants', { method: 'PUT', body: JSON.stringify(t) }),
    remove: (id: string) => request(`/tenants${qs({ id })}`, { method: 'DELETE' }),
  },

  users: {
    getByTenant: (tenantId: string) => request<any[]>(`/users${qs({ tenant_id: tenantId })}`),
    getByUsername: (tenantId: string, username: string) => request<any | null>(`/users${qs({ tenant_id: tenantId, username })}`),
    getGlobalByUsername: (username: string) => request<any | null>(`/users${qs({ username })}`),
    create: (u: any) => request('/users', { method: 'POST', body: JSON.stringify(u) }),
    update: (u: any) => request('/users', { method: 'PUT', body: JSON.stringify(u) }),
    remove: (id: string, tenantId: string) => request(`/users${qs({ id, tenant_id: tenantId })}`, { method: 'DELETE' }),
  },

  products: {
    getAll: (tenantId: string) => request<any[]>(`/products${qs({ tenant_id: tenantId })}`),
    getById: (id: string, tenantId: string) => request<any | null>(`/products${qs({ id, tenant_id: tenantId })}`),
    getByBarcode: (barcode: string, tenantId: string) => request<any | null>(`/products${qs({ barcode, tenant_id: tenantId })}`),
    getByCategory: (category: string, tenantId: string) => request<any[]>(`/products${qs({ category, tenant_id: tenantId })}`),
    getLowStock: (tenantId: string, threshold: number = 5) => request<any[]>(`/products${qs({ tenant_id: tenantId, low_stock: '1', threshold: String(threshold) })}`),
    create: (p: any) => request('/products', { method: 'POST', body: JSON.stringify(p) }),
    update: (p: any) => request('/products', { method: 'PUT', body: JSON.stringify(p) }),
    remove: (id: string, tenantId: string) => request(`/products${qs({ id, tenant_id: tenantId })}`, { method: 'DELETE' }),
  },

  sales: {
    getAll: (tenantId: string) => request<any[]>(`/sales${qs({ tenant_id: tenantId })}`),
    getById: (id: string, tenantId: string) => request<any | null>(`/sales${qs({ id, tenant_id: tenantId })}`),
    getByDateRange: (tenantId: string, from: string, to: string) => request<any[]>(`/sales${qs({ tenant_id: tenantId, from, to })}`),
    create: (sale: any, items: any[]) => request('/sales', { method: 'POST', body: JSON.stringify({ sale, items }) }),
    remove: (id: string, tenantId: string) => request(`/sales${qs({ id, tenant_id: tenantId })}`, { method: 'DELETE' }),
  },

  customers: {
    getAll: (tenantId: string) => request<any[]>(`/customers${qs({ tenant_id: tenantId })}`),
    getById: (id: string, tenantId: string) => request<any | null>(`/customers${qs({ id, tenant_id: tenantId })}`),
    search: (query: string, tenantId: string) => request<any[]>(`/customers${qs({ tenant_id: tenantId, search: query })}`),
    create: (c: any) => request('/customers', { method: 'POST', body: JSON.stringify(c) }),
    update: (c: any) => request('/customers', { method: 'PUT', body: JSON.stringify(c) }),
    remove: (id: string, tenantId: string) => request(`/customers${qs({ id, tenant_id: tenantId })}`, { method: 'DELETE' }),
  },

  notifications: {
    getAll: (tenantId: string) => request<any[]>(`/notifications${qs({ tenant_id: tenantId })}`),
    create: (n: any) => request('/notifications', { method: 'POST', body: JSON.stringify(n) }),
    update: (id: string, _tenantId: string, isRead: boolean) => request('/notifications', { method: 'PUT', body: JSON.stringify({ id, is_read: isRead }) }),
    remove: (id: string, tenantId: string) => request(`/notifications${qs({ id, tenant_id: tenantId })}`, { method: 'DELETE' }),
  },

  coupons: {
    getAll: (tenantId: string) => request<any[]>(`/coupons${qs({ tenant_id: tenantId })}`),
    getByCode: (code: string, tenantId: string) => request<any | null>(`/coupons${qs({ code, tenant_id: tenantId })}`),
    create: (c: any) => request('/coupons', { method: 'POST', body: JSON.stringify(c) }),
    update: (c: any) => request('/coupons', { method: 'PUT', body: JSON.stringify(c) }),
    remove: (id: string, tenantId: string) => request(`/coupons${qs({ id, tenant_id: tenantId })}`, { method: 'DELETE' }),
  },

  costs: {
    getAll: (tenantId: string) => request<any[]>(`/costs${qs({ tenant_id: tenantId })}`),
    create: (c: any) => request('/costs', { method: 'POST', body: JSON.stringify(c) }),
    update: (c: any) => request('/costs', { method: 'PUT', body: JSON.stringify(c) }),
    remove: (id: string, tenantId: string) => request(`/costs${qs({ id, tenant_id: tenantId })}`, { method: 'DELETE' }),
  },

  debts: {
    getAll: (tenantId: string) => request<any[]>(`/debts${qs({ tenant_id: tenantId })}`),
    create: (d: any) => request('/debts', { method: 'POST', body: JSON.stringify(d) }),
    update: (d: any) => request('/debts', { method: 'PUT', body: JSON.stringify(d) }),
    remove: (id: string, tenantId: string) => request(`/debts${qs({ id, tenant_id: tenantId })}`, { method: 'DELETE' }),
  },

  promotions: {
    getAll: (tenantId: string) => request<any[]>(`/promotions${qs({ tenant_id: tenantId })}`),
    create: (p: any) => request('/promotions', { method: 'POST', body: JSON.stringify(p) }),
    update: (p: any) => request('/promotions', { method: 'PUT', body: JSON.stringify(p) }),
    remove: (id: string, tenantId: string) => request(`/promotions${qs({ id, tenant_id: tenantId })}`, { method: 'DELETE' }),
  },

  returns: {
    getAll: (tenantId: string) => request<any[]>(`/returns${qs({ tenant_id: tenantId })}`),
    create: (ret: any, items: any[]) => request('/returns', { method: 'POST', body: JSON.stringify({ ret, items }) }),
  },

  rates: {
    getLatest: (tenantId: string) => request<any | null>(`/rates${qs({ tenant_id: tenantId })}`),
    update: (_tenantId: string, sarToYer: number) => request('/rates', { method: 'PUT', body: JSON.stringify({ sar_to_yer: sarToYer }) }),
  },

  settings: {
    getByTenant: (tenantId: string) => request<any | null>(`/settings${qs({ tenant_id: tenantId })}`),
    upsert: (s: any) => request('/settings', { method: 'POST', body: JSON.stringify(s) }),
  },

  permissions: {
    get: (tenantId: string) => request<Record<string, Record<string, boolean>>>(`/permissions${qs({ tenant_id: tenantId })}`),
    save: (_tenantId: string, userId: string, permissions: Record<string, boolean>) => request('/permissions', { method: 'POST', body: JSON.stringify({ user_id: userId, permissions }) }),
  },

  auth: {
    login: (username: string, password: string, tenantId?: string) => request<any>('/auth/login', { method: 'POST', body: JSON.stringify({ username, password, tenant_id: tenantId }) }),
  },

  reports: {
    dashboard: (tenantId: string) => request<any>(`/reports${qs({ tenant_id: tenantId, type: 'dashboard' })}`),
    products: (tenantId: string) => request<any[]>(`/reports${qs({ tenant_id: tenantId, type: 'products' })}`),
    sales: (tenantId: string, from?: string, to?: string) => request<any[]>(`/reports${qs({ tenant_id: tenantId, type: 'sales', from, to })}`),
    costs: (tenantId: string, from?: string, to?: string) => request<any[]>(`/reports${qs({ tenant_id: tenantId, type: 'costs', from, to })}`),
    audit: (tenantId: string) => request<any[]>(`/reports${qs({ tenant_id: tenantId, type: 'audit' })}`),
    inventory: (tenantId: string) => request<any[]>(`/reports${qs({ tenant_id: tenantId, type: 'inventory' })}`),
  },
};
