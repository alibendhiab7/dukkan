// src/store/salesStore.ts
import { create } from 'zustand';
import type { Sale, ExchangeRate, AuditLog, User, Product } from '../core/repositories/interfaces';
import { db } from '../core/database/db';
import { salesRepo, rateRepo, auditRepo, userRepo } from '../core/repositories/turso';
import { hashPassword } from '../core/utils/hash';

interface SalesState {
  sales: Sale[];
  exchangeRate: ExchangeRate | null;
  auditLogs: AuditLog[];
  employees: User[];
  isLoading: boolean;
  error: string | null;

  loadSales: (tenantId: string) => Promise<void>;
  loadExchangeRate: (tenantId: string) => Promise<void>;
  updateExchangeRate: (tenantId: string, rate: number, username: string) => Promise<boolean>;
  loadAuditLogs: (tenantId: string) => Promise<void>;
  loadEmployees: (tenantId: string) => Promise<void>;
  addEmployee: (tenantId: string, empUsername: string, passwordPlain: string, role: 'admin' | 'employee', username: string) => Promise<boolean>;
  deleteEmployee: (tenantId: string, empId: string, empUsername: string, username: string) => Promise<boolean>;
  getAnalytics: (tenantId: string) => Promise<{
    salesCount: number;
    totalRevenueSar: number;
    totalProfitSar: number;
    inventoryValuationSar: number;
    salesByDate: { date: string; amount: number }[];
  }>;
}

export const useSalesStore = create<SalesState>((set, get) => ({
  sales: [],
  exchangeRate: null,
  auditLogs: [],
  employees: [],
  isLoading: false,
  error: null,

  loadSales: async (tenantId: string) => {
    set({ isLoading: true });
    try {
      const sales = await salesRepo.getAll(tenantId);
      set({ sales, isLoading: false });
    } catch (err) {
      console.error(err);
      set({ error: 'فشل تحميل فواتير المبيعات', isLoading: false });
    }
  },

  loadExchangeRate: async (tenantId: string) => {
    try {
      const rate = await rateRepo.getLatest(tenantId);
      set({ exchangeRate: rate });
    } catch (err) {
      console.error(err);
    }
  },

  updateExchangeRate: async (tenantId: string, rate: number, username: string): Promise<boolean> => {
    set({ isLoading: true, error: null });
    try {
      if (rate <= 0) {
        set({ error: 'الرجاء إدخال سعر صرف صحيح أكبر من الصفر', isLoading: false });
        return false;
      }

      const oldRate = get().exchangeRate?.sar_to_yer || 395;
      await rateRepo.updateRate(tenantId, rate);
      
      // Audit log
      await auditRepo.create({
        tenant_id: tenantId,
        action: `تحديث سعر صرف الريال السعودي (السعر السابق: ${oldRate}، السعر الجديد: ${rate} YER)`,
        performed_by: username
      });

      await get().loadExchangeRate(tenantId);
      set({ isLoading: false });
      return true;
    } catch (err) {
      console.error(err);
      set({ error: 'فشل تحديث سعر الصرف', isLoading: false });
      return false;
    }
  },

  loadAuditLogs: async (tenantId: string) => {
    set({ isLoading: true });
    try {
      const auditLogs = await auditRepo.getAll(tenantId);
      set({ auditLogs, isLoading: false });
    } catch (err) {
      console.error(err);
      set({ error: 'فشل تحميل سجل التدقيق', isLoading: false });
    }
  },

  loadEmployees: async (tenantId: string) => {
    set({ isLoading: true });
    try {
      const allUsers = await userRepo.getByTenant(tenantId);
      // Filter out sysadmins (just in case)
      const employees = allUsers.filter(u => u.role !== 'sysadmin');
      set({ employees, isLoading: false });
    } catch (err) {
      console.error(err);
      set({ error: 'فشل تحميل قائمة الموظفين', isLoading: false });
    }
  },

  addEmployee: async (tenantId: string, empUsername: string, passwordPlain: string, role: 'admin' | 'employee', username: string): Promise<boolean> => {
    set({ isLoading: true, error: null });
    try {
      // Validate unique username
      const existing = await userRepo.getByUsername(tenantId, empUsername.toLowerCase().trim());
      if (existing) {
        set({ error: 'اسم المستخدم مسجل مسبقاً في هذا المتجر', isLoading: false });
        return false;
      }

      const id = 'user_' + crypto.randomUUID().replace(/-/g, '').slice(0, 12);
      const passwordHash = await hashPassword(passwordPlain);
      const newUser: User = {
        id,
        tenant_id: tenantId,
        username: empUsername.toLowerCase().trim(),
        password_hash: passwordHash,
        role
      };

      await userRepo.create(newUser);

      // Audit log
      await auditRepo.create({
        tenant_id: tenantId,
        action: `إضافة مستخدم جديد للنظام باسم: ${empUsername} وبصلاحية: ${role === 'admin' ? 'مدير متجر' : 'موظف مبيعات'}`,
        performed_by: username
      });

      await get().loadEmployees(tenantId);
      return true;
    } catch (err) {
      console.error(err);
      set({ error: 'فشل إضافة الموظف الجديد', isLoading: false });
      return false;
    }
  },

  deleteEmployee: async (tenantId: string, empId: string, empUsername: string, username: string): Promise<boolean> => {
    set({ isLoading: true, error: null });
    try {
      if (empUsername === username) {
        set({ error: 'لا يمكنك حذف حسابك الحالي الذي تستخدمه', isLoading: false });
        return false;
      }

      await userRepo.delete(empId, tenantId);

      // Audit log
      await auditRepo.create({
        tenant_id: tenantId,
        action: `تم حذف حساب المستخدم: ${empUsername}`,
        performed_by: username
      });

      await get().loadEmployees(tenantId);
      return true;
    } catch (err) {
      console.error(err);
      set({ error: 'فشل حذف الموظف', isLoading: false });
      return false;
    }
  },

  getAnalytics: async (tenantId: string) => {
    // 1. Fetch Sales and calculate total revenue
    const sales = await salesRepo.getAll(tenantId);
    
    // 2. Fetch products to get cost of items sold, inventory valuation
    const products = await db.query<Product>('SELECT * FROM products WHERE tenant_id = ?', [tenantId]);
    const prodMap = new Map<string, Product>(products.map((p: Product) => [p.id, p]));

    let totalRevenueSar = 0;
    let totalCostOfSalesSar = 0;
    
    // Process all sales to compute profit
    for (const s of sales) {
      totalRevenueSar += s.total;
      const items = await salesRepo.getItems(s.id);
      for (const item of items) {
        const prod = prodMap.get(item.product_id);
        const cost = prod ? prod.purchase_price : (item.price * 0.8); // fallback to 80% if deleted
        totalCostOfSalesSar += (cost * item.qty);
      }
    }

    const totalProfitSar = totalRevenueSar - totalCostOfSalesSar;

    // 3. Inventory valuation
    const inventoryValuationSar = products.reduce((sum: number, p: Product) => sum + (p.purchase_price * p.quantity), 0);

    // 4. Sales by date (last 7 days grouped)
    const salesByDateMap = new Map<string, number>();
    sales.forEach(s => {
      const dateStr = new Date(s.created_at).toLocaleDateString('ar-YE', { day: 'numeric', month: 'short' });
      salesByDateMap.set(dateStr, (salesByDateMap.get(dateStr) || 0) + s.total);
    });

    const salesByDate = Array.from(salesByDateMap.entries()).map(([date, amount]) => ({
      date,
      amount
    })).slice(0, 7).reverse();

    return {
      salesCount: sales.length,
      totalRevenueSar,
      totalProfitSar,
      inventoryValuationSar,
      salesByDate: salesByDate.length > 0 ? salesByDate : [{ date: 'اليوم', amount: 0 }]
    };
  }
}));
