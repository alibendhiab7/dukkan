// src/store/authStore.ts
import { create } from 'zustand';
import type { User, Tenant, TenantSettings } from '../core/repositories/interfaces';
import { tenantRepo, userRepo, settingsRepo, auditRepo } from '../core/repositories/sqlite';
import { comparePassword } from '../core/utils/hash';

interface AuthState {
  user: User | null;
  tenant: Tenant | null;
  settings: TenantSettings | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  login: (clientCode: string, username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
  clearError: () => void;
  hasPermission: (requiredRole: 'sysadmin' | 'admin' | 'employee') => boolean;
  isModuleEnabled: (module: 'inventory' | 'sales' | 'reports' | 'employees') => boolean;
  reloadSettings: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  tenant: null,
  settings: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  clearError: () => set({ error: null }),

  login: async (clientCode: string, username: string, password: string): Promise<boolean> => {
    set({ isLoading: true, error: null });
    try {
      // 1. SysAdmin Bypass Check (clientCode = 'SYS' or empty for global logins)
      const isSysAdminAttempt = clientCode.toUpperCase() === 'SYS' && username === 'sysadmin';
      
      let targetTenant: Tenant | null = null;
      let targetUser: User | null = null;

      if (isSysAdminAttempt) {
        // SysAdmin tenant is '0'
        targetTenant = await tenantRepo.getById('0');
        targetUser = await userRepo.getByUsernameGlobal(username);
      } else {
        // Normal store user
        let cleanCode = clientCode.toLowerCase().trim();
        // Handle common transliteration variations for Hadramaut / Hadhramaut
        if (cleanCode === 'hadhramout' || cleanCode === 'hadramaut' || cleanCode === 'hadramout') {
          cleanCode = 'hadhramaut';
        }
        targetTenant = await tenantRepo.getByClientCode(cleanCode);
        if (!targetTenant) {
          set({ error: 'رمز العميل (المتجر) غير صحيح', isLoading: false });
          return false;
        }

        if (targetTenant.status === 'suspended') {
          set({ error: 'حساب هذا المتجر موقوف حالياً', isLoading: false });
          return false;
        }

        // Check if subscription has expired
        const expiryDate = new Date(targetTenant.subscription_expires_at);
        const currentDate = new Date();
        if (currentDate > expiryDate) {
          set({ 
            error: 'عذراً، لقد انتهت فترة اشتراك هذا المتجر. يرجى التواصل مع إدارة النظام لتجديد الترخيص.', 
            isLoading: false 
          });
          return false;
        }

        targetUser = await userRepo.getByUsername(targetTenant.id, username.toLowerCase().trim());
      }

      if (!targetUser) {
        set({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة', isLoading: false });
        return false;
      }

      // 2. Validate Password Hash
      const passwordMatch = await comparePassword(password, targetUser.password_hash);
      if (!passwordMatch) {
        // Audit failed login
        if (targetTenant) {
          await auditRepo.create({
            tenant_id: targetTenant.id,
            action: `محاولة تسجيل دخول فاشلة للمستخدم: ${username}`,
            performed_by: username
          });
        }
        set({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة', isLoading: false });
        return false;
      }

      // 3. Load Tenant settings (if not SysAdmin)
      let targetSettings: TenantSettings | null = null;
      if (targetUser.role !== 'sysadmin') {
        targetSettings = await settingsRepo.getByTenantId(targetTenant!.id);
        if (!targetSettings) {
          // default enable all if setting row is missing
          targetSettings = {
            tenant_id: targetTenant!.id,
            enable_inventory: true,
            enable_sales: true,
            enable_reports: true,
            enable_employees: true
          };
          await settingsRepo.upsert(targetSettings);
        }
      }

      // 4. Save Session state
      const sessionData = {
        user: targetUser,
        tenant: targetTenant,
        settings: targetSettings,
        isAuthenticated: true,
        isLoading: false
      };

      localStorage.setItem('grocery_saas_session', JSON.stringify({
        userId: targetUser.id,
        tenantId: targetTenant!.id
      }));

      // Log audit
      await auditRepo.create({
        tenant_id: targetTenant!.id,
        action: `تم تسجيل الدخول بنجاح لدور: ${targetUser.role === 'sysadmin' ? 'مدير النظام' : targetUser.role === 'admin' ? 'مدير المتجر' : 'موظف'}`,
        performed_by: targetUser.username
      });

      set(sessionData);
      return true;
    } catch (err: any) {
      console.error(err);
      set({ error: 'حدث خطأ في النظام أثناء تسجيل الدخول', isLoading: false });
      return false;
    }
  },

  logout: async () => {
    const { user, tenant } = get();
    if (user && tenant) {
      await auditRepo.create({
        tenant_id: tenant.id,
        action: 'تسجيل خروج من النظام',
        performed_by: user.username
      });
    }
    localStorage.removeItem('grocery_saas_session');
    set({
      user: null,
      tenant: null,
      settings: null,
      isAuthenticated: false,
      error: null
    });
  },

  checkSession: async () => {
    set({ isLoading: true });
    try {
      const sessionStr = localStorage.getItem('grocery_saas_session');
      if (!sessionStr) {
        set({ isAuthenticated: false, isLoading: false });
        return;
      }

      const { userId, tenantId } = JSON.parse(sessionStr);
      const tenant = await tenantRepo.getById(tenantId);
      
      let user: User | null = null;
      if (tenantId === '0') {
        user = await userRepo.getByUsernameGlobal('sysadmin');
      } else {
        const users = await userRepo.getByTenant(tenantId);
        user = users.find(u => u.id === userId) || null;
      }

      if (!tenant || !user) {
        localStorage.removeItem('grocery_saas_session');
        set({ isAuthenticated: false, isLoading: false });
        return;
      }

      let settings: TenantSettings | null = null;
      if (user.role !== 'sysadmin') {
        settings = await settingsRepo.getByTenantId(tenantId);
      }

      set({
        user,
        tenant,
        settings,
        isAuthenticated: true,
        isLoading: false
      });
    } catch (err) {
      console.error('Session restoration failed', err);
      localStorage.removeItem('grocery_saas_session');
      set({ isAuthenticated: false, isLoading: false });
    }
  },

  hasPermission: (requiredRole: 'sysadmin' | 'admin' | 'employee'): boolean => {
    const { user } = get();
    if (!user) return false;
    
    const roleHierarchy = {
      sysadmin: 3,
      admin: 2,
      employee: 1
    };

    return roleHierarchy[user.role] >= roleHierarchy[requiredRole];
  },

  isModuleEnabled: (module: 'inventory' | 'sales' | 'reports' | 'employees'): boolean => {
    const { user, tenant, settings } = get();
    if (!user) return false;
    if (user.role === 'sysadmin') return true; // SysAdmin sees everything
    if (!tenant) return false;

    const plan = tenant.license_plan || '6_gold';

    // Enforce Plan Presets
    if (plan === '1_inventory') {
      return module === 'inventory';
    }
    if (plan === '2_sales') {
      return module === 'sales';
    }
    if (plan === '3_standard') {
      return module === 'inventory' || module === 'sales';
    }
    if (plan === '4_business') {
      return module === 'inventory' || module === 'sales' || module === 'employees';
    }
    if (plan === '5_pro') {
      return module === 'inventory' || module === 'sales' || module === 'reports';
    }
    if (plan === '6_gold') {
      return true; // Gold Plan has all modules
    }

    // Custom Plan Toggles
    if (!settings) return false;
    switch (module) {
      case 'inventory': return settings.enable_inventory;
      case 'sales': return settings.enable_sales;
      case 'reports': return settings.enable_reports;
      case 'employees': return settings.enable_employees;
      default: return false;
    }
  },

  reloadSettings: async () => {
    const { tenant, user } = get();
    if (tenant && user && user.role !== 'sysadmin') {
      const settings = await settingsRepo.getByTenantId(tenant.id);
      set({ settings });
    }
  }
}));
