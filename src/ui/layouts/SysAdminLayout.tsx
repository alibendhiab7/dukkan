// src/ui/layouts/SysAdminLayout.tsx
import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useSalesStore } from '../../store/salesStore';
import { tenantRepo, settingsRepo, auditRepo, userRepo, paymentRepo } from '../../core/repositories/turso';
import type { Tenant, TenantSettings, TenantPayment } from '../../core/repositories/interfaces';
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
  Server,
  DollarSign,
  Printer,
  BookOpen,
  Trash2,
  KeyRound
} from 'lucide-react';

const SysAdminLayout: React.FC = () => {
  const { logout, user: sysUser } = useAuthStore();
  const { auditLogs, loadAuditLogs } = useSalesStore();

  const [activeTab, setActiveTab] = useState<'tenants' | 'users' | 'payments' | 'audit'>('tenants');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [tenantSettingsMap, setTenantSettingsMap] = useState<{ [id: string]: TenantSettings }>({});
  
  // Global Users State
  const [globalUsers, setGlobalUsers] = useState<any[]>([]);

  // New Store Form Fields
  const [newStoreName, setNewStoreName] = useState('');
  const [newClientCode, setNewClientCode] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('123456');
  const [subscriptionTerm, setSubscriptionTerm] = useState<'30' | '90' | '180' | '365' | '730' | '1095' | '1825' | 'custom'>('365');
  const [customDaysVal, setCustomDaysVal] = useState<number>(30);
  const [newStorePlan, setNewStorePlan] = useState<string>('6_gold');
  const [maxUsersAllowed, setMaxUsersAllowed] = useState<number>(5);
  const [customPrice, setCustomPrice] = useState<string>('');

  // Renewal/Upgrade Modal states
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [targetRenewStore, setTargetRenewStore] = useState<Tenant | null>(null);
  const [renewPlan, setRenewPlan] = useState<string>('6_gold');
  const [renewTerm, setRenewTerm] = useState<'30' | '90' | '180' | '365' | '730' | '1095' | '1825' | 'custom'>('365');
  const [renewCustomDays, setRenewCustomDays] = useState<number>(30);
  const [renewMaxUsers, setRenewMaxUsers] = useState<number>(5);
  const [renewPricePaid, setRenewPricePaid] = useState<string>('');
  const [renewNotes, setRenewNotes] = useState<string>('');

  // Payments State
  const [payments, setPayments] = useState<TenantPayment[]>([]);
  const [selectedPayment, setSelectedPayment] = useState<TenantPayment | null>(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  
  // Statement State
  const [showStatementModal, setShowStatementModal] = useState(false);
  const [statementStore, setStatementStore] = useState<Tenant | null>(null);
  const [statementPayments, setStatementPayments] = useState<TenantPayment[]>([]);
  const [paymentSearchQuery, setPaymentSearchQuery] = useState('');

  // Delete Store State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [targetDeleteStore, setTargetDeleteStore] = useState<Tenant | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  // Change Admin Password Modal State
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [currentPasswordInput, setCurrentPasswordInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');

  const convertNumberToArabicWords = (num: number): string => {
    if (num === 0) return 'صفر';
    
    const ones = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة'];
    const teens = ['عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
    const tens = ['', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
    const hundreds = ['', 'مائة', 'مائتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];
    
    const processGroup = (n: number): string => {
      let parts: string[] = [];
      const h = Math.floor(n / 100);
      const remainder = n % 100;
      const t = Math.floor(remainder / 10);
      const o = remainder % 10;
      
      if (h > 0) {
        parts.push(hundreds[h]);
      }
      
      if (remainder > 0) {
        if (remainder < 10) {
          parts.push(ones[remainder]);
        } else if (remainder < 20) {
          parts.push(teens[remainder - 10]);
        } else {
          if (o > 0) {
            parts.push(ones[o]);
          }
          parts.push(tens[t]);
        }
      }
      
      return parts.join(' و');
    };
    
    let result = '';
    
    const millions = Math.floor(num / 1000000);
    const thousands = Math.floor((num % 1000000) / 1000);
    const units = num % 1000;
    
    if (millions > 0) {
      if (millions === 1) {
        result += 'مليون';
      } else if (millions === 2) {
        result += 'مليونان';
      } else if (millions >= 3 && millions <= 10) {
        result += processGroup(millions) + ' ملايين';
      } else {
        result += processGroup(millions) + ' مليون';
      }
    }
    
    if (thousands > 0) {
      if (result) result += ' و';
      if (thousands === 1) {
        result += 'ألف';
      } else if (thousands === 2) {
        result += 'ألفين';
      } else if (thousands >= 3 && thousands <= 10) {
        result += processGroup(thousands) + ' آلاف';
      } else {
        result += processGroup(thousands) + ' ألف';
      }
    }
    
    if (units > 0) {
      if (result) result += ' و';
      result += processGroup(units);
    }
    
    return result;
  };

  const exportStatementToPDF = () => {
    const element = document.getElementById('printableStatement');
    if (!element) return;

    setIsLoading(true);

    const opt = {
      margin:       10,
      filename:     `كشف_حساب_${statementStore?.store_name || 'متجر'}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    const runExport = () => {
      const html2pdf = (window as any).html2pdf;
      if (html2pdf) {
        html2pdf().set(opt).from(element).save().then(() => {
          setIsLoading(false);
        }).catch((err: any) => {
          console.error(err);
          setIsLoading(false);
          alert('فشل تصدير ملف PDF');
        });
      } else {
        setIsLoading(false);
        alert('حدث خطأ أثناء تحميل مكتبة PDF');
      }
    };

    if ((window as any).html2pdf) {
      runExport();
    } else {
      const script = document.createElement('script');
      script.src = '/html2pdf.bundle.min.js';
      script.onload = runExport;
      script.onerror = () => {
        setIsLoading(false);
        alert('فشل تحميل مكتبة PDF المحلية. يرجى التأكد من وجود الملف في مجلد public.');
      };
      document.body.appendChild(script);
    }
  };

  const calculateSuggestedPrice = (
    _plan: string,
    term: '30' | '90' | '180' | '365' | '730' | '1095' | '1825' | 'custom',
    _maxUsers: number,
    customDays?: number
  ) => {
    let days = 30;
    if (term === '30') days = 30;
    else if (term === '90') days = 90;
    else if (term === '180') days = 180;
    else if (term === '365') days = 365;
    else if (term === '730') days = 730;
    else if (term === '1095') days = 1095;
    else if (term === '1825') days = 1825;
    else if (term === 'custom') days = customDays || 30;

    let discount = 0;
    if (days >= 90 && days < 180) discount = 0.10;
    else if (days >= 180 && days < 365) discount = 0.20;
    else if (days >= 365 && days < 730) discount = 0.30;
    else if (days >= 730 && days < 1095) discount = 0.40;
    else if (days >= 1095 && days < 1825) discount = 0.50;
    else if (days >= 1825) discount = 0.60;

    const monthlyRate = 10000 * (1 - discount);
    const months = days / 30;
    return Math.round(monthlyRate * months);
  };

  const getModulesForPlan = (plan: string): Omit<TenantSettings, 'tenant_id'> => {
    switch (plan) {
      case '1_inventory':
        return { enable_inventory: true, enable_sales: false, enable_reports: false, enable_employees: false };
      case '2_sales':
        return { enable_inventory: false, enable_sales: true, enable_reports: false, enable_employees: true };
      case '3_standard':
        return { enable_inventory: true, enable_sales: true, enable_reports: false, enable_employees: true };
      case '4_business':
        return { enable_inventory: true, enable_sales: true, enable_reports: false, enable_employees: true };
      case '5_pro':
        return { enable_inventory: true, enable_sales: true, enable_reports: true, enable_employees: true };
      case '6_gold':
      case '7_custom':
      default:
        return { enable_inventory: true, enable_sales: true, enable_reports: true, enable_employees: true };
    }
  };
  
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
      const usersRaw = await userRepo.getAll();
      const storeMap = new Map(allTenants.map(t => [t.id, t.store_name]));
      
      const enrichedUsers = usersRaw.map((u: any) => ({
        ...u,
        store_name: storeMap.get(u.tenant_id) || 'مدير النظام العام'
      }));

      setGlobalUsers(enrichedUsers);

      // 4. Fetch Tenant Payments
      const pmts = await paymentRepo.getAll();
      setPayments(pmts);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchSysAdminData();
    loadAuditLogs('0'); // Load SysAdmin logs
  }, [loadAuditLogs]);

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
      let days = 30;
      if (subscriptionTerm === '30') days = 30;
      else if (subscriptionTerm === '90') days = 90;
      else if (subscriptionTerm === '180') days = 180;
      else if (subscriptionTerm === '365') days = 365;
      else if (subscriptionTerm === '730') days = 730;
      else if (subscriptionTerm === '1095') days = 1095;
      else if (subscriptionTerm === '1825') days = 1825;
      else if (subscriptionTerm === 'custom') days = customDaysVal || 30;
      const expiry = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

      // Create Tenant
      await tenantRepo.create({
        id: tenantId,
        client_code: cleanCode,
        store_name: newStoreName,
        status: 'active',
        subscription_expires_at: expiry.toISOString(),
        license_plan: newStorePlan,
        max_users: maxUsersAllowed
      });

      // Create Settings
      const planModules = getModulesForPlan(newStorePlan);
      await settingsRepo.upsert({
        tenant_id: tenantId,
        ...planModules
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

      const suggestedPrice = calculateSuggestedPrice(newStorePlan, subscriptionTerm, maxUsersAllowed, customDaysVal);
      const finalPrice = customPrice !== '' ? parseFloat(customPrice) : suggestedPrice;

      // Log Payment
      const paymentId = 'pmt_' + Math.floor(Math.random() * 1000000);
      await paymentRepo.create({
        id: paymentId,
        tenant_id: tenantId,
        amount: finalPrice,
        payment_date: new Date().toISOString(),
        payment_type: 'initial_setup',
        license_plan: newStorePlan,
        duration_days: days,
        max_users: maxUsersAllowed,
        notes: 'تأسيس المتجر المبدئي وتفعيل الترخيص',
        performed_by: 'sysadmin'
      });

      await auditRepo.create({
        tenant_id: '0',
        action: `إنشاء متجر جديد: ${newStoreName} (رمز: ${cleanCode}) بصلاحية اشتراك ${days} يوم وباقة: ${newStorePlan} بحد مستخدمين ${maxUsersAllowed} وسعر معتمد: ${finalPrice} ريال يمني`,
        performed_by: 'sysadmin'
      });

      setSuccess(`تم بنجاح تأسيس المتجر "${newStoreName}" ورخصته صالحة لغاية: ${expiry.toLocaleDateString('ar-YE')}`);
      setNewStoreName('');
      setNewClientCode('');
      setNewAdminPassword('123456');
      setNewStorePlan('6_gold');
      setSubscriptionTerm('365');
      setCustomDaysVal(30);
      setMaxUsersAllowed(5);
      setCustomPrice('');
      
      await fetchSysAdminData();
      await loadAuditLogs('0');
    } catch (err) {
      console.error(err);
      setError('حدث خطأ في النظام أثناء إنشاء المتجر');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRenewOrUpgrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetRenewStore) return;
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      let days = 30;
      if (renewTerm === '30') days = 30;
      else if (renewTerm === '90') days = 90;
      else if (renewTerm === '180') days = 180;
      else if (renewTerm === '365') days = 365;
      else if (renewTerm === '730') days = 730;
      else if (renewTerm === '1095') days = 1095;
      else if (renewTerm === '1825') days = 1825;
      else if (renewTerm === 'custom') days = renewCustomDays || 30;

      const currentExpiry = new Date(targetRenewStore.subscription_expires_at);
      const baseDate = currentExpiry > new Date() ? currentExpiry : new Date();
      const newExpiry = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000);

      // Determine payment type
      let type: 'renewal' | 'upgrade' | 'downgrade' = 'renewal';
      if (renewPlan !== targetRenewStore.license_plan) {
        if (renewPlan > targetRenewStore.license_plan) {
          type = 'upgrade';
        } else {
          type = 'downgrade';
        }
      } else if (renewMaxUsers > (targetRenewStore.max_users ?? 5)) {
        type = 'upgrade';
      } else if (renewMaxUsers < (targetRenewStore.max_users ?? 5)) {
        type = 'downgrade';
      }

      // 1. Update Tenant
      const updatedTenant: Tenant = {
        ...targetRenewStore,
        license_plan: renewPlan,
        max_users: renewMaxUsers,
        subscription_expires_at: newExpiry.toISOString()
      };
      await tenantRepo.update(updatedTenant);

      // 2. Update Settings
      const planModules = getModulesForPlan(renewPlan);
      await settingsRepo.upsert({
        tenant_id: targetRenewStore.id,
        ...planModules
      });

      // 3. Log Payment
      const suggested = calculateSuggestedPrice(renewPlan, renewTerm, renewMaxUsers, renewCustomDays);
      const paid = renewPricePaid !== '' ? parseFloat(renewPricePaid) : suggested;
      
      const paymentId = 'pmt_' + Math.floor(Math.random() * 1000000);
      await paymentRepo.create({
        id: paymentId,
        tenant_id: targetRenewStore.id,
        amount: paid,
        payment_date: new Date().toISOString(),
        payment_type: type,
        license_plan: renewPlan,
        duration_days: days,
        max_users: renewMaxUsers,
        notes: renewNotes || 'تجديد وتعديل الترخيص والحد الأقصى للمستخدمين',
        performed_by: 'sysadmin'
      });

      // 4. Audit Log
      await auditRepo.create({
        tenant_id: '0',
        action: `تحديث ترخيص متجر: ${targetRenewStore.store_name} (نوع الحركة: ${type}) لمدة ${days} يوم إضافية. باقة: ${renewPlan} بحد مستخدمين ${renewMaxUsers} ومبلغ: ${paid} ريال يمني`,
        performed_by: 'sysadmin'
      });

      setSuccess(`تم تحديث ترخيص وتجديد باقة متجر "${targetRenewStore.store_name}" بنجاح.`);
      setShowRenewModal(false);
      setTargetRenewStore(null);
      setRenewPricePaid('');
      setRenewNotes('');

      await fetchSysAdminData();
    } catch (err) {
      console.error(err);
      setError('فشل تجديد أو تعديل ترخيص المتجر');
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

  const handleDeleteStoreConfirm = async () => {
    if (!targetDeleteStore) return;
    if (deleteConfirmText !== targetDeleteStore.client_code) {
      alert('الرمز المدخل غير مطابق لرمز المتجر.');
      return;
    }

    setIsLoading(true);
    try {
      await tenantRepo.delete(targetDeleteStore.id);

      await auditRepo.create({
        tenant_id: '0',
        action: `حذف متجر بالكامل نهائياً: ${targetDeleteStore.store_name} (رمز: ${targetDeleteStore.client_code})`,
        performed_by: 'sysadmin'
      });

      setShowDeleteModal(false);
      setTargetDeleteStore(null);
      setDeleteConfirmText('');

      await fetchSysAdminData();
      alert('تم حذف المتجر وكافة البيانات المرتبطة به بنجاح.');
    } catch (e: any) {
      console.error(e);
      alert('فشل عملية الحذف: ' + e.message);
    } finally {
      setIsLoading(false);
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

  const handleChangeAdminPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!newPasswordInput || newPasswordInput.length < 6) {
      setError('كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل');
      return;
    }
    if (newPasswordInput !== confirmPasswordInput) {
      setError('كلمة المرور الجديدة وتأكيدها غير متطابقتين');
      return;
    }

    setIsLoading(true);
    try {
      if (!sysUser?.id) throw new Error('لم يتم التعرف على المستخدم');

      // Verify current password
      const { comparePassword } = await import('../../core/utils/hash');
      const adminUser = await userRepo.getByUsernameGlobal(sysUser.username);
      if (!adminUser) throw new Error('لم يتم العثور على حساب المشرف');

      const isValid = await comparePassword(currentPasswordInput, adminUser.password_hash);
      if (!isValid) {
        setError('كلمة المرور الحالية غير صحيحة');
        setIsLoading(false);
        return;
      }

      const newHash = await hashPassword(newPasswordInput);
      await userRepo.update({ ...adminUser, password_hash: newHash });

      await auditRepo.create({
        tenant_id: '0',
        action: 'تغيير كلمة مرور حساب مدير النظام العام',
        performed_by: 'sysadmin'
      });

      setSuccess('تم تغيير كلمة المرور بنجاح.');
      setShowChangePasswordModal(false);
      setCurrentPasswordInput('');
      setNewPasswordInput('');
      setConfirmPasswordInput('');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'فشل تغيير كلمة المرور');
    } finally {
      setIsLoading(false);
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
      <style>{`
        @media print {
          /* Force modal backdrop, card wrappers, and overlay elements to not clip or format printed items */
          .modal-backdrop, 
          .modal-backdrop > .card, 
          .modal-backdrop > .card > div,
          .modal-backdrop > .card > div > div {
            position: static !important;
            max-height: none !important;
            overflow: visible !important;
            height: auto !important;
            display: block !important;
            background: transparent !important;
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .modal-backdrop {
            background-color: transparent !important;
            backdrop-filter: none !important;
            -webkit-backdrop-filter: none !important;
          }
        }
      `}</style>
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
              background: 'none', border: 'none', color: 'var(--text)', cursor: 'pointer', display: 'flex', alignItems: 'center'
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
              setActiveTab('payments');
              setIsSidebarOpen(false);
            }}
            className="btn"
            style={{
              justifyContent: 'flex-start',
              backgroundColor: activeTab === 'payments' ? 'var(--primary-lighter)' : 'transparent',
              color: activeTab === 'payments' ? 'var(--primary)' : 'var(--text)',
              border: 'none',
              padding: '0.75rem 1rem'
            }}
          >
            <DollarSign size={18} />
            <span>سجل المقبوضات والاشتراكات</span>
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
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <button
                onClick={() => { setShowChangePasswordModal(true); setIsSidebarOpen(false); }}
                style={{
                  background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', padding: 0
                }}
                title="تغيير كلمة المرور"
              >
                <KeyRound size={16} />
              </button>
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
                    <label className="input-label">الحد الأقصى للمستخدمين</label>
                    <input
                      type="number"
                      className="input-field"
                      min={1}
                      max={100}
                      value={maxUsersAllowed}
                      onChange={(e) => setMaxUsersAllowed(parseInt(e.target.value) || 5)}
                      required
                    />
                  </div>

                  <div className="input-group" style={{ marginBottom: 0 }}>
                    <label className="input-label">مدة الترخيص المبدئية</label>
                    <select
                      className="input-field"
                      value={subscriptionTerm}
                      onChange={(e) => setSubscriptionTerm(e.target.value as any)}
                    >
                      <option value="30">30 يوم (شهر تجريبي)</option>
                      <option value="90">90 يوم (3 أشهر)</option>
                      <option value="180">180 يوم (6 أشهر)</option>
                      <option value="365">365 يوم (سنة كاملة)</option>
                      <option value="730">720 يوم (سنتين)</option>
                      <option value="1095">1095 يوم (3 سنوات)</option>
                      <option value="1825">1825 يوم (5 سنوات)</option>
                      <option value="custom">تخصيص مدة أخرى...</option>
                    </select>
                  </div>

                  {subscriptionTerm === 'custom' && (
                    <div className="input-group" style={{ marginBottom: 0 }}>
                      <label className="input-label">المدة المخصصة (بالأيام)</label>
                      <input
                        type="number"
                        className="input-field"
                        min={1}
                        value={customDaysVal}
                        onChange={(e) => setCustomDaysVal(parseInt(e.target.value) || 30)}
                        required
                      />
                    </div>
                  )}

                  <div className="input-group" style={{ marginBottom: 0 }}>
                    <label className="input-label">
                      مبلغ الترخيص (ر.ي)
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginRight: '0.5rem' }}>
                        (المقترح: {calculateSuggestedPrice(newStorePlan, subscriptionTerm, maxUsersAllowed, customDaysVal).toLocaleString('ar-YE')} ر.ي)
                      </span>
                    </label>
                    <input
                      type="number"
                      className="input-field"
                      placeholder="اتركه فارغاً للاعتماد التلقائي"
                      value={customPrice}
                      onChange={(e) => setCustomPrice(e.target.value)}
                    />
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
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', alignItems: 'stretch' }}>
                          <button
                            onClick={() => {
                              setTargetRenewStore(store);
                              setRenewPlan(store.license_plan);
                              setRenewMaxUsers(store.max_users ?? 5);
                              setRenewTerm('365');
                              setRenewPricePaid('');
                              setRenewNotes('');
                              setShowRenewModal(true);
                            }}
                            className="btn btn-primary"
                            style={{ padding: '0.45rem', fontSize: '0.75rem', borderRadius: '6px', border: 'none' }}
                          >
                            تجديد / ترقية الباقة
                          </button>

                          <div style={{ display: 'flex', gap: '0.35rem' }}>
                            <button
                              onClick={() => {
                                setStatementStore(store);
                                const filtered = payments.filter(p => p.tenant_id === store.id);
                                setStatementPayments(filtered);
                                setShowStatementModal(true);
                              }}
                              className="btn btn-secondary"
                              style={{ padding: '0.45rem', fontSize: '0.75rem', flex: 1, borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.2rem' }}
                            >
                              <BookOpen size={12} />
                              <span>كشف الحساب</span>
                            </button>
                            
                            <button
                              onClick={() => handleToggleStoreStatus(store)}
                              className={`btn ${store.status === 'active' ? 'btn-danger' : 'btn-primary'}`}
                              style={{ padding: '0.45rem', fontSize: '0.75rem', flex: 1, borderRadius: '6px', border: 'none' }}
                            >
                              {store.status === 'active' ? 'تجميد' : 'تفعيل'}
                            </button>
                          </div>

                          <button
                            onClick={() => {
                              setTargetDeleteStore(store);
                              setDeleteConfirmText('');
                              setShowDeleteModal(true);
                            }}
                            className="btn"
                            style={{
                              padding: '0.45rem',
                              fontSize: '0.75rem',
                              borderRadius: '6px',
                              backgroundColor: '#fef2f2',
                              color: 'var(--danger)',
                              border: '1px solid #fee2e2',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '0.2rem',
                              width: '100%',
                              cursor: 'pointer'
                            }}
                          >
                            <Trash2 size={12} />
                            <span>حذف المتجر نهائياً</span>
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

          {/* TAB: PAYMENTS & LICENSES REGISTRY */}
          {activeTab === 'payments' && (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              <div className="card">
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
                  <FileText size={20} />
                  <span>سجل المقبوضات وحركات تراخيص المتاجر</span>
                </h3>

                {/* Filter Controls */}
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="البحث باسم المتجر أو المعرف..."
                      value={paymentSearchQuery}
                      onChange={(e) => setPaymentSearchQuery(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: 'var(--surface-hover)', borderBottom: '2px solid var(--border)' }}>
                        <th style={{ padding: '0.75rem 1rem' }}>رقم المقبوض</th>
                        <th style={{ padding: '0.75rem 1rem' }}>المتجر</th>
                        <th style={{ padding: '0.75rem 1rem' }}>نوع الحركة</th>
                        <th style={{ padding: '0.75rem 1rem' }}>الباقة والترخيص</th>
                        <th style={{ padding: '0.75rem 1rem' }}>عدد المستخدمين</th>
                        <th style={{ padding: '0.75rem 1rem' }}>المدة</th>
                        <th style={{ padding: '0.75rem 1rem' }}>المبلغ المدفوع (ر.ي)</th>
                        <th style={{ padding: '0.75rem 1rem' }}>التاريخ</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments
                        .filter(p => {
                          if (!paymentSearchQuery) return true;
                          const val = paymentSearchQuery.toLowerCase();
                          const storeObj = tenants.find(t => t.id === p.tenant_id);
                          const storeName = storeObj?.store_name.toLowerCase() || '';
                          const storeCode = storeObj?.client_code.toLowerCase() || '';
                          return storeName.includes(val) || storeCode.includes(val) || p.id.toLowerCase().includes(val);
                        })
                        .map(p => {
                          const storeObj = tenants.find(t => t.id === p.tenant_id);
                          return (
                            <tr key={p.id} style={{ borderBottom: '1px solid var(--border)' }}>
                              <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace' }}>#{p.id.replace('pmt_', '')}</td>
                              <td style={{ padding: '0.75rem 1rem', fontWeight: 'bold' }}>
                                {storeObj?.store_name || 'متجر غير معروف'}
                                <br />
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>رمز: {storeObj?.client_code || '---'}</span>
                              </td>
                              <td style={{ padding: '0.75rem 1rem' }}>
                                <span className={`badge ${
                                  p.payment_type === 'initial_setup' ? 'badge-success' :
                                  p.payment_type === 'renewal' ? 'badge-info' :
                                  p.payment_type === 'upgrade' ? 'badge-warning' : 'badge-danger'
                                }`} style={{ fontSize: '0.7rem' }}>
                                  {p.payment_type === 'initial_setup' ? 'تأسيس مبدئي' :
                                   p.payment_type === 'renewal' ? 'تجديد ترخيص' :
                                   p.payment_type === 'upgrade' ? 'ترقية باقة' : 'تخفيض باقة'}
                                </span>
                              </td>
                              <td style={{ padding: '0.75rem 1rem' }}>{getPlanNameAr(p.license_plan)}</td>
                              <td style={{ padding: '0.75rem 1rem' }}>{p.max_users} مستخدم</td>
                              <td style={{ padding: '0.75rem 1rem' }}>{p.duration_days} يوم</td>
                              <td style={{ padding: '0.75rem 1rem', fontWeight: 'bold', color: 'var(--primary)' }}>
                                {p.amount.toLocaleString('ar-YE')} ر.ي
                              </td>
                              <td style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                {new Date(p.payment_date).toLocaleDateString('ar-YE')}
                                <br />
                                {new Date(p.payment_date).toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' })}
                              </td>
                              <td style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>
                                <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                                  <button
                                    onClick={() => {
                                      setSelectedPayment(p);
                                      setShowInvoiceModal(true);
                                    }}
                                    className="btn btn-secondary"
                                    style={{ padding: '0.35rem 0.5rem', fontSize: '0.7rem', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                                    title="طباعة سند قبض"
                                  >
                                    <Printer size={12} />
                                    <span>سند قبض</span>
                                  </button>
                                  <button
                                    onClick={() => {
                                      if (storeObj) {
                                        setStatementStore(storeObj);
                                        const filtered = payments.filter(pm => pm.tenant_id === storeObj.id);
                                        setStatementPayments(filtered);
                                        setShowStatementModal(true);
                                      }
                                    }}
                                    className="btn btn-secondary"
                                    style={{ padding: '0.35rem 0.5rem', fontSize: '0.7rem', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                                    title="كشف حساب المتجر"
                                  >
                                    <BookOpen size={12} />
                                    <span>كشف الحساب</span>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      {payments.length === 0 && (
                        <tr>
                          <td colSpan={9} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                            لا توجد أي مدفوعات مسجلة بالنظام السحابي بعد.
                          </td>
                        </tr>
                      )}
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

      {/* RENEW / UPGRADE LICENSE MODAL */}
      {showRenewModal && targetRenewStore && (
        <div className="modal-backdrop" onClick={() => { setShowRenewModal(false); setTargetRenewStore(null); }} style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)'
        }}>
          <div className="card animate-scale-up" onClick={(e) => e.stopPropagation()} style={{
            width: '95%', maxWidth: '550px', maxHeight: '90vh',
            display: 'flex', flexDirection: 'column', padding: '1.75rem', gap: '1.25rem',
            overflowY: 'auto', borderRadius: '16px', boxShadow: 'var(--shadow-lg)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Clock size={20} style={{ color: 'var(--primary)' }} />
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 'bold' }}>تجديد وترقية ترخيص المتجر</h3>
              </div>
              <span className="badge badge-info">{targetRenewStore.store_name}</span>
            </div>

            <form onSubmit={handleRenewOrUpgrade} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="input-group">
                <label className="input-label">باقة الترخيص الجديدة/الحالية</label>
                <select
                  className="input-field"
                  value={renewPlan}
                  onChange={(e) => setRenewPlan(e.target.value)}
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

              <div className="input-group">
                <label className="input-label">الحد الأقصى للمستخدمين</label>
                <input
                  type="number"
                  className="input-field"
                  min={1}
                  max={100}
                  value={renewMaxUsers}
                  onChange={(e) => setRenewMaxUsers(parseInt(e.target.value) || 5)}
                  required
                />
              </div>

              <div className="input-group">
                <label className="input-label">مدة التمديد / التجديد</label>
                <select
                  className="input-field"
                  value={renewTerm}
                  onChange={(e) => setRenewTerm(e.target.value as any)}
                >
                  <option value="30">30 يوم (شهر إضافي)</option>
                  <option value="90">90 يوم (3 أشهر)</option>
                  <option value="180">180 يوم (6 أشهر)</option>
                  <option value="365">365 يوم (سنة كاملة)</option>
                  <option value="730">720 يوم (سنتين)</option>
                  <option value="1095">1095 يوم (3 سنوات)</option>
                  <option value="1825">1825 يوم (5 سنوات)</option>
                  <option value="custom">تخصيص مدة أخرى...</option>
                </select>
              </div>

              {renewTerm === 'custom' && (
                <div className="input-group">
                  <label className="input-label">المدة المخصصة (بالأيام)</label>
                  <input
                    type="number"
                    className="input-field"
                    min={1}
                    value={renewCustomDays}
                    onChange={(e) => setRenewCustomDays(parseInt(e.target.value) || 30)}
                    required
                  />
                </div>
              )}

              <div className="input-group">
                <label className="input-label">
                  مبلغ التجديد المقبوض (ر.ي)
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginRight: '0.5rem' }}>
                    (المقترح: {calculateSuggestedPrice(renewPlan, renewTerm, renewMaxUsers, renewCustomDays).toLocaleString('ar-YE')} ر.ي)
                  </span>
                </label>
                <input
                  type="number"
                  className="input-field"
                  placeholder="اتركه فارغاً لاعتماد السعر التلقائي"
                  value={renewPricePaid}
                  onChange={(e) => setRenewPricePaid(e.target.value)}
                />
              </div>

              <div className="input-group">
                <label className="input-label">ملاحظات السداد والتسوية</label>
                <textarea
                  className="input-field"
                  placeholder="مثال: تم السداد نقداً عبر الحساب الكريمي..."
                  value={renewNotes}
                  onChange={(e) => setRenewNotes(e.target.value)}
                  style={{ minHeight: '60px', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => { setShowRenewModal(false); setTargetRenewStore(null); }}
                  className="btn btn-secondary"
                  style={{ padding: '0.6rem 1.5rem', borderRadius: '8px', fontWeight: 'bold' }}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ border: 'none', padding: '0.6rem 1.5rem', borderRadius: '8px', fontWeight: 'bold' }}
                  disabled={isLoading}
                >
                  {isLoading ? 'جاري التنفيذ...' : 'حفظ وتفعيل الاشتراك'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRINTABLE RECEIPT / INVOICE MODAL (SIND QABD) */}
      {showInvoiceModal && selectedPayment && (
        <div className="modal-backdrop" onClick={() => { setShowInvoiceModal(false); setSelectedPayment(null); }} style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)'
        }}>
          <div className="card animate-scale-up animate-fade-in" onClick={(e) => e.stopPropagation()} style={{
            width: '95%', maxWidth: '650px', maxHeight: '95vh',
            display: 'flex', flexDirection: 'column', padding: '0',
            overflow: 'hidden', borderRadius: '16px', boxShadow: 'var(--shadow-lg)',
            backgroundColor: '#ffffff', color: '#000000'
          }}>
            <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', backgroundColor: 'var(--surface)' }}>
              <span style={{ fontWeight: 'bold', color: 'var(--text-dark)' }}>سند قبض رسمي ومستند ترخيص</span>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => window.print()}
                  className="btn btn-primary"
                  style={{ border: 'none', padding: '0.5rem 1rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                >
                  <Printer size={16} />
                  <span>طباعة المستند</span>
                </button>
                <button
                  onClick={() => { setShowInvoiceModal(false); setSelectedPayment(null); }}
                  className="btn btn-secondary"
                  style={{ padding: '0.5rem 1rem', borderRadius: '8px' }}
                >
                  إغلاق
                </button>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '2.5rem' }}>
              <div className="report-print-container" style={{
                border: '2px solid #1a202c', borderRadius: '12px', padding: '2rem',
                backgroundColor: '#ffffff', color: '#000000', fontFamily: 'serif', direction: 'rtl',
                textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '1.5rem', boxShadow: 'none'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '3px double #1a202c', paddingBottom: '1rem' }}>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '1.8rem', color: '#1a202c', fontWeight: 'bold' }}>دكّان — DUKKAN</h2>
                    <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: '#4a5568' }}>نظام محاسبي سحابي متكامل لإدارة المحلات والمتاجر</p>
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <h3 style={{ margin: 0, fontSize: '1.5rem', color: '#2b6cb0', fontWeight: 'bold' }}>سند قبض رقم: #{selectedPayment.id.replace('pmt_', '')}</h3>
                    <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: '#4a5568' }}>التاريخ: {new Date(selectedPayment.payment_date).toLocaleDateString('ar-YE')} | {new Date(selectedPayment.payment_date).toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>

                <div style={{ textAlign: 'center', margin: '0.5rem 0' }}>
                  <span style={{ fontSize: '1.4rem', fontWeight: 'bold', borderBottom: '2px solid #1a202c', paddingBottom: '0.25rem' }}>سند قبض اشتراك ترخيص</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '1.1rem', lineHeight: '1.8' }}>
                  <div style={{ display: 'flex', borderBottom: '1px dashed #cbd5e0', paddingBottom: '0.5rem' }}>
                    <span style={{ width: '150px', fontWeight: 'bold', color: '#4a5568' }}>استلمنا من متجر:</span>
                    <span style={{ fontWeight: 'bold', color: '#000000', fontSize: '1.2rem' }}>{tenants.find(t => t.id === selectedPayment.tenant_id)?.store_name || 'متجر غير معروف'}</span>
                  </div>

                  <div style={{ display: 'flex', borderBottom: '1px dashed #cbd5e0', paddingBottom: '0.5rem' }}>
                    <span style={{ width: '150px', fontWeight: 'bold', color: '#4a5568' }}>مبلغاً وقدره:</span>
                    <span style={{ fontWeight: 'bold', color: '#2b6cb0', fontSize: '1.2rem' }}>{selectedPayment.amount.toLocaleString('ar-YE')} ر.ي</span>
                    <span style={{ marginRight: '1rem', fontStyle: 'italic', color: '#718096' }}>(فقط {convertNumberToArabicWords(selectedPayment.amount)} ريال يمني لا غير)</span>
                  </div>

                  <div style={{ display: 'flex', borderBottom: '1px dashed #cbd5e0', paddingBottom: '0.5rem' }}>
                    <span style={{ width: '150px', fontWeight: 'bold', color: '#4a5568' }}>وذلك مقابل:</span>
                    <span>
                      {selectedPayment.payment_type === 'initial_setup' ? 'رسوم التأسيس المبدئي وتفعيل الترخيص' :
                       selectedPayment.payment_type === 'renewal' ? 'رسوم تجديد الترخيص السحابي' :
                       selectedPayment.payment_type === 'upgrade' ? 'رسوم ترقية الباقة والمستخدمين' : 'رسوم تسوية وتعديل الاشتراك'}
                      {' - '}
                      <strong>{getPlanNameAr(selectedPayment.license_plan)}</strong>
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', borderBottom: '1px dashed #cbd5e0', paddingBottom: '0.5rem' }}>
                    <div style={{ display: 'flex' }}>
                      <span style={{ width: '150px', fontWeight: 'bold', color: '#4a5568' }}>المدة المرخصة:</span>
                      <span style={{ fontWeight: 'bold' }}>{selectedPayment.duration_days} يوم</span>
                    </div>
                    <div style={{ display: 'flex' }}>
                      <span style={{ width: '150px', fontWeight: 'bold', color: '#4a5568' }}>المستخدمين المتاحين:</span>
                      <span style={{ fontWeight: 'bold' }}>{selectedPayment.max_users} مستخدمين كحد أقصى</span>
                    </div>
                  </div>

                  {selectedPayment.notes && (
                    <div style={{ display: 'flex', borderBottom: '1px dashed #cbd5e0', paddingBottom: '0.5rem' }}>
                      <span style={{ width: '150px', fontWeight: 'bold', color: '#4a5568' }}>ملاحظات:</span>
                      <span style={{ color: '#4a5568' }}>{selectedPayment.notes}</span>
                    </div>
                  )}

                  <div style={{ display: 'flex' }}>
                    <span style={{ width: '150px', fontWeight: 'bold', color: '#4a5568' }}>حالة الترخيص:</span>
                    <span style={{ color: '#38a169', fontWeight: 'bold' }}>نشط ومفعل لدى إدارة النظام</span>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3rem', borderTop: '1px solid #e2e8f0', paddingTop: '1.5rem' }}>
                  <div style={{ textAlign: 'center', width: '200px' }}>
                    <p style={{ margin: 0, fontWeight: 'bold', color: '#4a5568' }}>توقيع المستلم (إدارة دكّان)</p>
                    <div style={{ height: '60px' }}></div>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: '#718096' }}>توقيع إلكتروني معتمد</p>
                  </div>
                  <div style={{ textAlign: 'center', width: '200px' }}>
                    <p style={{ margin: 0, fontWeight: 'bold', color: '#4a5568' }}>ختم الإدارة العامة</p>
                    <div style={{ height: '60px' }}></div>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: '#718096' }}>DUKKAN SSaS</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STORE ACCOUNT STATEMENT MODAL */}
      {showStatementModal && statementStore && (
        <div className="modal-backdrop" onClick={() => { setShowStatementModal(false); setStatementStore(null); }} style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)'
        }}>
          <div className="card animate-scale-up animate-fade-in" onClick={(e) => e.stopPropagation()} style={{
            width: '95%', maxWidth: '850px', maxHeight: '95vh',
            display: 'flex', flexDirection: 'column', padding: '0',
            overflow: 'hidden', borderRadius: '16px', boxShadow: 'var(--shadow-lg)',
            backgroundColor: '#ffffff', color: '#000000'
          }}>
            <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', backgroundColor: 'var(--surface)' }}>
              <span style={{ fontWeight: 'bold', color: 'var(--text-dark)' }}>كشف حساب المبيعات والاشتراكات للمتجر</span>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={exportStatementToPDF}
                  className="btn btn-primary"
                  style={{ border: 'none', padding: '0.5rem 1rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                  disabled={isLoading}
                >
                  <FileText size={16} />
                  <span>{isLoading ? 'جاري التصدير...' : 'تصدير كشف الحساب (PDF)'}</span>
                </button>
                <button
                  onClick={() => { setShowStatementModal(false); setStatementStore(null); }}
                  className="btn btn-secondary"
                  style={{ padding: '0.5rem 1rem', borderRadius: '8px' }}
                >
                  إغلاق
                </button>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '2rem', backgroundColor: '#f8fafc' }}>
              {/* Screen paper container wrapper */}
              <div style={{
                maxWidth: '790px',
                margin: '0 auto',
                backgroundColor: '#ffffff',
                borderRadius: '12px',
                border: '1px solid #cbd5e0',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)'
              }}>
                <div id="printableStatement" className="report-print-container" style={{
                  backgroundColor: '#ffffff', color: '#000000', direction: 'rtl',
                  textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '1.5rem',
                  padding: '2.5rem', position: 'relative'
                }}>
                  {/* Brand Accent Bar */}
                  <div className="no-print" style={{
                    position: 'absolute', top: 0, left: 0, right: 0, height: '6px',
                  backgroundColor: 'var(--primary)', borderTopLeftRadius: '12px', borderTopRightRadius: '12px'
                }} />

                {/* Header Section */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #e2e8f0', paddingBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{
                        width: '32px', height: '32px', borderRadius: '8px',
                        background: 'linear-gradient(135deg, #1e1b4b, #6366f1)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                      }}>
                        <Store size={16} style={{ color: '#ffffff' }} />
                      </div>
                      <h2 style={{ margin: 0, fontSize: '1.6rem', color: '#1e293b', fontWeight: '800' }}>دكّان — DUKKAN</h2>
                    </div>
                    <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '500' }}>نظام محاسبي محاسبة وترخيص وإدارة فروع المتاجر</span>
                  </div>

                  <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <span className="badge badge-info" style={{ fontSize: '0.9rem', fontWeight: 'bold', padding: '0.35rem 0.75rem', borderRadius: '6px', alignSelf: 'flex-end' }}>
                      كشف حساب مالي تفصيلي
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>التاريخ: {new Date().toLocaleDateString('ar-YE')}</span>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>التوقيت: {new Date().toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>

                {/* Client Info Grid */}
                <div style={{
                  display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: '1.25rem', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0',
                  borderRadius: '10px', padding: '1.25rem'
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600' }}>العميل / المتجر</span>
                    <span style={{ fontSize: '0.95rem', color: '#0f172a', fontWeight: '700' }}>{statementStore.store_name}</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600' }}>رمز العميل</span>
                    <span style={{ fontSize: '0.95rem', color: '#0f172a', fontWeight: '700', fontFamily: 'monospace' }}>{statementStore.client_code}</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600' }}>الباقة الحالية النشطة</span>
                    <span style={{ fontSize: '0.95rem', color: '#2b6cb0', fontWeight: '700' }}>{getPlanNameAr(statementStore.license_plan)}</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600' }}>انتهاء الترخيص</span>
                    <span style={{ fontSize: '0.95rem', color: '#ef4444', fontWeight: '700' }}>{new Date(statementStore.subscription_expires_at).toLocaleDateString('ar-YE')}</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600' }}>حالة المتجر</span>
                    <div style={{ marginTop: '0.1rem' }}>
                      <span className={`badge ${statementStore.status === 'active' ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}>
                        {statementStore.status === 'active' ? 'نشط ومفعل' : 'مجمد وموقوف'}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600' }}>الحد الأقصى للموظفين</span>
                    <span style={{ fontSize: '0.95rem', color: '#0f172a', fontWeight: '700' }}>{statementStore.max_users ?? 5} مستخدمين</span>
                  </div>
                </div>

                {/* Table Container */}
                <div>
                  <h4 style={{ color: '#1e293b', marginBottom: '0.85rem', fontWeight: '700', fontSize: '1rem', borderRight: '4px solid var(--primary)', paddingRight: '0.5rem' }}>
                    سجل العمليات والاشتراكات المقبوضة:
                  </h4>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #cbd5e1', backgroundColor: '#f1f5f9' }}>
                        <th style={{ padding: '0.75rem 1rem', color: '#334155', fontWeight: '700' }}>المستند</th>
                        <th style={{ padding: '0.75rem 1rem', color: '#334155', fontWeight: '700' }}>تاريخ الحركة</th>
                        <th style={{ padding: '0.75rem 1rem', color: '#334155', fontWeight: '700' }}>نوع العملية</th>
                        <th style={{ padding: '0.75rem 1rem', color: '#334155', fontWeight: '700' }}>الباقة الصادرة</th>
                        <th style={{ padding: '0.75rem 1rem', color: '#334155', fontWeight: '700' }}>المستخدمين</th>
                        <th style={{ padding: '0.75rem 1rem', color: '#334155', fontWeight: '700' }}>المدة (أيام)</th>
                        <th style={{ padding: '0.75rem 1rem', color: '#334155', fontWeight: '700' }}>ملاحظات الحركة</th>
                        <th style={{ padding: '0.75rem 1rem', color: '#334155', fontWeight: '700', textAlign: 'left' }}>المبلغ (ر.ي)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {statementPayments.map((p, idx) => (
                        <tr key={p.id} style={{
                          borderBottom: '1px solid #e2e8f0',
                          backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc'
                        }}>
                          <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', color: '#475569' }}>#{p.id.replace('pmt_', '')}</td>
                          <td style={{ padding: '0.75rem 1rem', color: '#475569' }}>{new Date(p.payment_date).toLocaleDateString('ar-YE')}</td>
                          <td style={{ padding: '0.75rem 1rem' }}>
                            <span className={`badge ${
                              p.payment_type === 'initial_setup' ? 'badge-success' :
                              p.payment_type === 'renewal' ? 'badge-info' :
                              p.payment_type === 'upgrade' ? 'badge-warning' : 'badge-danger'
                            }`} style={{ fontSize: '0.7rem', padding: '0.15rem 0.4rem' }}>
                              {p.payment_type === 'initial_setup' ? 'تأسيس مبدئي' :
                               p.payment_type === 'renewal' ? 'تجديد ترخيص' :
                               p.payment_type === 'upgrade' ? 'ترقية باقة' : 'تخفيض باقة'}
                            </span>
                          </td>
                          <td style={{ padding: '0.75rem 1rem', fontWeight: '500' }}>{getPlanNameAr(p.license_plan)}</td>
                          <td style={{ padding: '0.75rem 1rem', color: '#475569' }}>{p.max_users}</td>
                          <td style={{ padding: '0.75rem 1rem', color: '#475569' }}>{p.duration_days} يوم</td>
                          <td style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', color: '#64748b' }}>{p.notes}</td>
                          <td style={{ padding: '0.75rem 1rem', fontWeight: 'bold', color: 'var(--primary)', textAlign: 'left' }}>
                            {p.amount.toLocaleString('ar-YE')} ر.ي
                          </td>
                        </tr>
                      ))}
                      {statementPayments.length === 0 && (
                        <tr>
                          <td colSpan={8} style={{ textAlign: 'center', padding: '1.5rem', color: '#718096' }}>
                            لا توجد مدفوعات مسجلة لهذا المتجر.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Summary & Totals */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: '1rem', borderTop: '2px solid #cbd5e1', paddingTop: '1.25rem' }}>
                  <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.8rem', color: '#64748b' }}>
                    <div>
                      <span>عدد المعاملات المسجلة:</span>
                      <strong style={{ color: '#0f172a', marginRight: '0.25rem' }}>{statementPayments.length}</strong>
                    </div>
                  </div>

                  <div style={{
                    backgroundColor: '#ebf8ff', border: '1px solid #bee3f8',
                    borderRadius: '8px', padding: '0.75rem 1.25rem', width: '280px',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                  }}>
                    <span style={{ fontSize: '0.9rem', color: '#2b6cb0', fontWeight: '700' }}>إجمالي المدفوعات:</span>
                    <strong style={{ fontSize: '1.15rem', color: '#2b6cb0', fontWeight: '900' }}>
                      {statementPayments.reduce((acc, curr) => acc + curr.amount, 0).toLocaleString('ar-YE')} ر.ي
                    </strong>
                  </div>
                </div>

                {/* Signatures / Stamp Section */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2.5rem', borderTop: '1px solid #e2e8f0', paddingTop: '1.25rem' }}>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 'bold', color: '#475569' }}>المشرف المالي</p>
                    <div style={{ height: '50px' }}></div>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8' }}>إلكتروني معتمد</p>
                  </div>

                  <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{
                      border: '2px solid #cbd5e1', borderRadius: '50%', width: '70px', height: '70px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem',
                      color: '#94a3b8', fontWeight: 'bold', transform: 'rotate(-10deg)', textTransform: 'uppercase'
                    }}>
                      ختم دكّان
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* DELETE STORE MODAL */}
      {showDeleteModal && targetDeleteStore && (
        <div className="modal-backdrop" onClick={() => { setShowDeleteModal(false); setTargetDeleteStore(null); setDeleteConfirmText(''); }} style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)'
        }}>
          <div className="card animate-scale-up" onClick={(e) => e.stopPropagation()} style={{
            width: '95%', maxWidth: '480px', padding: '1.75rem', gap: '1.25rem',
            borderRadius: '16px', boxShadow: 'var(--shadow-lg)', borderTop: '6px solid var(--danger)',
            backgroundColor: 'var(--surface)', color: 'var(--text)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Trash2 size={20} style={{ color: 'var(--danger)' }} />
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--danger)' }}>حذف المتجر نهائياً</h3>
              </div>
              <span className="badge badge-danger">{targetDeleteStore.store_name}</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{
                backgroundColor: '#fdf2f2',
                border: '1px solid #fde2e2',
                borderRadius: '8px',
                padding: '0.85rem',
                fontSize: '0.85rem',
                color: '#9b1c1c',
                lineHeight: '1.5'
              }}>
                <strong>⚠️ تنبيه هام جداً:</strong>
                <p style={{ margin: '0.35rem 0 0 0' }}>
                  هذا الإجراء سيقوم بحذف متجر <strong>{targetDeleteStore.store_name}</strong> وكل البيانات التابعة له بشكل نهائي وغير قابل للاسترداد.
                  يشمل ذلك: حسابات المستخدمين والموظفين، قائمة المنتجات، حركات المخازن، سجلات المبيعات، الفواتير، الديون والمدفوعات.
                </p>
              </div>

              <div className="input-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label className="input-label" style={{ fontWeight: 'bold' }}>
                  لتأكيد الحذف النهائي، يرجى كتابة رمز المتجر <strong>({targetDeleteStore.client_code})</strong> أدناه:
                </label>
                <input
                  type="text"
                  className="input-field"
                  style={{ border: deleteConfirmText === targetDeleteStore.client_code ? '1.5px solid var(--success)' : '1px solid var(--border)', textAlign: 'center', fontWeight: 'bold', letterSpacing: '1px', width: '100%', padding: '0.6rem', borderRadius: '8px', outline: 'none' }}
                  placeholder={targetDeleteStore.client_code}
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  onClick={handleDeleteStoreConfirm}
                  className="btn btn-danger"
                  style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', fontWeight: 'bold', border: 'none', cursor: deleteConfirmText === targetDeleteStore.client_code ? 'pointer' : 'not-allowed', backgroundColor: deleteConfirmText === targetDeleteStore.client_code ? 'var(--danger)' : '#fca5a5' }}
                  disabled={deleteConfirmText !== targetDeleteStore.client_code || isLoading}
                >
                  {isLoading ? 'جاري الحذف...' : 'نعم، احذف المتجر والبيانات بالكامل'}
                </button>
                <button
                  onClick={() => { setShowDeleteModal(false); setTargetDeleteStore(null); setDeleteConfirmText(''); }}
                  className="btn btn-secondary"
                  style={{ padding: '0.75rem 1.25rem', borderRadius: '8px', border: '1px solid var(--border)', cursor: 'pointer' }}
                  disabled={isLoading}
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== CHANGE ADMIN PASSWORD MODAL ===== */}
      {showChangePasswordModal && (
        <div className="modal-backdrop" style={{ zIndex: 1100 }}>
          <div className="card" style={{ width: '100%', maxWidth: '440px', padding: '2rem', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                <KeyRound size={20} style={{ color: 'var(--primary)' }} />
                تغيير كلمة مرور المشرف
              </h3>
              <button
                onClick={() => { setShowChangePasswordModal(false); setCurrentPasswordInput(''); setNewPasswordInput(''); setConfirmPasswordInput(''); setError(null); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}
              >
                <X size={20} />
              </button>
            </div>

            {error && (
              <div style={{ backgroundColor: 'hsl(0,80%,95%)', color: 'var(--danger)', borderRight: '3px solid var(--danger)', padding: '0.6rem 0.9rem', borderRadius: '8px', fontSize: '0.9rem', fontWeight: '600' }}>{error}</div>
            )}

            <form onSubmit={handleChangeAdminPassword} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label">كلمة المرور الحالية</label>
                <input
                  type="password"
                  className="input-field"
                  placeholder="أدخل كلمة المرور الحالية"
                  value={currentPasswordInput}
                  onChange={(e) => setCurrentPasswordInput(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label">كلمة المرور الجديدة</label>
                <input
                  type="password"
                  className="input-field"
                  placeholder="6 أحرف على الأقل"
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label">تأكيد كلمة المرور الجديدة</label>
                <input
                  type="password"
                  className="input-field"
                  style={{ border: confirmPasswordInput && confirmPasswordInput === newPasswordInput ? '1.5px solid var(--success)' : '' }}
                  placeholder="أعد كتابة كلمة المرور الجديدة"
                  value={confirmPasswordInput}
                  onChange={(e) => setConfirmPasswordInput(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', fontWeight: 'bold' }}
                  disabled={isLoading}
                >
                  {isLoading ? 'جاري الحفظ...' : 'حفظ كلمة المرور الجديدة'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowChangePasswordModal(false); setCurrentPasswordInput(''); setNewPasswordInput(''); setConfirmPasswordInput(''); setError(null); }}
                  className="btn btn-secondary"
                  style={{ padding: '0.75rem 1.25rem', borderRadius: '8px', border: '1px solid var(--border)' }}
                  disabled={isLoading}
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default SysAdminLayout;
