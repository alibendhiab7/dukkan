// src/ui/layouts/SysAdminLayout.tsx
import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useSalesStore } from '../../store/salesStore';
import { tenantRepo, settingsRepo, auditRepo, userRepo } from '../../core/repositories/turso';
import { db } from '../../core/database/db';
import type { Tenant, TenantSettings } from '../../core/repositories/interfaces';
import { hashPassword } from '../../core/utils/hash';
import { strings } from '../../i18n';
import { 
  ShieldAlert, 
  Shield,
  Store, 
  Plus, 
  FileText, 
  LogOut, 
  Check, 
  X, 
  Users, 
  UserPlus, 
  Clock,
  Menu,
  Database,
  Server
} from 'lucide-react';

const SysAdminLayout: React.FC = () => {
  const { logout, user: sysUser } = useAuthStore();
  const { auditLogs, loadAuditLogs } = useSalesStore();

  const [activeTab, setActiveTab] = useState<'tenants' | 'users' | 'audit'>('tenants');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [tenantSettingsMap, setTenantSettingsMap] = useState<{ [id: string]: TenantSettings }>({});
  
  // Global Users State
  const [globalUsers, setGlobalUsers] = useState<any[]>([]);

  // New Store Form Fields
  const [newStoreName, setNewStoreName] = useState('');
  const [newClientCode, setNewClientCode] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('123456');
  const [subscriptionTerm, setSubscriptionTerm] = useState<'30' | '365'>('365');
  const [newStorePlan, setNewStorePlan] = useState<string>('6_gold');
  
  // New User Form Fields
  const [newUsername, setNewUsername] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<'admin' | 'employee'>('employee');
  const [newUserTenantId, setNewUserTenantId] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Permissions management state
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [permTargetUser, setPermTargetUser] = useState<any | null>(null);
  const [permissionsState, setPermissionsState] = useState<Record<string, boolean>>({});

  const handleOpenPermissions = async (user: any) => {
    setError(null);
    setSuccess(null);
    try {
      const perms = await userRepo.getPermissions(user.id);
      
      const defaults: Record<string, boolean> = {
        'dashboard.read': true,
        'sales.read': true,
        'sales.create': true,
        'sales.delete': false,
        'inventory.read': true,
        'inventory.add': false,
        'inventory.edit': false,
        'inventory.delete': false,
        'customers.read': true,
        'customers.add': true,
        'customers.edit': false,
        'customers.delete': false,
        'debts.read': true,
        'debts.add': true,
        'debts.edit': false,
        'debts.delete': false,
        'returns.read': true,
        'returns.add': true,
        'costs.read': false,
        'costs.add': false,
        'costs.edit': false,
        'costs.delete': false,
        'reports.read': false,
        'rates.read': true,
        'rates.edit': false,
        'printSettings.read': false,
        'backup.read': false,
        'promotions.read': true,
        'promotions.add': false,
        'promotions.delete': false,
      };

      const merged = { ...defaults, ...perms };
      setPermissionsState(merged);
      setPermTargetUser(user);
      setShowPermissionsModal(true);
    } catch (e) {
      console.error(e);
      setError('فشل تحميل صلاحيات هذا المستخدم');
    }
  };

  const handleSavePermissions = async () => {
    if (!permTargetUser) return;
    setError(null);
    setSuccess(null);
    setIsLoading(true);
    try {
      await userRepo.savePermissions(permTargetUser.id, permTargetUser.tenant_id, permissionsState);
      
      await auditRepo.create({
        tenant_id: '0',
        action: `تعديل صلاحيات حساب الموظف: ${permTargetUser.username} بمتجر: ${permTargetUser.store_name}`,
        performed_by: 'sysadmin'
      });

      setSuccess(`تم تحديث صلاحيات الحساب "${permTargetUser.username}" بنجاح.`);
      setShowPermissionsModal(false);
      setPermTargetUser(null);
      await fetchSysAdminData();
    } catch (err) {
      console.error(err);
      setError('حدث خطأ أثناء حفظ الصلاحيات');
    } finally {
      setIsLoading(false);
    }
  };

  const permissionGroups = [
    {
      title: 'نقطة البيع والمبيعات',
      items: [
        { key: 'sales.read', label: 'رؤية تبويب المبيعات وتاريخ الفواتير' },
        { key: 'sales.create', label: 'إتمام المبيعات وطباعة الفاتورة' },
        { key: 'sales.delete', label: 'إرجاع وإلغاء الفواتير (Void)' },
      ]
    },
    {
      title: 'المخزن والمنتجات',
      items: [
        { key: 'inventory.read', label: 'استعراض المنتجات وجدول المخزن' },
        { key: 'inventory.add', label: 'إضافة منتجات جديدة للمخزن' },
        { key: 'inventory.edit', label: 'تعديل المنتجات وتسوية كمياتها' },
        { key: 'inventory.delete', label: 'حذف المنتجات من المخزن' },
      ]
    },
    {
      title: 'المديونية (الديون)',
      items: [
        { key: 'debts.read', label: 'رؤية تبويب المديونية وسجل التدقيق' },
        { key: 'debts.add', label: 'تسجيل دين جديد (لعميل جديد أو قائم)' },
        { key: 'debts.edit', label: 'تسديد دفعات ديون العملاء' },
      ]
    },
    {
      title: 'إدارة العملاء',
      items: [
        { key: 'customers.read', label: 'استعراض قائمة العملاء' },
        { key: 'customers.add', label: 'إضافة عميل جديد للنظام' },
        { key: 'customers.edit', label: 'تعديل وتحديث بيانات العملاء' },
        { key: 'customers.delete', label: 'حذف العملاء من النظام' },
      ]
    },
    {
      title: 'المرتجعات والتكاليف والمصاريف',
      items: [
        { key: 'returns.read', label: 'استعراض تبويب المرتجعات وسجلها' },
        { key: 'returns.add', label: 'تسجيل مرتجع سلع من الفواتير' },
        { key: 'costs.read', label: 'رؤية المصاريف والتكاليف المالية للمتجر' },
        { key: 'costs.add', label: 'إضافة مصاريف وتكاليف مالية جديدة' },
        { key: 'costs.edit', label: 'تعديل المصاريف القائمة' },
        { key: 'costs.delete', label: 'حذف المصاريف من النظام' },
      ]
    },
    {
      title: 'التقارير والإعدادات والخصومات',
      items: [
        { key: 'reports.read', label: 'استعراض التقارير الإحصائية والمالية' },
        { key: 'rates.read', label: 'رؤية أسعار الصرف للريال اليمني/السعودي' },
        { key: 'rates.edit', label: 'تعديل أسعار الصرف في المتجر' },
        { key: 'printSettings.read', label: 'إدارة إعدادات الطباعة للحراري' },
        { key: 'backup.read', label: 'النسخ الاحتياطي واستعادة البيانات' },
        { key: 'promotions.read', label: 'رؤية قائمة العروض الترويجية النشطة' },
        { key: 'promotions.add', label: 'إضافة عروض جديدة' },
        { key: 'promotions.delete', label: 'حذف وإلغاء العروض' },
      ]
    }
  ];

  const fetchSysAdminData = async () => {
    try {
      // 1. Fetch Tenants
      const allTenants = await tenantRepo.getAll();
      const activeStores = allTenants.filter(t => t.id !== '0');
      
      // 2. Fetch Settings per Store
      const settingsMap: { [id: string]: TenantSettings } = {};
      for (const store of activeStores) {
        const settings = await settingsRepo.getByTenantId(store.id);
        if (settings) {
          settingsMap[store.id] = settings;
        }
      }

      setTenants(activeStores);
      setTenantSettingsMap(settingsMap);

      // 3. Fetch Global Users (join with tenant store names)
      const usersRaw = await db.query('SELECT * FROM users');
      const storeMap = new Map(allTenants.map(t => [t.id, t.store_name]));
      
      const enrichedUsers = usersRaw.map((u: any) => ({
        ...u,
        store_name: storeMap.get(u.tenant_id) || 'مدير النظام العام'
      }));

      setGlobalUsers(enrichedUsers);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchSysAdminData();
    loadAuditLogs('0'); // Load SysAdmin logs
  }, [loadAuditLogs]);

  // Extend Subscription Dates
  const handleExtendSubscription = async (store: Tenant, days: number) => {
    setError(null);
    setSuccess(null);
    try {
      const currentExpiry = new Date(store.subscription_expires_at);
      const baseDate = currentExpiry > new Date() ? currentExpiry : new Date(); // extend from current expiry or today
      
      const newExpiry = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000);
      const updatedTenant: Tenant = {
        ...store,
        subscription_expires_at: newExpiry.toISOString()
      };

      await tenantRepo.update(updatedTenant);
      
      await auditRepo.create({
        tenant_id: '0',
        action: `تجديد ترخيص متجر: ${store.store_name} لمدة ${days} يوم إضافية. تاريخ الانتهاء الجديد: ${newExpiry.toLocaleDateString('ar-YE')}`,
        performed_by: 'sysadmin'
      });

      setSuccess(`تم تجديد الاشتراك لمتجر "${store.store_name}" بنجاح.`);
      await fetchSysAdminData();
    } catch (e) {
      console.error(e);
      setError('فشل تمديد الترخيص');
    }
  };

  const handleAddStore = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const cleanCode = newClientCode.toLowerCase().trim();
    if (!newStoreName || !cleanCode || !newAdminPassword) {
      setError('الرجاء تعبئة كافة الحقول المطلوبة');
      return;
    }

    setIsLoading(true);
    try {
      const existing = await tenantRepo.getByClientCode(cleanCode);
      if (existing) {
        setError('رمز العميل (Client Code) مسجل مسبقاً في النظام لمحل آخر');
        setIsLoading(false);
        return;
      }

      const tenantId = 'store_' + Math.floor(Math.random() * 1000000);
      
      // Calculate Expiry Date
      const days = subscriptionTerm === '30' ? 30 : 365;
      const expiry = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

      // Create Tenant
      await tenantRepo.create({
        id: tenantId,
        client_code: cleanCode,
        store_name: newStoreName,
        status: 'active',
        subscription_expires_at: expiry.toISOString(),
        license_plan: newStorePlan
      });

      // Create Settings
      await settingsRepo.upsert({
        tenant_id: tenantId,
        enable_inventory: true,
        enable_sales: true,
        enable_reports: true,
        enable_employees: true
      });

      // Create Admin
      const passHash = await hashPassword(newAdminPassword);
      await userRepo.create({
        id: 'user_' + Math.floor(Math.random() * 1000000),
        tenant_id: tenantId,
        username: 'admin',
        password_hash: passHash,
        role: 'admin'
      });

      await auditRepo.create({
        tenant_id: '0',
        action: `إنشاء متجر جديد: ${newStoreName} (رمز: ${cleanCode}) بصلاحية اشتراك ${days} يوم وباقة: ${newStorePlan}`,
        performed_by: 'sysadmin'
      });

      setSuccess(`تم بنجاح تأسيس المتجر "${newStoreName}" ورخصته صالحة لغاية: ${expiry.toLocaleDateString('ar-YE')}`);
      setNewStoreName('');
      setNewClientCode('');
      setNewAdminPassword('123456');
      setNewStorePlan('6_gold');
      
      await fetchSysAdminData();
      await loadAuditLogs('0');
    } catch (err) {
      console.error(err);
      setError('حدث خطأ في النظام أثناء إنشاء المتجر');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const cleanUsername = newUsername.toLowerCase().trim();
    if (!cleanUsername || !newUserPassword || !newUserTenantId) {
      setError('الرجاء تعبئة كافة الحقول المطلوبة للمستخدم');
      return;
    }

    setIsLoading(true);
    try {
      // Check username unique in this store
      const existing = await userRepo.getByUsername(newUserTenantId, cleanUsername);
      if (existing) {
        setError('اسم المستخدم هذا مسجل بالفعل في المتجر المحدد');
        setIsLoading(false);
        return;
      }

      const passHash = await hashPassword(newUserPassword);
      const userId = 'user_' + Math.floor(Math.random() * 1000000);
      
      await userRepo.create({
        id: userId,
        tenant_id: newUserTenantId,
        username: cleanUsername,
        password_hash: passHash,
        role: newUserRole
      });

      const storeObj = tenants.find(t => t.id === newUserTenantId);
      await auditRepo.create({
        tenant_id: '0',
        action: `إنشاء حساب مستخدم جديد: ${cleanUsername} في متجر: ${storeObj?.store_name} بصلاحية: ${newUserRole}`,
        performed_by: 'sysadmin'
      });

      setSuccess(`تم تسجيل المستخدم "${cleanUsername}" بنجاح.`);
      setNewUsername('');
      setNewUserPassword('');
      setNewUserRole('employee');
      
      await fetchSysAdminData();
      await loadAuditLogs('0');
    } catch (err) {
      console.error(err);
      setError('فشل إنشاء حساب المستخدم');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteUserGlobal = async (u: any) => {
    if (u.tenant_id === '0') {
      alert('لا يمكن حذف حساب مدير النظام الرئيسي!');
      return;
    }
    
    if (window.confirm(`هل أنت متأكد من حذف الحساب "${u.username}" المتبع لمتجر "${u.store_name}"؟`)) {
      setError(null);
      setSuccess(null);
      try {
        await userRepo.delete(u.id, u.tenant_id);
        
        await auditRepo.create({
          tenant_id: '0',
          action: `حذف حساب المستخدم: ${u.username} من متجر: ${u.store_name}`,
          performed_by: 'sysadmin'
        });

        setSuccess(`تم حذف حساب المستخدم بنجاح.`);
        await fetchSysAdminData();
        await loadAuditLogs('0');
      } catch (e) {
        console.error(e);
        setError('فشل حذف حساب المستخدم');
      }
    }
  };

  const handleToggleModule = async (storeId: string, module: keyof Omit<TenantSettings, 'tenant_id'>) => {
    const currentSettings = tenantSettingsMap[storeId];
    if (!currentSettings) return;

    const newSettings = {
      ...currentSettings,
      [module]: !currentSettings[module]
    };

    try {
      await settingsRepo.upsert(newSettings);
      setTenantSettingsMap({
        ...tenantSettingsMap,
        [storeId]: newSettings
      });

      await auditRepo.create({
        tenant_id: '0',
        action: `تعديل صلاحية موديول (${module}) للمتجر ذو المعرف ${storeId} إلى ${newSettings[module]}`,
        performed_by: 'sysadmin'
      });
    } catch (e) {
      console.error(e);
      alert('فشل حفظ إعدادات الموديول');
    }
  };

  const handleToggleStoreStatus = async (store: Tenant) => {
    const newStatus = store.status === 'active' ? 'suspended' : 'active';
    try {
      await tenantRepo.update({
        ...store,
        status: newStatus
      });

      await auditRepo.create({
        tenant_id: '0',
        action: `تعديل حالة المتجر (${store.store_name}) إلى ${newStatus}`,
        performed_by: 'sysadmin'
      });

      await fetchSysAdminData();
    } catch (e) {
      console.error(e);
    }
  };

  const getPlanNameAr = (plan: string) => {
    switch (plan) {
      case '1_inventory': return 'باقة المخزون';
      case '2_sales': return 'باقة المبيعات';
      case '3_standard': return 'الباقة القياسية';
      case '4_business': return 'باقة الأعمال';
      case '5_pro': return 'الباقة الاحترافية';
      case '6_gold': return 'الباقة الذهبية';
      default: return 'باقة مخصصة';
    }
  };

  const isExpiringSoon = (expiryStr: string) => {
    const expiry = new Date(expiryStr).getTime();
    const now = new Date().getTime();
    const diff = expiry - now;
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days <= 7 && days >= 0;
  };

  return (
    <div className="app-container" style={{ minHeight: '100vh', background: 'var(--background)' }}>
      {/* Header */}
      <header className="app-header">
        <div className="logo-container">
          <button className="hamburger-btn" style={{ marginLeft: '0.75rem' }} onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
            <Menu size={20} />
          </button>
          <ShieldAlert size={22} style={{ color: 'var(--secondary)' }} />
          <span className="store-title">{strings.sysadmin.title}</span>
          <span className="badge badge-danger" style={{ marginRight: '0.5rem', fontSize: '0.7rem' }}>دكّان — مشرف النظام</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '0.85rem' }} className="hide-on-mobile">{sysUser?.username}</span>
          <button
            onClick={() => window.confirm('هل تريد تسجيل الخروج؟') && logout()}
            style={{
              background: 'none', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center'
            }}
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>

      {/* Backdrop for mobile */}
      {isSidebarOpen && <div className="sidebar-backdrop" onClick={() => setIsSidebarOpen(false)} />}

      {/* Main Grid */}
      <div className="admin-layout-container">
        {/* Sidebar Nav */}
        <aside className={`sidebar-admin ${isSidebarOpen ? 'open' : ''}`}>
          <button
            onClick={() => {
              setActiveTab('tenants');
              setIsSidebarOpen(false);
            }}
            className="btn"
            style={{
              justifyContent: 'flex-start',
              backgroundColor: activeTab === 'tenants' ? 'var(--primary-lighter)' : 'transparent',
              color: activeTab === 'tenants' ? 'var(--primary)' : 'var(--text)',
              border: 'none',
              padding: '0.75rem 1rem'
            }}
          >
            <Store size={18} />
            <span>{strings.sysadmin.tenantsManagement}</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('users');
              setIsSidebarOpen(false);
            }}
            className="btn"
            style={{
              justifyContent: 'flex-start',
              backgroundColor: activeTab === 'users' ? 'var(--primary-lighter)' : 'transparent',
              color: activeTab === 'users' ? 'var(--primary)' : 'var(--text)',
              border: 'none',
              padding: '0.75rem 1rem'
            }}
          >
            <Users size={18} />
            <span>إدارة المستخدمين</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('audit');
              setIsSidebarOpen(false);
            }}
            className="btn"
            style={{
              justifyContent: 'flex-start',
              backgroundColor: activeTab === 'audit' ? 'var(--primary-lighter)' : 'transparent',
              color: activeTab === 'audit' ? 'var(--primary)' : 'var(--text)',
              border: 'none',
              padding: '0.75rem 1rem'
            }}
          >
            <FileText size={18} />
            <span>{strings.sysadmin.auditLogs}</span>
          </button>

          {/* Profile Card Footer */}
          <div className="sidebar-profile">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
              <span style={{ fontWeight: '800', color: 'var(--text-dark)' }}>مدير النظام العام</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{sysUser?.username}</span>
            </div>
            <button
              onClick={() => window.confirm('هل تريد تسجيل الخروج؟') && logout()}
              style={{
                background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', display: 'flex', padding: 0
              }}
              title="تسجيل الخروج"
            >
              <LogOut size={16} />
            </button>
          </div>
        </aside>

        {/* Content Area */}
        <main style={{ padding: '2rem', overflowY: 'auto', width: '100%', maxWidth: '100%' }}>
          
          {error && (
            <div className="card" style={{
              backgroundColor: 'hsl(0, 80%, 95%)', color: 'var(--danger)', borderRight: '4px solid var(--danger)', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1.5rem', fontWeight: '600'
            }}>{error}</div>
          )}
          {success && (
            <div className="card" style={{
              backgroundColor: 'hsl(142, 65%, 95%)', color: 'var(--success)', borderRight: '4px solid var(--success)', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1.5rem', fontWeight: '600'
            }}>{success}</div>
          )}

          {/* TAB 1: STORES */}
          {activeTab === 'tenants' && (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              {/* Form - Add Store */}
              <div className="card">
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
                  <Plus size={20} />
                  <span>{strings.sysadmin.addTenant}</span>
                </h3>

                <form onSubmit={handleAddStore} className="admin-form-grid">
                  <div className="input-group" style={{ marginBottom: 0 }}>
                    <label className="input-label">{strings.sysadmin.storeName}</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="سوبرماركت الرشيد..."
                      value={newStoreName}
                      onChange={(e) => setNewStoreName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="input-group" style={{ marginBottom: 0 }}>
                    <label className="input-label">{strings.sysadmin.clientCode} (إنجليزي)</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="alrasheed"
                      value={newClientCode}
                      onChange={(e) => setNewClientCode(e.target.value)}
                      required
                    />
                  </div>

                  <div className="input-group" style={{ marginBottom: 0 }}>
                    <label className="input-label">كلمة مرور المدير الافتراضي</label>
                    <input
                      type="password"
                      className="input-field"
                      value={newAdminPassword}
                      onChange={(e) => setNewAdminPassword(e.target.value)}
                      required
                    />
                  </div>

                  <div className="input-group" style={{ marginBottom: 0 }}>
                    <label className="input-label">الباقة والترخيص</label>
                    <select
                      className="input-field"
                      value={newStorePlan}
                      onChange={(e) => setNewStorePlan(e.target.value)}
                    >
                      <option value="1_inventory">باقة المخزون الأساسية</option>
                      <option value="2_sales">باقة المبيعات البسيطة</option>
                      <option value="3_standard">الباقة القياسية</option>
                      <option value="4_business">باقة الأعمال</option>
                      <option value="5_pro">الباقة الاحترافية</option>
                      <option value="6_gold">الباقة الذهبية الكاملة</option>
                      <option value="7_custom">الباقة المخصصة (تعديل فردي)</option>
                    </select>
                  </div>

                  <div className="input-group" style={{ marginBottom: 0 }}>
                    <label className="input-label">مدة الترخيص المبدئية</label>
                    <select
                      className="input-field"
                      value={subscriptionTerm}
                      onChange={(e) => setSubscriptionTerm(e.target.value as any)}
                    >
                      <option value="30">30 يوم (تجريبي)</option>
                      <option value="365">365 يوم (سنة كاملة)</option>
                    </select>
                  </div>

                  <button type="submit" className="btn btn-primary" style={{ height: '48px', border: 'none' }} disabled={isLoading}>
                    <span>إنشاء متجر</span>
                  </button>
                </form>
              </div>

              {/* Tenants Grid list */}
              <div>
                <h3 style={{ marginBottom: '1.25rem' }}>البقالات والمتاجر الحالية ({tenants.length})</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {tenants.map(store => {
                    const settings = tenantSettingsMap[store.id];
                    const isExpired = new Date() > new Date(store.subscription_expires_at);
                    
                    return (
                      <div key={store.id} className="store-card animate-fade-in" style={{
                        borderRight: isExpired ? '5px solid var(--danger)' : store.status === 'suspended' ? '5px solid var(--warning)' : '5px solid var(--success)'
                      }}>
                        {/* Tenant Title & Subscription Details */}
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.45rem', flexWrap: 'wrap' }}>
                            <h4 style={{ color: 'var(--primary)' }}>{store.store_name}</h4>
                            <span className="badge badge-info" style={{ fontSize: '0.65rem' }}>
                              {getPlanNameAr(store.license_plan)}
                            </span>
                            {isExpiringSoon(store.subscription_expires_at) && !isExpired && (
                              <span className="badge badge-warning" style={{ fontSize: '0.65rem', animation: 'pulseSoft 2s infinite' }}>
                                ينتهي قريباً
                              </span>
                            )}
                            {isExpired && (
                              <span className="badge badge-danger" style={{ fontSize: '0.65rem' }}>
                                منتهي الترخيص
                              </span>
                            )}
                          </div>
                          
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                            <code>رمز المتجر: {store.client_code}</code>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: isExpired ? 'var(--danger)' : 'inherit', fontWeight: isExpired ? 'bold' : 'normal' }}>
                              <Clock size={12} />
                              ترخيص لغاية: {new Date(store.subscription_expires_at).toLocaleDateString('ar-YE')}
                            </span>
                          </div>
                        </div>

                        {/* Modules settings toggles */}
                        {settings ? (
                          <div>
                            <p style={{ fontSize: '0.8rem', fontWeight: '700', marginBottom: '0.5rem', color: 'var(--text)' }}>تفعيل الموديولات للمتجر:</p>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
                              {(['enable_inventory', 'enable_sales', 'enable_reports', 'enable_employees'] as const).map(mod => {
                                const active = settings[mod];
                                const label = mod === 'enable_inventory' ? 'المخزن' : mod === 'enable_sales' ? 'المبيعات' : mod === 'enable_reports' ? 'التقارير' : 'الموظفين';
                                return (
                                  <button
                                    key={mod}
                                    onClick={() => handleToggleModule(store.id, mod)}
                                    className="btn"
                                    style={{
                                      padding: '0.25rem 0.6rem',
                                      fontSize: '0.75rem',
                                      borderRadius: '6px',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '0.2rem',
                                      backgroundColor: active ? 'var(--primary-lighter)' : 'var(--surface)',
                                      color: active ? 'var(--primary)' : 'var(--text-muted)',
                                      borderColor: active ? 'var(--primary-light)' : 'var(--border)'
                                    }}
                                  >
                                    {active ? <Check size={12} /> : <X size={12} />}
                                    <span>{label}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ) : (
                          <div style={{ fontSize: '0.8rem', color: 'var(--danger)' }}>فشل تحميل إعدادات الميزات</div>
                        )}

                        {/* Subscription actions & status */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'stretch' }}>
                          <div style={{ display: 'flex', gap: '0.35rem' }}>
                            <button
                              onClick={() => handleExtendSubscription(store, 30)}
                              className="btn btn-secondary"
                              style={{ padding: '0.35rem', fontSize: '0.75rem', flex: 1, borderRadius: '6px' }}
                              title="تمديد 30 يوم"
                            >
                              +30 يوم
                            </button>
                            <button
                              onClick={() => handleExtendSubscription(store, 365)}
                              className="btn btn-secondary"
                              style={{ padding: '0.35rem', fontSize: '0.75rem', flex: 1, borderRadius: '6px' }}
                              title="تمديد سنة"
                            >
                              +سنة
                            </button>
                          </div>
                          
                          <button
                            onClick={() => handleToggleStoreStatus(store)}
                            className={`btn ${store.status === 'active' ? 'btn-danger' : 'btn-primary'}`}
                            style={{ padding: '0.45rem', fontSize: '0.8rem', border: 'none', borderRadius: '6px' }}
                          >
                            {store.status === 'active' ? 'تجميد المتجر' : 'تفعيل العمل'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: GLOBAL USER MANAGER */}
          {activeTab === 'users' && (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              {/* Form - Create User */}
              <div className="card">
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
                  <UserPlus size={20} />
                  <span>إضافة مستخدم جديد وتعيينه لبقالة</span>
                </h3>

                <form onSubmit={handleCreateUser} className="admin-form-grid">
                  <div className="input-group" style={{ marginBottom: 0 }}>
                    <label className="input-label">المتجر / البقالة المستهدفة</label>
                    <select
                      className="input-field"
                      value={newUserTenantId}
                      onChange={(e) => setNewUserTenantId(e.target.value)}
                      required
                    >
                      <option value="">اختر بقالة...</option>
                      {tenants.map(t => (
                        <option key={t.id} value={t.id}>{t.store_name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="input-group" style={{ marginBottom: 0 }}>
                    <label className="input-label">اسم مستخدم الحساب</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="مثال: ahmad_cashier"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      required
                    />
                  </div>

                  <div className="input-group" style={{ marginBottom: 0 }}>
                    <label className="input-label">كلمة مرور الحساب</label>
                    <input
                      type="password"
                      className="input-field"
                      placeholder="اكتب كلمة مرور"
                      value={newUserPassword}
                      onChange={(e) => setNewUserPassword(e.target.value)}
                      required
                    />
                  </div>

                  <div className="input-group" style={{ marginBottom: 0 }}>
                    <label className="input-label">صلاحية المستخدم</label>
                    <select
                      className="input-field"
                      value={newUserRole}
                      onChange={(e) => setNewUserRole(e.target.value as any)}
                    >
                      <option value="employee">موظف مبيعات (POS)</option>
                      <option value="admin">مدير متجر (كامل الصلاحيات)</option>
                    </select>
                  </div>

                  <button type="submit" className="btn btn-primary" style={{ height: '48px', border: 'none' }} disabled={isLoading}>
                    <span>إضافة مستخدم</span>
                  </button>
                </form>
              </div>

              {/* Users List Table */}
              <div>
                <h3 style={{ marginBottom: '1.25rem' }}>جدول الحسابات المسجلة بالنظام السحابي ({globalUsers.length})</h3>
                <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                    <thead>
                      <tr style={{ backgroundColor: 'var(--surface-hover)', borderBottom: '2px solid var(--border)' }}>
                        <th style={{ padding: '1rem' }}>اسم المستخدم</th>
                        <th style={{ padding: '1rem' }}>البقالة / المتجر التابع له</th>
                        <th style={{ padding: '1rem' }}>الصلاحية</th>
                        <th style={{ padding: '1rem', textAlign: 'left' }}>الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {globalUsers.map(u => (
                        <tr key={u.id} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '1rem', fontWeight: 'bold' }}>{u.username}</td>
                          <td style={{ padding: '1rem' }}>{u.store_name}</td>
                          <td style={{ padding: '1rem' }}>
                            <span className={`badge ${u.role === 'sysadmin' ? 'badge-danger' : u.role === 'admin' ? 'badge-warning' : 'badge-success'}`}>
                              {u.role === 'sysadmin' ? 'مدير عام النظام' : u.role === 'admin' ? 'مدير المتجر' : 'موظف مبيعات'}
                            </span>
                          </td>
                          <td style={{ padding: '1rem', textAlign: 'left' }}>
                            {u.role !== 'sysadmin' && (
                              <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                                <button
                                  onClick={() => handleOpenPermissions(u)}
                                  className="btn btn-secondary"
                                  style={{ padding: '0.35rem 0.5rem', fontSize: '0.75rem', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}
                                  title="تخصيص الصلاحيات التفصيلية"
                                >
                                  <Shield size={12} />
                                  <span>الصلاحيات</span>
                                </button>
                                <button
                                  onClick={() => handleDeleteUserGlobal(u)}
                                  className="btn btn-danger"
                                  style={{ padding: '0.35rem 0.5rem', fontSize: '0.75rem', border: 'none', borderRadius: '6px' }}
                                >
                                  حذف
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SYSTEM AUDIT LOGS */}
          {activeTab === 'audit' && (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Stats Grid */}
              <div className="grid-3">
                <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderRight: '4px solid var(--secondary)' }}>
                  <div style={{ padding: '0.65rem', backgroundColor: 'var(--secondary-light)', color: 'var(--secondary-dark)', borderRadius: '8px', display: 'flex' }}>
                    <Database size={20} />
                  </div>
                  <div>
                    <h5 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>حجم قاعدة البيانات</h5>
                    <h4 style={{ fontSize: '1.2rem', color: 'var(--text-dark)', fontWeight: 'bold' }}>
                      {((localStorage.getItem('grocery_saas_db_tenants')?.length || 1024) / 1024 + 1.25).toFixed(2)} KB
                    </h4>
                  </div>
                </div>

                <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderRight: '4px solid var(--success)' }}>
                  <div style={{ padding: '0.65rem', backgroundColor: 'hsl(142, 65%, 95%)', color: 'var(--success)', borderRadius: '8px', display: 'flex' }}>
                    <Server size={20} />
                  </div>
                  <div>
                    <h5 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>حالة الاتصال والخدمة</h5>
                    <h4 style={{ fontSize: '1.1rem', color: 'var(--success)', fontWeight: 'bold' }}>متصل ومستقر (Online)</h4>
                  </div>
                </div>

                <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderRight: '4px solid var(--primary)' }}>
                  <div style={{ padding: '0.65rem', backgroundColor: 'var(--primary-lighter)', color: 'var(--primary)', borderRadius: '8px', display: 'flex' }}>
                    <Clock size={20} />
                  </div>
                  <div>
                    <h5 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>توقيت خادم النظام</h5>
                    <h4 style={{ fontSize: '1.1rem', color: 'var(--text-dark)', fontWeight: 'bold' }}>
                      {new Date().toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' })}
                    </h4>
                  </div>
                </div>
              </div>

              {/* Logs Card */}
              <div className="card">
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                  <FileText size={20} />
                  <span>سجلات النظام العامة والتدقيق السحابي</span>
                </h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '420px', overflowY: 'auto' }}>
                  {auditLogs.map((log) => (
                    <div key={log.id} style={{
                      padding: '0.85rem 1.25rem',
                      backgroundColor: 'var(--background)',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      fontSize: '0.85rem'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', fontWeight: '600' }}>
                        <span style={{ color: 'var(--primary)' }}>{log.action}</span>
                        <span style={{ color: 'var(--text-muted)' }}>
                          {new Date(log.created_at).toLocaleString('ar-YE')}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        المنفذ: {log.performed_by}
                      </div>
                    </div>
                  ))}

                  {auditLogs.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                      لا توجد سجلات بالنظام السحابي حالياً.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

        </main>
      </div>

      {showPermissionsModal && permTargetUser && (
        <div className="modal-backdrop" onClick={() => { setShowPermissionsModal(false); setPermTargetUser(null); }} style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backdropFilter: 'blur(4px)'
        }}>
          <div className="card animate-scale-up" onClick={(e) => e.stopPropagation()} style={{
            width: '95%',
            maxWidth: '850px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            padding: '1.75rem',
            gap: '1.25rem',
            overflow: 'hidden',
            borderRadius: '16px',
            boxShadow: 'var(--shadow-lg)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Shield size={22} style={{ color: 'var(--primary)' }} />
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 'bold' }}>تخصيص صلاحيات المستخدم: <span style={{ color: 'var(--primary)' }}>{permTargetUser.username}</span></h3>
              </div>
              <span className="badge badge-info" style={{ fontSize: '0.8rem' }}>{permTargetUser.store_name}</span>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', paddingLeft: '0.5rem', paddingRight: '0.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.25rem' }}>
                {permissionGroups.map((group, gIdx) => (
                  <div key={gIdx} className="card" style={{ padding: '1.25rem', backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '10px' }}>
                    <h4 style={{ color: 'var(--primary)', marginBottom: '1rem', borderRight: '4px solid var(--primary)', paddingRight: '0.5rem', fontSize: '0.95rem', fontWeight: 'bold' }}>{group.title}</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {group.items.map(item => (
                        <label key={item.key} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', fontSize: '0.85rem', userSelect: 'none' }}>
                          <input
                            type="checkbox"
                            checked={Boolean(permissionsState[item.key])}
                            onChange={(e) => setPermissionsState({ ...permissionsState, [item.key]: e.target.checked })}
                            style={{
                              width: '18px',
                              height: '18px',
                              cursor: 'pointer',
                              accentColor: 'var(--primary)',
                              borderRadius: '4px'
                            }}
                          />
                          <span style={{ color: 'var(--text-dark)', fontWeight: '500' }}>{item.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
              <button
                type="button"
                onClick={() => { setShowPermissionsModal(false); setPermTargetUser(null); }}
                className="btn btn-secondary"
                style={{ padding: '0.6rem 1.5rem', borderRadius: '8px', fontWeight: 'bold' }}
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleSavePermissions}
                className="btn btn-primary"
                style={{ border: 'none', padding: '0.6rem 1.5rem', borderRadius: '8px', fontWeight: 'bold' }}
                disabled={isLoading}
              >
                {isLoading ? 'جاري الحفظ...' : 'حفظ التعديلات'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default SysAdminLayout;
