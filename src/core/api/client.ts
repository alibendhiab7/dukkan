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
    getById: (id: string) => request<any>(`/tenants${qs({ tenant_id: id })}`),
    getByCode: (code: string) => request<any>(`/tenants${qs({ client_code: code })}`),
    create: (t: any) => request('/tenants', { method: 'POST', body: JSON.stringify(t) }),
    update: (t: any) => request('/tenants', { method: 'PUT', body: JSON.stringify(t) }),
    remove: (id: string) => request(`/tenants${qs({ id })}`, { method: 'DELETE' }),
    getPayments: (params?: { tenant_id?: string }) => request<any[]>(`/tenants/payments${params ? qs(params) : ''}`),
    createPayment: (p: any) => request('/tenants/payments', { method: 'POST', body: JSON.stringify(p) }),
  },

  users: {
    getAll: () => request<any[]>('/users'),
    getByTenant: (tenantId: string) => request<any[]>(`/users${qs({ tenant_id: tenantId })}`),
    getByUsername: (tenantId: string, username: string) => request<any | null>(`/users${qs({ tenant_id: tenantId, username })}`),
    getGlobalByUsername: (username: string) => request<any | null>(`/users${qs({ username })}`),
    create: (u: any) => request(`/users${qs({ tenant_id: u.tenant_id })}`, { method: 'POST', body: JSON.stringify(u) }),
    update: (u: any) => request(`/users${qs({ tenant_id: u.tenant_id })}`, { method: 'PUT', body: JSON.stringify(u) }),
    remove: (id: string, tenantId: string) => request(`/users${qs({ id, tenant_id: tenantId })}`, { method: 'DELETE' }),
  },

  products: {
    getAll: (tenantId: string) => request<any[]>(`/products${qs({ tenant_id: tenantId })}`),
    getById: (id: string, tenantId: string) => request<any | null>(`/products${qs({ id, tenant_id: tenantId })}`),
    getByBarcode: (barcode: string, tenantId: string) => request<any | null>(`/products${qs({ barcode, tenant_id: tenantId })}`),
    getByCategory: (category: string, tenantId: string) => request<any[]>(`/products${qs({ category, tenant_id: tenantId })}`),
    getLowStock: (tenantId: string, threshold: number = 5) => request<any[]>(`/products${qs({ tenant_id: tenantId, low_stock: '1', threshold: String(threshold) })}`),
    create: (p: any) => request(`/products${qs({ tenant_id: p.tenant_id })}`, { method: 'POST', body: JSON.stringify(p) }),
    update: (p: any) => request(`/products${qs({ tenant_id: p.tenant_id })}`, { method: 'PUT', body: JSON.stringify(p) }),
    remove: (id: string, tenantId: string) => request(`/products${qs({ id, tenant_id: tenantId })}`, { method: 'DELETE' }),
  },

  sales: {
    getAll: (tenantId: string) => request<any[]>(`/sales${qs({ tenant_id: tenantId })}`),
    getById: (id: string, tenantId: string) => request<any | null>(`/sales${qs({ id, tenant_id: tenantId })}`),
    getByDateRange: (tenantId: string, from: string, to: string) => request<any[]>(`/sales${qs({ tenant_id: tenantId, from, to })}`),
    create: (sale: any, items: any[]) => request(`/sales${qs({ tenant_id: sale.tenant_id })}`, { method: 'POST', body: JSON.stringify({ sale, items }) }),
    remove: (id: string, tenantId: string) => request(`/sales${qs({ id, tenant_id: tenantId })}`, { method: 'DELETE' }),
  },

  customers: {
    getAll: (tenantId: string) => request<any[]>(`/customers${qs({ tenant_id: tenantId })}`),
    getById: (id: string, tenantId: string) => request<any | null>(`/customers${qs({ id, tenant_id: tenantId })}`),
    search: (query: string, tenantId: string) => request<any[]>(`/customers${qs({ tenant_id: tenantId, search: query })}`),
    create: (c: any) => request(`/customers${qs({ tenant_id: c.tenant_id })}`, { method: 'POST', body: JSON.stringify(c) }),
    update: (c: any) => request(`/customers${qs({ tenant_id: c.tenant_id })}`, { method: 'PUT', body: JSON.stringify(c) }),
    remove: (id: string, tenantId: string) => request(`/customers${qs({ id, tenant_id: tenantId })}`, { method: 'DELETE' }),
  },

  notifications: {
    getAll: (tenantId: string) => request<any[]>(`/notifications${qs({ tenant_id: tenantId })}`),
    create: (n: any) => request(`/notifications${qs({ tenant_id: n.tenant_id })}`, { method: 'POST', body: JSON.stringify(n) }),
    update: (id: string, tenantId: string, isRead: boolean) => request(`/notifications${qs({ tenant_id: tenantId })}`, { method: 'PUT', body: JSON.stringify({ id, is_read: isRead }) }),
    remove: (id: string, tenantId: string) => request(`/notifications${qs({ id, tenant_id: tenantId })}`, { method: 'DELETE' }),
  },

  coupons: {
    getAll: (tenantId: string) => request<any[]>(`/coupons${qs({ tenant_id: tenantId })}`),
    getByCode: (code: string, tenantId: string) => request<any | null>(`/coupons${qs({ code, tenant_id: tenantId })}`),
    create: (c: any) => request(`/coupons${qs({ tenant_id: c.tenant_id })}`, { method: 'POST', body: JSON.stringify(c) }),
    update: (c: any) => request(`/coupons${qs({ tenant_id: c.tenant_id })}`, { method: 'PUT', body: JSON.stringify(c) }),
    remove: (id: string, tenantId: string) => request(`/coupons${qs({ id, tenant_id: tenantId })}`, { method: 'DELETE' }),
  },

  costs: {
    getAll: (tenantId: string) => request<any[]>(`/costs${qs({ tenant_id: tenantId })}`),
    create: (c: any) => request(`/costs${qs({ tenant_id: c.tenant_id })}`, { method: 'POST', body: JSON.stringify(c) }),
    update: (c: any) => request(`/costs${qs({ tenant_id: c.tenant_id })}`, { method: 'PUT', body: JSON.stringify(c) }),
    remove: (id: string, tenantId: string) => request(`/costs${qs({ id, tenant_id: tenantId })}`, { method: 'DELETE' }),
  },

  debts: {
    getAll: (tenantId: string) => request<any[]>(`/debts${qs({ tenant_id: tenantId })}`),
    create: (d: any) => request(`/debts${qs({ tenant_id: d.tenant_id })}`, { method: 'POST', body: JSON.stringify(d) }),
    update: (d: any) => request(`/debts${qs({ tenant_id: d.tenant_id })}`, { method: 'PUT', body: JSON.stringify(d) }),
    remove: (id: string, tenantId: string) => request(`/debts${qs({ id, tenant_id: tenantId })}`, { method: 'DELETE' }),
  },

  promotions: {
    getAll: (tenantId: string) => request<any[]>(`/promotions${qs({ tenant_id: tenantId })}`),
    create: (p: any) => request(`/promotions${qs({ tenant_id: p.tenant_id })}`, { method: 'POST', body: JSON.stringify(p) }),
    update: (p: any) => request(`/promotions${qs({ tenant_id: p.tenant_id })}`, { method: 'PUT', body: JSON.stringify(p) }),
    remove: (id: string, tenantId: string) => request(`/promotions${qs({ id, tenant_id: tenantId })}`, { method: 'DELETE' }),
  },

  returns: {
    getAll: (tenantId: string) => request<any[]>(`/returns${qs({ tenant_id: tenantId })}`),
    create: (ret: any, items: any[]) => request(`/returns${qs({ tenant_id: ret.tenant_id })}`, { method: 'POST', body: JSON.stringify({ ret, items }) }),
  },

  rates: {
    getLatest: (tenantId: string) => request<any | null>(`/rates${qs({ tenant_id: tenantId })}`),
    update: (tenantId: string, sarToYer: number) => request(`/rates${qs({ tenant_id: tenantId })}`, { method: 'PUT', body: JSON.stringify({ sar_to_yer: sarToYer }) }),
  },

  settings: {
    getByTenant: (tenantId: string) => request<any | null>(`/settings${qs({ tenant_id: tenantId })}`),
    upsert: (s: any) => request(`/settings${qs({ tenant_id: s.tenant_id })}`, { method: 'POST', body: JSON.stringify(s) }),
  },

  permissions: {
    get: (tenantId: string) => request<Record<string, Record<string, boolean>>>(`/permissions${qs({ tenant_id: tenantId })}`),
    save: (tenantId: string, userId: string, permissions: Record<string, boolean>) => request(`/permissions${qs({ tenant_id: tenantId })}`, { method: 'POST', body: JSON.stringify({ user_id: userId, permissions }) }),
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
  
  platform: {
    paymentMethods: {
      getAll: () => request<any[]>('/platform/payment-methods'),
      create: (pm: any) => request('/platform/payment-methods', { method: 'POST', body: JSON.stringify(pm) }),
      update: (pm: any) => request('/platform/payment-methods', { method: 'PUT', body: JSON.stringify(pm) }),
      remove: (id: string) => request(`/platform/payment-methods${qs({ id })}`, { method: 'DELETE' }),
    },
    coupons: {
      getAll: () => request<any[]>('/platform/coupons'),
      getByCode: (code: string) => request<any | null>(`/platform/coupons${qs({ code })}`),
      create: (c: any) => request('/platform/coupons', { method: 'POST', body: JSON.stringify(c) }),
      update: (c: any) => request('/platform/coupons', { method: 'PUT', body: JSON.stringify(c) }),
      remove: (id: string) => request(`/platform/coupons${qs({ id })}`, { method: 'DELETE' }),
    }
  },

  support: {
    tickets: {
      getAll: (tenantId?: string) => request<any[]>(`/support/tickets${tenantId ? qs({ tenant_id: tenantId }) : ''}`),
      create: (t: any) => request('/support/tickets', { method: 'POST', body: JSON.stringify(t) }),
      update: (t: any) => request('/support/tickets', { method: 'PUT', body: JSON.stringify(t) }),
      remove: (id: string) => request(`/support/tickets${qs({ id })}`, { method: 'DELETE' }),
    }
  },

  broadcast: {
    send: (title: string, message: string, type: string) => request('/notifications/broadcast', { method: 'POST', body: JSON.stringify({ title, message, type }) }),
  },

  push: {
    subscribe: (tenantId: string, userId: string, subscription: any) => request('/notifications/subscribe', { method: 'POST', body: JSON.stringify({ tenant_id: tenantId, user_id: userId, subscription }) }),
  },

  invoices: {
    getAll: (tenantId?: string) => request<any[]>(`/invoices${tenantId ? qs({ tenant_id: tenantId }) : ''}`),
    create: (iv: any) => request('/invoices', { method: 'POST', body: JSON.stringify(iv) }),
    update: (iv: any) => request('/invoices', { method: 'PUT', body: JSON.stringify(iv) }),
    remove: (id: string) => request(`/invoices${qs({ id })}`, { method: 'DELETE' }),
  },
};
