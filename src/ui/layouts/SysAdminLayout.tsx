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
  KeyRound,
  LogIn,
  Megaphone,
  LifeBuoy,
  CreditCard,
  Tag,
  Receipt,
  Search
} from 'lucide-react';
import { api } from '../../core/api/client';

const SysAdminLayout: React.FC = () => {
  const { logout, user: sysUser } = useAuthStore();
  const { auditLogs, loadAuditLogs } = useSalesStore();

  const [activeTab, setActiveTab] = useState<'users' | 'audit' | 'invoices' | 'coupons' | 'payment_methods' | 'support' | 'broadcast'>('invoices');
  const [billingSubTab, setBillingSubTab] = useState<'stores' | 'invoices' | 'payments'>('stores');
  const [storeSearchQuery, setStoreSearchQuery] = useState('');
  const [showAddStoreModal, setShowAddStoreModal] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [tenantSettingsMap, setTenantSettingsMap] = useState<{ [id: string]: TenantSettings }>({});
  
  // New platform features states
  const [invoices, setInvoices] = useState<any[]>([]);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [supportTickets, setSupportTickets] = useState<any[]>([]);
  
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

  // ── Modals and Forms states for new SaaS features ──
  // Invoices Form States
  const [showCreateInvoiceModal, setShowCreateInvoiceModal] = useState(false);
  const [newInvoiceStoreId, setNewInvoiceStoreId] = useState('');
  const [newInvoicePlan, setNewInvoicePlan] = useState('6_gold');
  const [newInvoiceTerm, setNewInvoiceTerm] = useState<'30' | '90' | '180' | '365' | 'custom'>('365');
  const [newInvoiceCustomDays, setNewInvoiceCustomDays] = useState<number>(30);
  const [newInvoiceMaxUsers, setNewInvoiceMaxUsers] = useState<number>(5);
  const [newInvoiceAmount, setNewInvoiceAmount] = useState<string>('');
  const [newInvoiceNotes, setNewInvoiceNotes] = useState<string>('');
  const [newInvoiceCoupon, setNewInvoiceCoupon] = useState<string>('');
  const [newInvoiceDiscountCalculated, setNewInvoiceDiscountCalculated] = useState<number>(0);
  
  // Pay Invoice Modal States
  const [showPayInvoiceModal, setShowPayInvoiceModal] = useState(false);
  const [payingInvoice, setPayingInvoice] = useState<any | null>(null);
  const [payInvoiceMethod, setPayInvoiceMethod] = useState('');
  const [payInvoiceNotes, setPayInvoiceNotes] = useState('');

  // Coupons Form States
  const [showCreateCouponModal, setShowCreateCouponModal] = useState(false);
  const [newCouponCode, setNewCouponCode] = useState('');
  const [newCouponType, setNewCouponType] = useState<'percent' | 'fixed'>('percent');
  const [newCouponValue, setNewCouponValue] = useState<number>(0);
  const [newCouponExpires, setNewCouponExpires] = useState<string>(new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]);
  const [newCouponMaxUses, setNewCouponMaxUses] = useState<number>(100);

  // Payment Methods Form States
  const [showCreatePMethodModal, setShowCreatePMethodModal] = useState(false);
  const [newPMethodName, setNewPMethodName] = useState('');
  const [newPMethodDetails, setNewPMethodDetails] = useState('');

  // Support Tickets Form States
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [ticketResponseText, setTicketResponseText] = useState('');
  const [ticketStatus, setTicketStatus] = useState('resolved');

  // Broadcast Notifications Form States
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastType, setBroadcastType] = useState<'info' | 'warning' | 'danger' | 'success'>('info');

  const [isLoadingPlatform, setIsLoadingPlatform] = useState(false);

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

      // 5. Fetch platform invoices
      try {
        const invs = await api.invoices.getAll();
        setInvoices(invs);
      } catch (err) {
        console.error('Error loading platform invoices:', err);
      }

      // 6. Fetch platform coupons
      try {
        const cps = await api.platform.coupons.getAll();
        setCoupons(cps);
      } catch (err) {
        console.error('Error loading platform coupons:', err);
      }

      // 7. Fetch platform payment methods
      try {
        const pms = await api.platform.paymentMethods.getAll();
        setPaymentMethods(pms);
      } catch (err) {
        console.error('Error loading platform payment methods:', err);
      }

      // 8. Fetch support tickets
      try {
        const tks = await api.support.tickets.getAll();
        setSupportTickets(tks);
      } catch (err) {
        console.error('Error loading support tickets:', err);
      }
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
      setShowAddStoreModal(false);
      
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

  const handleApplyInvoiceCoupon = async (code: string) => {
    if (!code) {
      setNewInvoiceDiscountCalculated(0);
      return;
    }
    try {
      const coupon = await api.platform.coupons.getByCode(code);
      if (!coupon) {
        alert('الكوبون غير صحيح أو منتهي الصلاحية');
        setNewInvoiceDiscountCalculated(0);
        return;
      }
      
      const amountVal = parseFloat(newInvoiceAmount) || 0;
      let discount = 0;
      if (coupon.discount_type === 'percent') {
        discount = (amountVal * coupon.discount_value) / 100;
      } else {
        discount = coupon.discount_value;
      }
      
      setNewInvoiceDiscountCalculated(discount);
      alert(`تم تطبيق الكوبون بنجاح! خصم بقيمة: ${discount.toLocaleString('ar-YE')} ر.ي`);
    } catch (e) {
      console.error(e);
      alert('فشل تطبيق الكوبون');
    }
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInvoiceStoreId) {
      alert('الرجاء اختيار المتجر');
      return;
    }

    setIsLoadingPlatform(true);
    try {
      const amount = parseFloat(newInvoiceAmount) || 0;
      const final_total = Math.max(0, amount - newInvoiceDiscountCalculated);
      
      let days = 365;
      if (newInvoiceTerm === '30') days = 30;
      else if (newInvoiceTerm === '90') days = 90;
      else if (newInvoiceTerm === '180') days = 180;
      else if (newInvoiceTerm === '365') days = 365;
      else if (newInvoiceTerm === 'custom') days = newInvoiceCustomDays || 30;

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 7);

      const invNum = 'INV-' + Date.now().toString().slice(-6);

      await api.invoices.create({
        tenant_id: newInvoiceStoreId,
        invoice_number: invNum,
        amount,
        tax: 0,
        discount: newInvoiceDiscountCalculated,
        final_total,
        status: 'unpaid',
        due_date: dueDate.toISOString().split('T')[0],
        license_plan: newInvoicePlan,
        duration_days: days,
        max_users: newInvoiceMaxUsers,
        notes: newInvoiceNotes
      });

      setShowCreateInvoiceModal(false);
      setNewInvoiceStoreId('');
      setNewInvoiceNotes('');
      setNewInvoiceCoupon('');
      setNewInvoiceDiscountCalculated(0);
      setNewInvoiceAmount('');
      
      await fetchSysAdminData();
      alert('تم إنشاء الفاتورة بنجاح!');
    } catch (e) {
      console.error(e);
      alert('فشل إنشاء الفاتورة');
    } finally {
      setIsLoadingPlatform(false);
    }
  };

  const handlePayInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingInvoice) return;

    setIsLoadingPlatform(true);
    try {
      await api.invoices.update({
        id: payingInvoice.id,
        status: 'paid',
        payment_method: payInvoiceMethod,
        notes: payInvoiceNotes
      });

      setShowPayInvoiceModal(false);
      setPayingInvoice(null);
      setPayInvoiceMethod('');
      setPayInvoiceNotes('');

      await fetchSysAdminData();
      alert('تم تسجيل سداد الفاتورة وتمديد ترخيص المتجر بنجاح!');
    } catch (e) {
      console.error(e);
      alert('فشل تسجيل سداد الفاتورة');
    } finally {
      setIsLoadingPlatform(false);
    }
  };

  const handleDeleteInvoice = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه الفاتورة نهائياً؟')) return;
    try {
      await api.invoices.remove(id);
      await fetchSysAdminData();
      alert('تم حذف الفاتورة');
    } catch (e) {
      console.error(e);
      alert('فشل حذف الفاتورة');
    }
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCouponCode) {
      alert('الرجاء إدخال الرمز');
      return;
    }
    
    setIsLoadingPlatform(true);
    try {
      await api.platform.coupons.create({
        code: newCouponCode,
        discount_type: newCouponType,
        discount_value: newCouponValue,
        expires_at: newCouponExpires,
        max_uses: newCouponMaxUses,
        is_active: 1
      });

      setShowCreateCouponModal(false);
      setNewCouponCode('');
      setNewCouponValue(0);
      
      await fetchSysAdminData();
      alert('تم إنشاء الكوبون بنجاح!');
    } catch (e) {
      console.error(e);
      alert('فشل إنشاء الكوبون');
    } finally {
      setIsLoadingPlatform(false);
    }
  };

  const handleDeleteCoupon = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من حذف الكوبون؟')) return;
    try {
      await api.platform.coupons.remove(id);
      await fetchSysAdminData();
      alert('تم حذف الكوبون');
    } catch (e) {
      console.error(e);
      alert('فشل حذف الكوبون');
    }
  };

  const handleCreatePMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPMethodName) {
      alert('الرجاء إدخال الاسم');
      return;
    }

    setIsLoadingPlatform(true);
    try {
      await api.platform.paymentMethods.create({
        name: newPMethodName,
        details: newPMethodDetails,
        is_active: 1
      });

      setShowCreatePMethodModal(false);
      setNewPMethodName('');
      setNewPMethodDetails('');

      await fetchSysAdminData();
      alert('تم إضافة طريقة السداد بنجاح!');
    } catch (e) {
      console.error(e);
      alert('فشل إضافة طريقة السداد');
    } finally {
      setIsLoadingPlatform(false);
    }
  };

  const handleDeletePMethod = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من حذف طريقة السداد؟')) return;
    try {
      await api.platform.paymentMethods.remove(id);
      await fetchSysAdminData();
      alert('تم حذف طريقة السداد');
    } catch (e) {
      console.error(e);
      alert('فشل حذف طريقة السداد');
    }
  };

  const handleTogglePMethodStatus = async (pm: any) => {
    try {
      await api.platform.paymentMethods.update({
        ...pm,
        is_active: pm.is_active ? 0 : 1
      });
      await fetchSysAdminData();
    } catch (e) {
      console.error(e);
      alert('فشل تعديل حالة طريقة السداد');
    }
  };

  const handleReplyTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket) return;

    setIsLoadingPlatform(true);
    try {
      await api.support.tickets.update({
        id: selectedTicket.id,
        tenant_id: selectedTicket.tenant_id,
        status: ticketStatus,
        response: ticketResponseText
      });

      setShowTicketModal(false);
      setSelectedTicket(null);
      setTicketResponseText('');

      await fetchSysAdminData();
      alert('تم إرسال رد الدعم الفني وتحديث حالة التذكرة بنجاح!');
    } catch (e) {
      console.error(e);
      alert('فشل إرسال الرد');
    } finally {
      setIsLoadingPlatform(false);
    }
  };

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle || !broadcastMessage) {
      alert('الرجاء كتابة العنوان ونص الإشعار');
      return;
    }

    setIsLoadingPlatform(true);
    try {
      const res: any = await api.broadcast.send(broadcastTitle, broadcastMessage, broadcastType);
      setBroadcastTitle('');
      setBroadcastMessage('');
      setBroadcastType('info');
      alert(`تم إرسال الإشعار الجماعي بنجاح إلى ${res.count || 0} متجراً!`);
    } catch (e) {
      console.error(e);
      alert('فشل إرسال الإشعار الجماعي');
    } finally {
      setIsLoadingPlatform(false);
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
              setActiveTab('invoices');
              setIsSidebarOpen(false);
            }}
            className="btn"
            style={{
              justifyContent: 'flex-start',
              backgroundColor: activeTab === 'invoices' ? 'var(--primary-lighter)' : 'transparent',
              color: activeTab === 'invoices' ? 'var(--primary)' : 'var(--text)',
              border: 'none',
              padding: '0.75rem 1rem'
            }}
          >
            <Receipt size={18} />
            <span>الاشتراكات والفوترة</span>
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

          <button
            onClick={() => {
              setActiveTab('coupons');
              setIsSidebarOpen(false);
            }}
            className="btn"
            style={{
              justifyContent: 'flex-start',
              backgroundColor: activeTab === 'coupons' ? 'var(--primary-lighter)' : 'transparent',
              color: activeTab === 'coupons' ? 'var(--primary)' : 'var(--text)',
              border: 'none',
              padding: '0.75rem 1rem'
            }}
          >
            <Tag size={18} />
            <span>كوبونات خصم المنصة</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('payment_methods');
              setIsSidebarOpen(false);
            }}
            className="btn"
            style={{
              justifyContent: 'flex-start',
              backgroundColor: activeTab === 'payment_methods' ? 'var(--primary-lighter)' : 'transparent',
              color: activeTab === 'payment_methods' ? 'var(--primary)' : 'var(--text)',
              border: 'none',
              padding: '0.75rem 1rem'
            }}
          >
            <CreditCard size={18} />
            <span>طرق السداد المتاحة</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('support');
              setIsSidebarOpen(false);
            }}
            className="btn"
            style={{
              justifyContent: 'flex-start',
              backgroundColor: activeTab === 'support' ? 'var(--primary-lighter)' : 'transparent',
              color: activeTab === 'support' ? 'var(--primary)' : 'var(--text)',
              border: 'none',
              padding: '0.75rem 1rem'
            }}
          >
            <LifeBuoy size={18} />
            <span>تذاكر الدعم الفني</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('broadcast');
              setIsSidebarOpen(false);
            }}
            className="btn"
            style={{
              justifyContent: 'flex-start',
              backgroundColor: activeTab === 'broadcast' ? 'var(--primary-lighter)' : 'transparent',
              color: activeTab === 'broadcast' ? 'var(--primary)' : 'var(--text)',
              border: 'none',
              padding: '0.75rem 1rem'
            }}
          >
            <Megaphone size={18} />
            <span>إرسال تعميم جماعي</span>
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

          {activeTab === 'invoices' && (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              
              {/* Top Title & Actions */}
              <div className="card" style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1.5rem',
                padding: '1.5rem 2rem',
                background: 'linear-gradient(135deg, var(--surface) 0%, rgba(248, 250, 252, 0.8) 100%)',
                backdropFilter: 'blur(16px)',
                border: '1px solid var(--border)',
                boxShadow: 'var(--shadow-md)',
                borderRadius: '20px',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  width: '4px',
                  height: '100%',
                  backgroundColor: 'var(--primary)'
                }} />
                <div>
                  <h3 style={{ color: 'var(--text-dark)', display: 'flex', alignItems: 'center', gap: '0.75rem', margin: 0, fontWeight: '900', fontSize: '1.45rem' }}>
                    <div style={{ display: 'flex', padding: '0.5rem', backgroundColor: 'var(--primary-lighter)', color: 'var(--primary)', borderRadius: '10px' }}>
                      <Receipt size={22} style={{ strokeWidth: 2.5 }} />
                    </div>
                    <span>إدارة الاشتراكات والفوترة للمتاجر</span>
                  </h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: '0.5rem 0 0 0', fontWeight: '500', lineHeight: '1.4' }}>
                    إصدار مطالبات تجديد التراخيص، متابعة فواتير المتاجر، وسجل المقبوضات وسندات القبض المعتمدة للمنصة.
                  </p>
                </div>
                
                {billingSubTab === 'invoices' && (
                  <button
                    onClick={() => {
                      setShowCreateInvoiceModal(true);
                    }}
                    className="btn btn-primary"
                    style={{ border: 'none', fontWeight: '800', borderRadius: '12px', padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', boxShadow: 'var(--shadow-sm)', transition: 'all 0.2s' }}
                  >
                    <Plus size={18} /> إصدار فاتورة جديدة
                  </button>
                )}

                {billingSubTab === 'stores' && (
                  <button
                    onClick={() => {
                      setNewStoreName('');
                      setNewClientCode('');
                      setNewAdminPassword('123456');
                      setNewStorePlan('6_gold');
                      setSubscriptionTerm('365');
                      setMaxUsersAllowed(5);
                      setCustomPrice('');
                      setShowAddStoreModal(true);
                    }}
                    className="btn btn-primary"
                    style={{ border: 'none', fontWeight: '800', borderRadius: '12px', padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', boxShadow: 'var(--shadow-sm)', transition: 'all 0.2s' }}
                  >
                    <Plus size={18} /> إضافة متجر جديد
                  </button>
                )}
              </div>

              {/* Stat Cards Summary */}
              <div className="grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem' }}>
                {/* Stat 1: Total Payments Collected */}
                <div className="card" style={{
                  display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1.5rem 1.75rem', borderRadius: '18px', border: '1px solid var(--border)',
                  background: 'linear-gradient(135deg, var(--primary-lighter) 0%, transparent 100%)', boxShadow: 'var(--shadow-sm)',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', cursor: 'default'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                  e.currentTarget.style.borderColor = 'var(--primary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                  e.currentTarget.style.borderColor = 'var(--border)';
                }}>
                  <div style={{ padding: '0.85rem', backgroundColor: 'var(--primary-lighter)', color: 'var(--success)', borderRadius: '14px', display: 'flex', boxShadow: 'var(--shadow-sm)' }}>
                    <DollarSign size={24} style={{ strokeWidth: 2.2 }} />
                  </div>
                  <div>
                    <h5 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '700', margin: 0, textTransform: 'uppercase', letterSpacing: '0.02em' }}>إجمالي قيمة المقبوضات</h5>
                    <h4 style={{ fontSize: '1.5rem', color: 'var(--text-dark)', fontWeight: '900', margin: '0.3rem 0 0 0', fontFamily: 'system-ui' }}>
                      {payments.reduce((sum, p) => sum + p.amount, 0).toLocaleString('ar-YE')} <span style={{ fontSize: '0.85rem', fontWeight: '800' }}>ر.ي</span>
                    </h4>
                  </div>
                </div>

                {/* Stat 2: Total Unpaid Invoices */}
                <div className="card" style={{
                  display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1.5rem 1.75rem', borderRadius: '18px', border: '1px solid var(--border)',
                  background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, transparent 100%)', boxShadow: 'var(--shadow-sm)',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', cursor: 'default'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                  e.currentTarget.style.borderColor = 'var(--danger)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                  e.currentTarget.style.borderColor = 'var(--border)';
                }}>
                  <div style={{ padding: '0.85rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', borderRadius: '14px', display: 'flex', boxShadow: 'var(--shadow-sm)' }}>
                    <Receipt size={24} style={{ strokeWidth: 2.2 }} />
                  </div>
                  <div>
                    <h5 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '700', margin: 0 }}>المطالبات والفواتير المستحقة</h5>
                    <h4 style={{ fontSize: '1.18rem', color: 'var(--text-dark)', fontWeight: '900', margin: '0.3rem 0 0 0' }}>
                      <span style={{ fontSize: '1.5rem', fontFamily: 'system-ui' }}>{invoices.filter(i => i.status === 'unpaid').length}</span> مطالبة 
                      <span style={{ fontSize: '0.85rem', color: 'var(--danger)', marginRight: '0.45rem', fontWeight: 'bold' }}>
                        ({invoices.filter(i => i.status === 'unpaid').reduce((sum, i) => sum + i.final_total, 0).toLocaleString('ar-YE')} ر.ي)
                      </span>
                    </h4>
                  </div>
                </div>

                {/* Stat 3: Active Stores */}
                <div className="card" style={{
                  display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1.5rem 1.75rem', borderRadius: '18px', border: '1px solid var(--border)',
                  background: 'linear-gradient(135deg, var(--primary-lighter) 0%, transparent 100%)', boxShadow: 'var(--shadow-sm)',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', cursor: 'default'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                  e.currentTarget.style.borderColor = 'var(--primary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                  e.currentTarget.style.borderColor = 'var(--border)';
                }}>
                  <div style={{ padding: '0.85rem', backgroundColor: 'var(--primary-lighter)', color: 'var(--primary)', borderRadius: '14px', display: 'flex', boxShadow: 'var(--shadow-sm)' }}>
                    <Users size={24} style={{ strokeWidth: 2.2 }} />
                  </div>
                  <div>
                    <h5 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '700', margin: 0 }}>المتاجر النشطة بالتراخيص</h5>
                    <h4 style={{ fontSize: '1.18rem', color: 'var(--text-dark)', fontWeight: '900', margin: '0.3rem 0 0 0' }}>
                      <span style={{ fontSize: '1.5rem', fontFamily: 'system-ui' }}>{tenants.filter(t => t.id !== '0' && new Date() < new Date(t.subscription_expires_at)).length}</span> من أصل 
                      <span style={{ fontSize: '1.05rem', color: 'var(--text-muted)', marginRight: '0.3rem' }}>{tenants.filter(t => t.id !== '0').length} متاجر</span>
                    </h4>
                  </div>
                </div>
              </div>

              {/* Sub-tab Navigation (Premium Segmented Pill Bar) */}
              <div style={{
                display: 'inline-flex',
                backgroundColor: 'var(--surface-hover)',
                borderRadius: '14px',
                padding: '0.4rem',
                border: '1px solid var(--border)',
                gap: '0.35rem',
                width: 'fit-content',
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
              }}>
                <button
                  type="button"
                  onClick={() => setBillingSubTab('stores')}
                  style={{
                    border: 'none',
                    borderRadius: '10px',
                    padding: '0.65rem 1.35rem',
                    fontSize: '0.85rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    backgroundColor: billingSubTab === 'stores' ? 'var(--surface)' : 'transparent',
                    color: billingSubTab === 'stores' ? 'var(--primary)' : 'var(--text-muted)',
                    boxShadow: billingSubTab === 'stores' ? '0 4px 10px rgba(0, 0, 0, 0.04), 0 1px 3px rgba(0, 0, 0, 0.02)' : 'none',
                    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem'
                  }}
                >
                  <Store size={16} />
                  <span>تراخيص وحالة المتاجر</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBillingSubTab('invoices')}
                  style={{
                    border: 'none',
                    borderRadius: '10px',
                    padding: '0.65rem 1.35rem',
                    fontSize: '0.85rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    backgroundColor: billingSubTab === 'invoices' ? 'var(--surface)' : 'transparent',
                    color: billingSubTab === 'invoices' ? 'var(--primary)' : 'var(--text-muted)',
                    boxShadow: billingSubTab === 'invoices' ? '0 4px 10px rgba(0, 0, 0, 0.04), 0 1px 3px rgba(0, 0, 0, 0.02)' : 'none',
                    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem'
                  }}
                >
                  <Receipt size={16} />
                  <span>فواتير ومطالبات المتاجر</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBillingSubTab('payments')}
                  style={{
                    border: 'none',
                    borderRadius: '10px',
                    padding: '0.65rem 1.35rem',
                    fontSize: '0.85rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    backgroundColor: billingSubTab === 'payments' ? 'var(--surface)' : 'transparent',
                    color: billingSubTab === 'payments' ? 'var(--primary)' : 'var(--text-muted)',
                    boxShadow: billingSubTab === 'payments' ? '0 4px 10px rgba(0, 0, 0, 0.04), 0 1px 3px rgba(0, 0, 0, 0.02)' : 'none',
                    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem'
                  }}
                >
                  <FileText size={16} />
                  <span>سجل المقبوضات وحركات الترخيص</span>
                </button>
              </div>

              {/* Sub-tab 0: Stores & Subscriptions Grid */}
              {billingSubTab === 'stores' && (
                <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {/* Search and Filters */}
                  <div className="card" style={{ padding: '1.25rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', border: '1px solid var(--border)', borderRadius: '16px', boxShadow: 'var(--shadow-sm)' }}>
                    <div style={{ position: 'relative', flex: 1, minWidth: '280px' }}>
                      <Search size={18} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                      <input
                        type="text"
                        className="input-field"
                        placeholder="البحث باسم المتجر أو رمز العميل أو نوع الباقة..."
                        value={storeSearchQuery}
                        onChange={(e) => setStoreSearchQuery(e.target.value)}
                        style={{ paddingRight: '2.75rem', margin: 0, width: '100%', borderRadius: '10px', height: '42px' }}
                      />
                    </div>
                  </div>

                  {/* Stores Grid list */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {tenants
                      .filter(store => store.id !== '0') // Exclude system tenant
                      .filter(store => {
                        if (!storeSearchQuery) return true;
                        const query = storeSearchQuery.toLowerCase();
                        return (
                          store.store_name.toLowerCase().includes(query) ||
                          store.client_code.toLowerCase().includes(query) ||
                          getPlanNameAr(store.license_plan).toLowerCase().includes(query)
                        );
                      })
                      .map(store => {
                        const settings = tenantSettingsMap[store.id];
                        const isExpired = new Date() > new Date(store.subscription_expires_at);
                        const daysLeft = Math.max(0, Math.ceil((new Date(store.subscription_expires_at).getTime() - new Date().getTime()) / 86400000));
                        const percentLeft = Math.min(100, Math.round((daysLeft / 365) * 100));

                        // Custom color configuration for plans
                        const getPlanTheme = (plan: string) => {
                          if (plan.includes('gold')) return { bg: '#fffbeb', color: '#b45309', border: '1px solid #fef3c7' };
                          if (plan.includes('pro')) return { bg: '#eef2ff', color: '#4338ca', border: '1px solid #e0e7ff' };
                          if (plan.includes('business')) return { bg: '#ecfdf5', color: '#047857', border: '1px solid #d1fae5' };
                          return { bg: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0' };
                        };
                        const planTheme = getPlanTheme(store.license_plan);

                        return (
                          <div key={store.id} className="store-card animate-fade-in" style={{
                            border: '1px solid var(--border)',
                            borderRight: isExpired ? '6px solid var(--danger)' : store.status === 'suspended' ? '6px solid var(--warning)' : '6px solid var(--success)',
                            display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem',
                            backgroundColor: 'var(--surface)', padding: '1.5rem', borderRadius: '16px', boxShadow: 'var(--shadow-sm)',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', position: 'relative'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'none';
                            e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                          }}>
                            {/* Tenant Title & Subscription Details */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flex: '1 1 320px' }}>
                              <div style={{
                                width: '52px',
                                height: '52px',
                                borderRadius: '14px',
                                background: isExpired
                                  ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, transparent 100%)'
                                  : store.status === 'suspended'
                                  ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, transparent 100%)'
                                  : 'linear-gradient(135deg, var(--primary-lighter) 0%, transparent 100%)',
                                color: isExpired ? 'var(--danger)' : store.status === 'suspended' ? 'var(--warning)' : 'var(--primary)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: '900',
                                fontSize: '1.35rem',
                                border: `1.5px solid ${isExpired ? 'var(--danger)' : store.status === 'suspended' ? 'var(--warning)' : 'var(--primary)'}`,
                                flexShrink: 0
                              }}>
                                {store.store_name.charAt(0)}
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', width: '100%' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                  <h4 style={{ color: 'var(--text-dark)', margin: 0, fontSize: '1.1rem', fontWeight: '800' }}>{store.store_name}</h4>
                                  <span style={{ fontSize: '0.72rem', padding: '0.2rem 0.55rem', borderRadius: '6px', fontWeight: '700', ...planTheme }}>
                                    {getPlanNameAr(store.license_plan)}
                                  </span>
                                  {isExpired && (
                                    <span className="badge badge-danger" style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem', borderRadius: '6px', fontWeight: 'bold' }}>
                                      منتهي الترخيص
                                    </span>
                                  )}
                                  {store.status === 'suspended' && (
                                    <span className="badge badge-secondary" style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem', backgroundColor: 'var(--border)', color: 'var(--text-muted)', borderRadius: '6px', fontWeight: 'bold' }}>
                                      مجمّد
                                    </span>
                                  )}
                                </div>
                                
                                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', flexWrap: 'wrap', gap: '1.25rem', alignItems: 'center' }}>
                                  <span>رمز المتجر: <code style={{ backgroundColor: 'var(--background)', padding: '0.15rem 0.4rem', borderRadius: '4px', border: '1px solid var(--border)', fontSize: '0.78rem' }}>{store.client_code}</code></span>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', minWidth: '220px' }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: isExpired ? 'var(--danger)' : 'inherit', fontWeight: isExpired ? 'bold' : '500' }}>
                                      <Clock size={13} style={{ strokeWidth: 2 }} />
                                      ترخيص لغاية: {new Date(store.subscription_expires_at).toLocaleDateString('ar-YE')}
                                      <span style={{ fontSize: '0.78rem', color: isExpired ? 'var(--danger)' : 'var(--primary)', fontWeight: 'bold', marginRight: '0.25rem' }}>
                                        ({daysLeft} يوم متبقي)
                                      </span>
                                    </span>
                                    <div style={{ width: '100%', backgroundColor: 'var(--border)', height: '5px', borderRadius: '10px', overflow: 'hidden', marginTop: '0.15rem' }}>
                                      <div style={{
                                        width: `${percentLeft}%`,
                                        backgroundColor: isExpired || daysLeft <= 30 ? 'var(--danger)' : daysLeft <= 90 ? 'var(--warning)' : 'var(--success)',
                                        height: '100%',
                                        borderRadius: '10px',
                                        transition: 'width 0.4s ease'
                                      }} />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Modules settings toggles */}
                            <div style={{ flex: '1 1 250px' }}>
                              <p style={{ fontSize: '0.78rem', fontWeight: '800', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>الموديولات المفعلة للعميل:</p>
                              {settings ? (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                                  {(['enable_inventory', 'enable_sales', 'enable_reports', 'enable_employees'] as const).map(mod => {
                                    const active = settings[mod];
                                    const label = mod === 'enable_inventory' ? 'المخزن' : mod === 'enable_sales' ? 'المبيعات' : mod === 'enable_reports' ? 'التقارير' : 'الموظفين';
                                    return (
                                      <button
                                        key={mod}
                                        onClick={() => handleToggleModule(store.id, mod)}
                                        className="btn"
                                        style={{
                                          padding: '0.3rem 0.65rem',
                                          fontSize: '0.72rem',
                                          borderRadius: '20px',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '0.3rem',
                                          backgroundColor: active ? 'var(--primary-lighter)' : 'var(--background)',
                                          color: active ? 'var(--primary)' : 'var(--text-muted)',
                                          border: '1.5px solid',
                                          borderColor: active ? 'var(--primary)' : 'var(--border)',
                                          cursor: 'pointer',
                                          fontWeight: '700',
                                          transition: 'all 0.2s ease',
                                          boxShadow: active ? 'var(--shadow-sm)' : 'none'
                                        }}
                                      >
                                        <span style={{
                                          width: '6px',
                                          height: '6px',
                                          borderRadius: '50%',
                                          backgroundColor: active ? 'var(--primary)' : 'var(--text-muted)',
                                          display: 'inline-block'
                                        }} />
                                        <span>{label}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              ) : (
                                <div style={{ fontSize: '0.75rem', color: 'var(--danger)' }}>جاري التحميل...</div>
                              )}
                            </div>

                            {/* Subscription actions & status */}
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-end', flex: '1 1 240px' }}>
                              <button
                                onClick={async () => {
                                  if (window.confirm(`هل أنت متأكد من الدخول ومعاينة متجر "${store.store_name}"؟`)) {
                                    await useAuthStore.getState().impersonate(store.id);
                                  }
                                }}
                                className="btn btn-secondary"
                                style={{
                                  padding: '0.55rem 1rem',
                                  fontSize: '0.78rem',
                                  borderRadius: '10px',
                                  border: '1px solid var(--primary-light)',
                                  backgroundColor: 'rgba(5,150,105,0.06)',
                                  color: 'var(--primary)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.35rem',
                                  cursor: 'pointer',
                                  fontWeight: '800',
                                  transition: 'all 0.2s ease',
                                  boxShadow: '0 2px 6px rgba(5,150,105,0.04)'
                                }}
                                title="الدخول ومحاكاة لوحة تحكم المتجر"
                              >
                                <LogIn size={13} style={{ strokeWidth: 2.2 }} />
                                <span>محاكاة المتجر</span>
                              </button>

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
                                style={{
                                  padding: '0.55rem 1rem',
                                  fontSize: '0.78rem',
                                  borderRadius: '10px',
                                  border: 'none',
                                  backgroundColor: 'var(--primary)',
                                  color: 'var(--text-light)',
                                  fontWeight: '800',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s ease',
                                  boxShadow: '0 4px 10px rgba(5,150,105,0.15)'
                                }}
                              >
                                تجديد الترخيص
                              </button>

                              {/* Mini Icon Toolbar for Secondary Actions */}
                              <div style={{ display: 'inline-flex', gap: '0.35rem', borderRight: '1px solid var(--border)', paddingRight: '0.5rem', marginRight: '0.2rem' }}>
                                <button
                                  onClick={() => {
                                    setStatementStore(store);
                                    const filtered = payments.filter(p => p.tenant_id === store.id);
                                    setStatementPayments(filtered);
                                    setShowStatementModal(true);
                                  }}
                                  className="btn btn-secondary"
                                  style={{
                                    padding: '0.55rem',
                                    borderRadius: '10px',
                                    border: '1px solid var(--border)',
                                    backgroundColor: 'var(--surface)',
                                    color: 'var(--text)',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'all 0.2s ease'
                                  }}
                                  title="كشف حساب المتجر بالكامل"
                                >
                                  <BookOpen size={15} />
                                </button>
                                
                                <button
                                  onClick={() => handleToggleStoreStatus(store)}
                                  className="btn"
                                  style={{
                                    padding: '0.55rem',
                                    borderRadius: '10px',
                                    border: '1px solid',
                                    backgroundColor: store.status === 'active' ? '#fffbeb' : '#f0fdf4',
                                    color: store.status === 'active' ? 'var(--warning)' : 'var(--primary)',
                                    borderColor: store.status === 'active' ? '#fef3c7' : '#d1fae5',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'all 0.2s ease'
                                  }}
                                  title={store.status === 'active' ? 'تجميد حساب المتجر' : 'تفعيل حساب المتجر'}
                                >
                                  {store.status === 'active' ? <X size={15} /> : <Check size={15} />}
                                </button>

                                <button
                                  onClick={() => {
                                    setTargetDeleteStore(store);
                                    setDeleteConfirmText('');
                                    setShowDeleteModal(true);
                                  }}
                                  className="btn"
                                  style={{
                                    padding: '0.55rem',
                                    borderRadius: '10px',
                                    border: '1px solid #fee2e2',
                                    backgroundColor: '#fef2f2',
                                    color: 'var(--danger)',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'all 0.2s ease'
                                  }}
                                  title="حذف المتجر نهائياً من قاعدة البيانات"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}

                    {tenants.filter(store => store.id !== '0').length === 0 && (
                      <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: '16px' }}>
                        <Store size={48} style={{ strokeWidth: 1.2, color: 'var(--text-muted)', marginBottom: '1rem' }} />
                        <p style={{ margin: 0, fontWeight: '700' }}>لا توجد متاجر مسجلة في النظام بعد.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Sub-tab 1: Invoices List */}
              {billingSubTab === 'invoices' && (
                <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {/* Search Control */}
                  <div className="card" style={{ padding: '1.25rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', border: '1px solid var(--border)', borderRadius: '16px', boxShadow: 'var(--shadow-sm)' }}>
                    <div style={{ position: 'relative', flex: 1, minWidth: '280px' }}>
                      <Search size={18} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                      <input
                        type="text"
                        className="input-field"
                        placeholder="البحث برقم الفاتورة أو اسم المتجر أو رمز العميل..."
                        value={paymentSearchQuery}
                        onChange={(e) => setPaymentSearchQuery(e.target.value)}
                        style={{ paddingRight: '2.75rem', margin: 0, width: '100%', borderRadius: '10px', height: '42px' }}
                      />
                    </div>
                  </div>

                  {/* Invoices Table Card */}
                  <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--border)', borderRadius: '16px', boxShadow: 'var(--shadow-sm)' }}>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '0.85rem' }}>
                        <thead>
                          <tr style={{ backgroundColor: 'var(--surface-hover)', borderBottom: '1.5px solid var(--border)' }}>
                            <th style={{ padding: '1.15rem 1.25rem', color: 'var(--text-muted)', fontWeight: '800' }}>رقم الفاتورة</th>
                            <th style={{ padding: '1.15rem 1.25rem', color: 'var(--text-muted)', fontWeight: '800' }}>المتجر المستفيد</th>
                            <th style={{ padding: '1.15rem 1.25rem', color: 'var(--text-muted)', fontWeight: '800' }}>الباقة الصادرة</th>
                            <th style={{ padding: '1.15rem 1.25rem', color: 'var(--text-muted)', fontWeight: '800' }}>المدة</th>
                            <th style={{ padding: '1.15rem 1.25rem', color: 'var(--text-muted)', fontWeight: '800' }}>المبلغ المطلوب</th>
                            <th style={{ padding: '1.15rem 1.25rem', color: 'var(--text-muted)', fontWeight: '800' }}>تاريخ الاستحقاق</th>
                            <th style={{ padding: '1.15rem 1.25rem', color: 'var(--text-muted)', fontWeight: '800' }}>الحالة</th>
                            <th style={{ padding: '1.15rem 1.25rem', color: 'var(--text-muted)', fontWeight: '800', textAlign: 'left' }}>الإجراءات</th>
                          </tr>
                        </thead>
                        <tbody>
                          {invoices
                            .filter(inv => {
                              if (!paymentSearchQuery) return true;
                              const val = paymentSearchQuery.toLowerCase();
                              const storeObj = tenants.find(t => t.id === inv.tenant_id);
                              return (
                                inv.invoice_number.toLowerCase().includes(val) ||
                                storeObj?.store_name.toLowerCase().includes(val) ||
                                storeObj?.client_code.toLowerCase().includes(val)
                              );
                            })
                            .map((inv) => {
                              const storeObj = tenants.find(t => t.id === inv.tenant_id);
                              return (
                                <tr key={inv.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s ease' }} className="table-row-hover">
                                  <td style={{ padding: '1.15rem 1.25rem', fontFamily: 'monospace', fontWeight: 'bold', color: 'var(--primary)', fontSize: '0.9rem' }}>#{inv.invoice_number}</td>
                                  <td style={{ padding: '1.15rem 1.25rem' }}>
                                    <span style={{ fontWeight: '800', color: 'var(--text-dark)', fontSize: '0.92rem' }}>{storeObj?.store_name || 'متجر غير معروف'}</span>
                                    <br />
                                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.15rem', display: 'inline-block' }}>رمز العميل: {storeObj?.client_code || '---'}</span>
                                  </td>
                                  <td style={{ padding: '1.15rem 1.25rem', fontWeight: '700', color: 'var(--text-dark)' }}>{getPlanNameAr(inv.license_plan)}</td>
                                  <td style={{ padding: '1.15rem 1.25rem', fontWeight: '700', color: 'var(--text-dark)' }}>{inv.duration_days} يوم</td>
                                  <td style={{ padding: '1.15rem 1.25rem', fontWeight: '900', color: 'var(--text-dark)', fontSize: '0.95rem' }}>
                                    <span>{inv.final_total.toLocaleString('ar-YE')} ر.ي</span>
                                    {inv.discount > 0 && (
                                      <span style={{ fontSize: '0.75rem', color: 'var(--danger)', marginRight: '0.4rem', textDecoration: 'line-through', fontWeight: '500' }}>
                                        {inv.amount.toLocaleString('ar-YE')}
                                      </span>
                                    )}
                                  </td>
                                  <td style={{ padding: '1.15rem 1.25rem', color: 'var(--text-muted)', fontWeight: '500' }}>{new Date(inv.due_date).toLocaleDateString('ar-YE')}</td>
                                  <td style={{ padding: '1.15rem 1.25rem' }}>
                                    {inv.status === 'paid' ? (
                                      <span style={{
                                        display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem',
                                        padding: '0.35rem 0.75rem', borderRadius: '30px', backgroundColor: 'rgba(16, 185, 129, 0.08)',
                                        color: 'var(--success)', border: '1px solid rgba(16, 185, 129, 0.15)', fontWeight: 'bold'
                                      }}>
                                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--success)', display: 'inline-block' }} />
                                        مدفوعة
                                      </span>
                                    ) : inv.status === 'unpaid' ? (
                                      <span style={{
                                        display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem',
                                        padding: '0.35rem 0.75rem', borderRadius: '30px', backgroundColor: 'rgba(239, 68, 68, 0.08)',
                                        color: 'var(--danger)', border: '1px solid rgba(239, 68, 68, 0.15)', fontWeight: 'bold'
                                      }}>
                                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--danger)', display: 'inline-block' }} />
                                        مستحقة
                                      </span>
                                    ) : (
                                      <span style={{
                                        display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem',
                                        padding: '0.35rem 0.75rem', borderRadius: '30px', backgroundColor: 'rgba(100, 116, 139, 0.08)',
                                        color: 'var(--text-muted)', border: '1px solid rgba(100, 116, 139, 0.15)', fontWeight: 'bold'
                                      }}>
                                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--text-muted)', display: 'inline-block' }} />
                                        ملغاة
                                      </span>
                                    )}
                                  </td>
                                  <td style={{ padding: '1.15rem 1.25rem', textAlign: 'left' }}>
                                    <div style={{ display: 'inline-flex', gap: '0.45rem' }}>
                                      {inv.status === 'unpaid' && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setPayingInvoice(inv);
                                            setPayInvoiceMethod(paymentMethods[0]?.name || 'نقداً');
                                            setShowPayInvoiceModal(true);
                                          }}
                                          className="btn btn-primary"
                                          style={{ padding: '0.45rem 0.9rem', fontSize: '0.75rem', border: 'none', borderRadius: '8px', fontWeight: '800', cursor: 'pointer', boxShadow: '0 2px 6px rgba(5,150,105,0.1)' }}
                                        >
                                          تسجيل سداد
                                        </button>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteInvoice(inv.id)}
                                        className="btn"
                                        style={{
                                          padding: '0.45rem', backgroundColor: '#fef2f2', color: 'var(--danger)',
                                          border: '1px solid #fee2e2', borderRadius: '8px', cursor: 'pointer',
                                          display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s'
                                        }}
                                        title="حذف الفاتورة نهائياً"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          {invoices.length === 0 && (
                            <tr>
                              <td colSpan={8} style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-muted)' }}>
                                <Receipt size={40} style={{ strokeWidth: 1.2, color: 'var(--text-muted)', marginBottom: '1rem' }} />
                                <p style={{ margin: 0, fontWeight: '700' }}>لا توجد أي فواتير مصدرة حالياً في النظام.</p>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Sub-tab 2: Payments Log */}
              {billingSubTab === 'payments' && (
                <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {/* Search Control */}
                  <div className="card" style={{ padding: '1.25rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', border: '1px solid var(--border)', borderRadius: '16px', boxShadow: 'var(--shadow-sm)' }}>
                    <div style={{ position: 'relative', flex: 1, minWidth: '280px' }}>
                      <Search size={18} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                      <input
                        type="text"
                        className="input-field"
                        placeholder="البحث باسم المتجر، رقم السند أو الرمز السريع..."
                        value={paymentSearchQuery}
                        onChange={(e) => setPaymentSearchQuery(e.target.value)}
                        style={{ paddingRight: '2.75rem', margin: 0, width: '100%', borderRadius: '10px', height: '42px' }}
                      />
                    </div>
                  </div>

                  {/* Payments Table Card */}
                  <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--border)', borderRadius: '16px', boxShadow: 'var(--shadow-sm)' }}>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '0.85rem' }}>
                        <thead>
                          <tr style={{ backgroundColor: 'var(--surface-hover)', borderBottom: '1.5px solid var(--border)' }}>
                            <th style={{ padding: '1.15rem 1.25rem', color: 'var(--text-muted)', fontWeight: '800' }}>رقم السند</th>
                            <th style={{ padding: '1.15rem 1.25rem', color: 'var(--text-muted)', fontWeight: '800' }}>المتجر المستفيد</th>
                            <th style={{ padding: '1.15rem 1.25rem', color: 'var(--text-muted)', fontWeight: '800' }}>نوع الحركة</th>
                            <th style={{ padding: '1.15rem 1.25rem', color: 'var(--text-muted)', fontWeight: '800' }}>الباقة والترخيص</th>
                            <th style={{ padding: '1.15rem 1.25rem', color: 'var(--text-muted)', fontWeight: '800' }}>المستخدمين المسموحين</th>
                            <th style={{ padding: '1.15rem 1.25rem', color: 'var(--text-muted)', fontWeight: '800' }}>المدة</th>
                            <th style={{ padding: '1.15rem 1.25rem', color: 'var(--text-muted)', fontWeight: '800' }}>المبلغ المقبوض</th>
                            <th style={{ padding: '1.15rem 1.25rem', color: 'var(--text-muted)', fontWeight: '800' }}>تاريخ القبض</th>
                            <th style={{ padding: '1.15rem 1.25rem', color: 'var(--text-muted)', fontWeight: '800', textAlign: 'left' }}>الإجراءات</th>
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
                                <tr key={p.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s ease' }} className="table-row-hover">
                                  <td style={{ padding: '1.15rem 1.25rem', fontFamily: 'monospace', fontWeight: 'bold', color: 'var(--primary)', fontSize: '0.9rem' }}>#{p.id.replace('pmt_', '')}</td>
                                  <td style={{ padding: '1.15rem 1.25rem' }}>
                                    <span style={{ fontWeight: '800', color: 'var(--text-dark)', fontSize: '0.92rem' }}>{storeObj?.store_name || 'متجر غير معروف'}</span>
                                    <br />
                                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.15rem', display: 'inline-block' }}>رمز العميل: {storeObj?.client_code || '---'}</span>
                                  </td>
                                  <td style={{ padding: '1.15rem 1.25rem' }}>
                                    <span className={`badge ${
                                      p.payment_type === 'initial_setup' ? 'badge-success' :
                                      p.payment_type === 'renewal' ? 'badge-info' :
                                      p.payment_type === 'upgrade' ? 'badge-warning' : 'badge-danger'
                                    }`} style={{ fontSize: '0.72rem', padding: '0.3rem 0.55rem', borderRadius: '6px', fontWeight: 'bold' }}>
                                      {p.payment_type === 'initial_setup' ? 'تأسيس مبدئي' :
                                       p.payment_type === 'renewal' ? 'تجديد ترخيص' :
                                       p.payment_type === 'upgrade' ? 'ترقية باقة' : 'تخفيض باقة'}
                                    </span>
                                  </td>
                                  <td style={{ padding: '1.15rem 1.25rem', fontWeight: '700', color: 'var(--text-dark)' }}>{getPlanNameAr(p.license_plan)}</td>
                                  <td style={{ padding: '1.15rem 1.25rem', fontWeight: '600', color: 'var(--text-muted)' }}>{p.max_users} مستخدمين</td>
                                  <td style={{ padding: '1.15rem 1.25rem', fontWeight: '600', color: 'var(--text-muted)' }}>{p.duration_days} يوم</td>
                                  <td style={{ padding: '1.15rem 1.25rem', fontWeight: '900', color: 'var(--primary)', fontSize: '0.95rem' }}>
                                    {p.amount.toLocaleString('ar-YE')} ر.ي
                                  </td>
                                  <td style={{ padding: '1.15rem 1.25rem', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '500', lineHeight: '1.3' }}>
                                    {new Date(p.payment_date).toLocaleDateString('ar-YE')}
                                    <br />
                                    <span style={{ fontSize: '0.7rem' }}>{new Date(p.payment_date).toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' })}</span>
                                  </td>
                                  <td style={{ padding: '1.15rem 1.25rem', textAlign: 'left' }}>
                                    <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setSelectedPayment(p);
                                          setShowInvoiceModal(true);
                                        }}
                                        className="btn btn-secondary"
                                        style={{ padding: '0.5rem 0.75rem', fontSize: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer', fontWeight: '700' }}
                                        title="طباعة سند قبض رسمي للمتجر"
                                      >
                                        <Printer size={13} />
                                        <span>سند قبض</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (storeObj) {
                                            setStatementStore(storeObj);
                                            const filtered = payments.filter(pm => pm.tenant_id === storeObj.id);
                                            setStatementPayments(filtered);
                                            setShowStatementModal(true);
                                          }
                                        }}
                                        className="btn btn-secondary"
                                        style={{ padding: '0.5rem 0.75rem', fontSize: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer', fontWeight: '700' }}
                                        title="عرض كشف حساب المتجر بالكامل"
                                      >
                                        <BookOpen size={13} />
                                        <span>كشف الحساب</span>
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          {payments.length === 0 && (
                            <tr>
                              <td colSpan={9} style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-muted)' }}>
                                <FileText size={40} style={{ strokeWidth: 1.2, color: 'var(--text-muted)', marginBottom: '1rem' }} />
                                <p style={{ margin: 0, fontWeight: '700' }}>لا توجد أي مدفوعات مسجلة بالنظام السحابي بعد.</p>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
              
            </div>
          )}

          {/* TAB 6: PLATFORM COUPONS */}
          {activeTab === 'coupons' && (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                    <Tag size={22} />
                    <span>كوبونات خصم اشتراكات المنصة</span>
                  </h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0.2rem 0 0' }}>إدارة كوبونات التخفيض لجذب متاجر جديدة وتنشيط التجديد</p>
                </div>
                <button
                  onClick={() => setShowCreateCouponModal(true)}
                  className="btn btn-primary"
                  style={{ border: 'none', fontWeight: 'bold' }}
                >
                  <Plus size={18} /> إنشاء كوبون خصم
                </button>
              </div>

              <div className="card">
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: 'var(--surface-hover)', borderBottom: '2px solid var(--border)' }}>
                        <th style={{ padding: '0.75rem 1rem' }}>رمز الكوبون</th>
                        <th style={{ padding: '0.75rem 1rem' }}>نوع الخصم</th>
                        <th style={{ padding: '0.75rem 1rem' }}>قيمة الخصم</th>
                        <th style={{ padding: '0.75rem 1rem' }}>تاريخ الانتهاء</th>
                        <th style={{ padding: '0.75rem 1rem' }}>الاستخدام</th>
                        <th style={{ padding: '0.75rem 1rem' }}>الحالة</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {coupons.map((cp) => (
                        <tr key={cp.id} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '0.75rem 1rem', fontWeight: 'bold', color: 'var(--primary)' }}>{cp.code}</td>
                          <td style={{ padding: '0.75rem 1rem' }}>{cp.discount_type === 'percent' ? 'نسبة مئوية' : 'مبلغ ثابت'}</td>
                          <td style={{ padding: '0.75rem 1rem', fontWeight: 'bold' }}>
                            {cp.discount_type === 'percent' ? `${cp.discount_value}%` : `${cp.discount_value.toLocaleString('ar-YE')} ر.ي`}
                          </td>
                          <td style={{ padding: '0.75rem 1rem' }}>{new Date(cp.expires_at).toLocaleDateString('ar-YE')}</td>
                          <td style={{ padding: '0.75rem 1rem' }}>{cp.used_count} / {cp.max_uses} مرات</td>
                          <td style={{ padding: '0.75rem 1rem' }}>
                            <span className={`badge ${cp.is_active && new Date() < new Date(cp.expires_at) ? 'badge-success' : 'badge-danger'}`}>
                              {cp.is_active && new Date() < new Date(cp.expires_at) ? 'نشط' : 'منتهي/معطل'}
                            </span>
                          </td>
                          <td style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>
                            <button
                              onClick={() => handleDeleteCoupon(cp.id)}
                              className="btn"
                              style={{ padding: '0.35rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '6px' }}
                            >
                              <Trash2 size={12} />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {coupons.length === 0 && (
                        <tr>
                          <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>لا توجد كوبونات مسجلة حالياً</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: PAYMENT METHODS */}
          {activeTab === 'payment_methods' && (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                    <CreditCard size={22} />
                    <span>طرق سداد الاشتراكات وتراخيص المتاجر</span>
                  </h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0.2rem 0 0' }}>إدارة الحسابات البنكية ومحافظ التحويل المتاحة للمتاجر</p>
                </div>
                <button
                  onClick={() => setShowCreatePMethodModal(true)}
                  className="btn btn-primary"
                  style={{ border: 'none', fontWeight: 'bold' }}
                >
                  <Plus size={18} /> إضافة طريقة جديدة
                </button>
              </div>

              <div className="card">
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: 'var(--surface-hover)', borderBottom: '2px solid var(--border)' }}>
                        <th style={{ padding: '0.75rem 1rem' }}>اسم طريقة الدفع</th>
                        <th style={{ padding: '0.75rem 1rem' }}>تفاصيل الحساب وإرشادات التحويل</th>
                        <th style={{ padding: '0.75rem 1rem' }}>الحالة</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paymentMethods.map((pm) => (
                        <tr key={pm.id} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '0.75rem 1rem', fontWeight: 'bold', color: 'var(--text)' }}>{pm.name}</td>
                          <td style={{ padding: '0.75rem 1rem', whiteSpace: 'pre-wrap' }}>{pm.details}</td>
                          <td style={{ padding: '0.75rem 1rem' }}>
                            <button
                              onClick={() => handleTogglePMethodStatus(pm)}
                              className={`badge ${pm.is_active ? 'badge-success' : 'badge-danger'}`}
                              style={{ border: 'none', cursor: 'pointer' }}
                            >
                              {pm.is_active ? 'نشطة' : 'معطلة'}
                            </button>
                          </td>
                          <td style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>
                            <button
                              onClick={() => handleDeletePMethod(pm.id)}
                              className="btn"
                              style={{ padding: '0.35rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '6px' }}
                            >
                              <Trash2 size={12} />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {paymentMethods.length === 0 && (
                        <tr>
                          <td colSpan={4} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>لا توجد أي طرق سداد مسجلة حالياً</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 8: TECHNICAL SUPPORT TICKETS */}
          {activeTab === 'support' && (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <h3 style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                  <LifeBuoy size={22} />
                  <span>تذاكر الدعم الفني للمتاجر</span>
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0.2rem 0 0' }}>متابعة وحل المشاكل الفنية ومقترحات أصحاب المحلات</p>
              </div>

              <div className="card">
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: 'var(--surface-hover)', borderBottom: '2px solid var(--border)' }}>
                        <th style={{ padding: '0.75rem 1rem' }}>رقم التذكرة</th>
                        <th style={{ padding: '0.75rem 1rem' }}>المتجر</th>
                        <th style={{ padding: '0.75rem 1rem' }}>العنوان</th>
                        <th style={{ padding: '0.75rem 1rem' }}>الأهمية</th>
                        <th style={{ padding: '0.75rem 1rem' }}>التاريخ</th>
                        <th style={{ padding: '0.75rem 1rem' }}>الحالة</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {supportTickets.map((tk) => {
                        const storeObj = tenants.find(t => t.id === tk.tenant_id);
                        return (
                          <tr key={tk.id} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace' }}>#{tk.id.replace('tk_', '')}</td>
                            <td style={{ padding: '0.75rem 1rem', fontWeight: 'bold' }}>{storeObj?.store_name || 'متجر غير معروف'}</td>
                            <td style={{ padding: '0.75rem 1rem' }}>{tk.title}</td>
                            <td style={{ padding: '0.75rem 1rem' }}>
                              <span className={`badge ${
                                tk.priority === 'high' ? 'badge-danger' :
                                tk.priority === 'medium' ? 'badge-warning' : 'badge-info'
                              }`} style={{ fontSize: '0.7rem' }}>
                                {tk.priority === 'high' ? 'عالية' :
                                 tk.priority === 'medium' ? 'متوسطة' : 'منخفضة'}
                              </span>
                            </td>
                            <td style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              {new Date(tk.created_at).toLocaleDateString('ar-YE')}
                            </td>
                            <td style={{ padding: '0.75rem 1rem' }}>
                              <span className={`badge ${
                                tk.status === 'resolved' ? 'badge-success' :
                                tk.status === 'open' ? 'badge-danger' : 'badge-secondary'
                              }`} style={{ fontSize: '0.7rem' }}>
                                {tk.status === 'resolved' ? 'تم الحل' :
                                 tk.status === 'open' ? 'مفتوحة / جديدة' : 'قيد المعالجة'}
                              </span>
                            </td>
                            <td style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>
                              <button
                                onClick={() => {
                                  setSelectedTicket(tk);
                                  setTicketResponseText(tk.response || '');
                                  setTicketStatus(tk.status);
                                  setShowTicketModal(true);
                                }}
                                className="btn btn-secondary"
                                style={{ padding: '0.35rem 0.6rem', fontSize: '0.7rem', borderRadius: '6px' }}
                              >
                                عرض والرد
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {supportTickets.length === 0 && (
                        <tr>
                          <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>لا توجد تذاكر دعم فني واردة حالياً</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 9: BROADCAST NOTIFICATIONS */}
          {activeTab === 'broadcast' && (
            <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.5rem' }}>
              <div className="card">
                <h3 style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
                  <Megaphone size={22} />
                  <span>إرسال تعميم / تنبيه جماعي للمتاجر</span>
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>سيصل هذا الإشعار فوراً في جرس الإشعارات لجميع الموظفين والمدراء المشتركين بكافة المحلات التجارية المسجلة</p>

                <form onSubmit={handleSendBroadcast} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
                  <div className="input-group">
                    <label className="input-label">عنوان التنبيه</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="مثال: تحديث أمني هام، صيانة دورية، تهنئة بالعام الجديد..."
                      value={broadcastTitle}
                      onChange={(e) => setBroadcastTitle(e.target.value)}
                      required
                    />
                  </div>

                  <div className="input-group">
                    <label className="input-label">نوع الإشعار وشدته</label>
                    <select
                      className="input-field"
                      value={broadcastType}
                      onChange={(e) => setBroadcastType(e.target.value as any)}
                    >
                      <option value="info">إرشادي / عام (أزرق)</option>
                      <option value="success">إعلان / تحديث ناجح (أخضر)</option>
                      <option value="warning">تحذير / صيانة مجدولة (أصفر)</option>
                      <option value="danger">عاجل / توقف مؤقت (أحمر)</option>
                    </select>
                  </div>

                  <div className="input-group">
                    <label className="input-label">محتوى التنبيه بالكامل</label>
                    <textarea
                      className="input-field"
                      placeholder="اكتب نص الإشعار هنا بشكل واضح..."
                      value={broadcastMessage}
                      onChange={(e) => setBroadcastMessage(e.target.value)}
                      style={{ minHeight: '120px', resize: 'vertical' }}
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ border: 'none', padding: '0.75rem', fontWeight: 'bold', borderRadius: '10px' }}
                    disabled={isLoadingPlatform}
                  >
                    {isLoadingPlatform ? 'جاري الإرسال جماعياً...' : 'بث التنبيه لجميع المحلات الآن'}
                  </button>
                </form>
              </div>

              <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <h4 style={{ color: 'var(--text-dark)', fontWeight: 'bold' }}>دليل التنبيهات والأجهزة</h4>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.75rem', lineHeight: '1.6' }}>
                  <p>🔔 <strong>نظام إشعارات المتصفح والأجهزة الذكية:</strong></p>
                  <p>تم دمج تقنية Web Push بنجاح مع المنصة السحابية. عند تفعيل المتاجر لخيار استقبال إشعارات سطح المكتب والهاتف، سيصلهم تعميم الإدارة فوراً حتى لو كان التطبيق مغلقاً بالكامل.</p>
                  <p>🛡️ <strong>نصائح للإرسال الجماعي:</strong></p>
                  <ul>
                    <li>تأكد من صياغة الإشعارات بشكل رسمي ومختصر لتفادي إزعاج العملاء.</li>
                    <li>في حالات الصيانة المجدولة، يفضل البث قبل الموعد بـ 12 ساعة على الأقل.</li>
                    <li>تجنب إرسال أي روابط غير آمنة أو ملفات مجهولة.</li>
                  </ul>
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
          backgroundColor: 'rgba(0, 0, 0, 0.45)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backdropFilter: 'blur(10px)'
        }}>
          <div className="card animate-scale-up" onClick={(e) => e.stopPropagation()} style={{
            width: '95%',
            maxWidth: '850px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            padding: '2rem',
            gap: '1.5rem',
            overflow: 'hidden',
            borderRadius: '24px',
            boxShadow: 'var(--shadow-lg)',
            backgroundColor: 'var(--surface)',
            color: 'var(--text)',
            border: '1px solid var(--border)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1.5px solid var(--border)', paddingBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{ padding: '0.5rem', backgroundColor: 'var(--primary-lighter)', color: 'var(--primary)', borderRadius: '8px', display: 'flex' }}>
                  <Shield size={20} />
                </div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '900', color: 'var(--text-dark)' }}>تخصيص صلاحيات المستخدم: <span style={{ color: 'var(--primary)' }}>{permTargetUser.username}</span></h3>
              </div>
              <span className="badge badge-info" style={{ fontWeight: 'bold', fontSize: '0.8rem', padding: '0.3rem 0.6rem', borderRadius: '6px' }}>{permTargetUser.store_name}</span>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', paddingLeft: '0.5rem', paddingRight: '0.5rem', paddingBottom: '0.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.25rem' }}>
                {permissionGroups.map((group, gIdx) => (
                  <div key={gIdx} className="card" style={{ padding: '1.25rem', backgroundColor: 'var(--surface-hover)', border: '1px solid var(--border)', borderRadius: '14px', boxShadow: 'none' }}>
                    <h4 style={{ color: 'var(--primary)', marginBottom: '1rem', borderRight: '4px solid var(--primary)', paddingRight: '0.5rem', fontSize: '0.95rem', fontWeight: '800' }}>{group.title}</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {group.items.map(item => (
                        <label key={item.key} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', fontSize: '0.88rem', userSelect: 'none' }}>
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
                          <span style={{ color: 'var(--text-dark)', fontWeight: '600' }}>{item.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
              <button
                type="button"
                onClick={() => { setShowPermissionsModal(false); setPermTargetUser(null); }}
                className="btn btn-secondary"
                style={{ padding: '0.65rem 1.5rem', borderRadius: '12px', border: '1px solid var(--border)', fontWeight: '700', cursor: 'pointer' }}
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleSavePermissions}
                className="btn btn-primary"
                style={{ border: 'none', padding: '0.65rem 1.5rem', borderRadius: '12px', fontWeight: '800', cursor: 'pointer' }}
                disabled={isLoading}
              >
                {isLoading ? 'جاري الحفظ...' : 'حفظ التعديلات'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD NEW STORE MODAL */}
      {showAddStoreModal && (
        <div className="modal-backdrop" onClick={() => setShowAddStoreModal(false)} style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.45)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)'
        }}>
          <div className="card animate-scale-up" onClick={(e) => e.stopPropagation()} style={{
            width: '95%', maxWidth: '550px', maxHeight: '90vh',
            display: 'flex', flexDirection: 'column', padding: '2rem', gap: '1.5rem',
            overflowY: 'auto', borderRadius: '24px', boxShadow: 'var(--shadow-lg)',
            backgroundColor: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1.5px solid var(--border)', paddingBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{ padding: '0.5rem', backgroundColor: 'var(--primary-lighter)', color: 'var(--primary)', borderRadius: '8px', display: 'flex' }}>
                  <Store size={20} />
                </div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '900', color: 'var(--text-dark)' }}>إضافة متجر جديد ورخصة مبدئية</h3>
              </div>
              <button onClick={() => setShowAddStoreModal(false)} style={{ background: 'var(--background)', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: '0.4rem', borderRadius: '50%', transition: 'all 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text)'} onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddStore} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label" style={{ fontWeight: '700', fontSize: '0.85rem', color: 'var(--text-dark)', marginBottom: '0.4rem' }}>اسم المتجر / البقالة</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="سوبرماركت الرشيد..."
                  value={newStoreName}
                  onChange={(e) => setNewStoreName(e.target.value)}
                  style={{ borderRadius: '10px', border: '1px solid var(--border)', padding: '0.65rem 1rem', width: '100%' }}
                  required
                />
              </div>

              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label" style={{ fontWeight: '700', fontSize: '0.85rem', color: 'var(--text-dark)', marginBottom: '0.4rem' }}>رمز العميل (English Code - فريد)</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="alrasheed"
                  value={newClientCode}
                  onChange={(e) => setNewClientCode(e.target.value)}
                  style={{ borderRadius: '10px', border: '1px solid var(--border)', padding: '0.65rem 1rem', width: '100%' }}
                  required
                />
              </div>

              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label" style={{ fontWeight: '700', fontSize: '0.85rem', color: 'var(--text-dark)', marginBottom: '0.4rem' }}>كلمة مرور حساب المدير الافتراضي (admin)</label>
                <input
                  type="password"
                  className="input-field"
                  placeholder="اكتب كلمة مرور المدير"
                  value={newAdminPassword}
                  onChange={(e) => setNewAdminPassword(e.target.value)}
                  style={{ borderRadius: '10px', border: '1px solid var(--border)', padding: '0.65rem 1rem', width: '100%' }}
                  required
                />
              </div>

              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label" style={{ fontWeight: '700', fontSize: '0.85rem', color: 'var(--text-dark)', marginBottom: '0.4rem' }}>باقة الاشتراك والترخيص</label>
                <select
                  className="input-field"
                  value={newStorePlan}
                  onChange={(e) => setNewStorePlan(e.target.value)}
                  style={{ borderRadius: '10px', border: '1px solid var(--border)', padding: '0.65rem 1rem', width: '100%', backgroundColor: 'var(--surface)' }}
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
                <label className="input-label" style={{ fontWeight: '700', fontSize: '0.85rem', color: 'var(--text-dark)', marginBottom: '0.4rem' }}>الحد الأقصى للمستخدمين</label>
                <input
                  type="number"
                  className="input-field"
                  min={1}
                  max={100}
                  value={maxUsersAllowed}
                  onChange={(e) => setMaxUsersAllowed(parseInt(e.target.value) || 5)}
                  style={{ borderRadius: '10px', border: '1px solid var(--border)', padding: '0.65rem 1rem', width: '100%' }}
                  required
                />
              </div>

              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label" style={{ fontWeight: '700', fontSize: '0.85rem', color: 'var(--text-dark)', marginBottom: '0.4rem' }}>مدة الترخيص المبدئية</label>
                <select
                  className="input-field"
                  value={subscriptionTerm}
                  onChange={(e) => setSubscriptionTerm(e.target.value as any)}
                  style={{ borderRadius: '10px', border: '1px solid var(--border)', padding: '0.65rem 1rem', width: '100%', backgroundColor: 'var(--surface)' }}
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
                  <label className="input-label" style={{ fontWeight: '700', fontSize: '0.85rem', color: 'var(--text-dark)', marginBottom: '0.4rem' }}>المدة المخصصة (بالأيام)</label>
                  <input
                     type="number"
                     className="input-field"
                     min={1}
                     value={customDaysVal}
                     onChange={(e) => setCustomDaysVal(parseInt(e.target.value) || 30)}
                     style={{ borderRadius: '10px', border: '1px solid var(--border)', padding: '0.65rem 1rem', width: '100%' }}
                     required
                  />
                </div>
              )}

              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label" style={{ fontWeight: '700', fontSize: '0.85rem', color: 'var(--text-dark)', marginBottom: '0.4rem' }}>
                  مبلغ الترخيص المعتمد (ر.ي)
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginRight: '0.5rem', fontWeight: '500' }}>
                    (المقترح: {calculateSuggestedPrice(newStorePlan, subscriptionTerm, maxUsersAllowed, customDaysVal).toLocaleString('ar-YE')} ر.ي)
                  </span>
                </label>
                <input
                  type="number"
                  className="input-field"
                  placeholder="اتركه فارغاً للاعتماد التلقائي"
                  value={customPrice}
                  onChange={(e) => setCustomPrice(e.target.value)}
                  style={{ borderRadius: '10px', border: '1px solid var(--border)', padding: '0.65rem 1rem', width: '100%' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem' }}>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 1, padding: '0.75rem', borderRadius: '12px', fontWeight: '800', border: 'none', boxShadow: 'var(--shadow-sm)', cursor: 'pointer' }}
                  disabled={isLoading}
                >
                  {isLoading ? 'جاري التأسيس والإنشاء...' : 'حفظ وإنشاء المتجر'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddStoreModal(false)}
                  className="btn btn-secondary"
                  style={{ padding: '0.75rem 1.5rem', borderRadius: '12px', border: '1px solid var(--border)', fontWeight: '700', cursor: 'pointer' }}
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RENEW / UPGRADE LICENSE MODAL */}
      {showRenewModal && targetRenewStore && (
        <div className="modal-backdrop" onClick={() => { setShowRenewModal(false); setTargetRenewStore(null); }} style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.45)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)'
        }}>
          <div className="card animate-scale-up" onClick={(e) => e.stopPropagation()} style={{
            width: '95%', maxWidth: '550px', maxHeight: '90vh',
            display: 'flex', flexDirection: 'column', padding: '2rem', gap: '1.5rem',
            overflowY: 'auto', borderRadius: '24px', boxShadow: 'var(--shadow-lg)',
            backgroundColor: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1.5px solid var(--border)', paddingBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{ padding: '0.5rem', backgroundColor: 'var(--primary-lighter)', color: 'var(--primary)', borderRadius: '8px', display: 'flex' }}>
                  <Clock size={20} />
                </div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '900', color: 'var(--text-dark)' }}>تجديد وترقية ترخيص المتجر</h3>
              </div>
              <span className="badge badge-info" style={{ fontWeight: 'bold', fontSize: '0.8rem', padding: '0.3rem 0.6rem', borderRadius: '6px' }}>{targetRenewStore.store_name}</span>
            </div>

            <form onSubmit={handleRenewOrUpgrade} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label" style={{ fontWeight: '700', fontSize: '0.85rem', color: 'var(--text-dark)', marginBottom: '0.4rem' }}>باقة الترخيص الجديدة/الحالية</label>
                <select
                  className="input-field"
                  value={renewPlan}
                  onChange={(e) => setRenewPlan(e.target.value)}
                  style={{ borderRadius: '10px', border: '1px solid var(--border)', padding: '0.65rem 1rem', width: '100%', backgroundColor: 'var(--surface)' }}
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
                <label className="input-label" style={{ fontWeight: '700', fontSize: '0.85rem', color: 'var(--text-dark)', marginBottom: '0.4rem' }}>الحد الأقصى للمستخدمين</label>
                <input
                  type="number"
                  className="input-field"
                  min={1}
                  max={100}
                  value={renewMaxUsers}
                  onChange={(e) => setRenewMaxUsers(parseInt(e.target.value) || 5)}
                  style={{ borderRadius: '10px', border: '1px solid var(--border)', padding: '0.65rem 1rem', width: '100%' }}
                  required
                />
              </div>

              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label" style={{ fontWeight: '700', fontSize: '0.85rem', color: 'var(--text-dark)', marginBottom: '0.4rem' }}>مدة التمديد / التجديد</label>
                <select
                  className="input-field"
                  value={renewTerm}
                  onChange={(e) => setRenewTerm(e.target.value as any)}
                  style={{ borderRadius: '10px', border: '1px solid var(--border)', padding: '0.65rem 1rem', width: '100%', backgroundColor: 'var(--surface)' }}
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
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label className="input-label" style={{ fontWeight: '700', fontSize: '0.85rem', color: 'var(--text-dark)', marginBottom: '0.4rem' }}>المدة المخصصة (بالأيام)</label>
                  <input
                    type="number"
                    className="input-field"
                    min={1}
                    value={renewCustomDays}
                    onChange={(e) => setRenewCustomDays(parseInt(e.target.value) || 30)}
                    style={{ borderRadius: '10px', border: '1px solid var(--border)', padding: '0.65rem 1rem', width: '100%' }}
                    required
                  />
                </div>
              )}

              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label" style={{ fontWeight: '700', fontSize: '0.85rem', color: 'var(--text-dark)', marginBottom: '0.4rem' }}>
                  مبلغ التجديد المقبوض (ر.ي)
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginRight: '0.5rem', fontWeight: '500' }}>
                    (المقترح: {calculateSuggestedPrice(renewPlan, renewTerm, renewMaxUsers, renewCustomDays).toLocaleString('ar-YE')} ر.ي)
                  </span>
                </label>
                <input
                  type="number"
                  className="input-field"
                  placeholder="اتركه فارغاً لاعتماد السعر التلقائي"
                  value={renewPricePaid}
                  onChange={(e) => setRenewPricePaid(e.target.value)}
                  style={{ borderRadius: '10px', border: '1px solid var(--border)', padding: '0.65rem 1rem', width: '100%' }}
                />
              </div>

              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label" style={{ fontWeight: '700', fontSize: '0.85rem', color: 'var(--text-dark)', marginBottom: '0.4rem' }}>ملاحظات السداد والتسوية</label>
                <textarea
                  className="input-field"
                  placeholder="مثال: تم السداد نقداً عبر الحساب الكريمي..."
                  value={renewNotes}
                  onChange={(e) => setRenewNotes(e.target.value)}
                  style={{ minHeight: '70px', resize: 'vertical', borderRadius: '10px', border: '1px solid var(--border)', padding: '0.65rem 1rem', width: '100%' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
                <button
                  type="button"
                  onClick={() => { setShowRenewModal(false); setTargetRenewStore(null); }}
                  className="btn btn-secondary"
                  style={{ padding: '0.65rem 1.5rem', borderRadius: '12px', border: '1px solid var(--border)', fontWeight: '700', cursor: 'pointer' }}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ border: 'none', padding: '0.65rem 1.5rem', borderRadius: '12px', fontWeight: '800', boxShadow: 'var(--shadow-sm)', cursor: 'pointer' }}
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
          backgroundColor: 'rgba(0, 0, 0, 0.45)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)'
        }}>
          <div className="card animate-scale-up animate-fade-in" onClick={(e) => e.stopPropagation()} style={{
            width: '95%', maxWidth: '650px', maxHeight: '95vh',
            display: 'flex', flexDirection: 'column', padding: '0',
            overflow: 'hidden', borderRadius: '24px', boxShadow: 'var(--shadow-lg)',
            backgroundColor: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)'
          }}>
            <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', backgroundColor: 'var(--surface-hover)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Receipt size={20} style={{ color: 'var(--primary)' }} />
                <span style={{ fontWeight: '800', color: 'var(--text-dark)' }}>سند قبض رسمي ومستند ترخيص</span>
              </div>
              <div style={{ display: 'flex', gap: '0.65rem' }}>
                <button
                  onClick={() => window.print()}
                  className="btn btn-primary"
                  style={{ border: 'none', padding: '0.65rem 1.25rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: '800', cursor: 'pointer' }}
                >
                  <Printer size={16} />
                  <span>طباعة المستند</span>
                </button>
                <button
                  onClick={() => { setShowInvoiceModal(false); setSelectedPayment(null); }}
                  className="btn btn-secondary"
                  style={{ padding: '0.65rem 1.25rem', borderRadius: '12px', border: '1px solid var(--border)', fontWeight: '700', cursor: 'pointer' }}
                >
                  إغلاق
                </button>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '2rem', backgroundColor: 'var(--surface-hover)' }}>
              <div className="report-print-container" style={{
                border: '2px solid #1e293b', borderRadius: '14px', padding: '2rem',
                backgroundColor: '#ffffff', color: '#0f172a', fontFamily: 'serif', direction: 'rtl',
                textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '1.5rem', boxShadow: 'none'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '3px double #1e293b', paddingBottom: '1rem' }}>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '1.8rem', color: '#0f172a', fontWeight: 'bold' }}>دكّان — DUKKAN</h2>
                    <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: '#475569' }}>نظام محاسبي سحابي متكامل لإدارة المحلات والمتاجر</p>
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <h3 style={{ margin: 0, fontSize: '1.5rem', color: '#0284c7', fontWeight: 'bold' }}>سند قبض رقم: #{selectedPayment.id.replace('pmt_', '')}</h3>
                    <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: '#475569' }}>التاريخ: {new Date(selectedPayment.payment_date).toLocaleDateString('ar-YE')} | {new Date(selectedPayment.payment_date).toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>

                <div style={{ textAlign: 'center', margin: '0.5rem 0' }}>
                  <span style={{ fontSize: '1.4rem', fontWeight: 'bold', borderBottom: '2px solid #1e293b', paddingBottom: '0.25rem' }}>سند قبض اشتراك ترخيص</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '1.1rem', lineHeight: '1.8' }}>
                  <div style={{ display: 'flex', borderBottom: '1px dashed #cbd5e1', paddingBottom: '0.5rem' }}>
                    <span style={{ width: '150px', fontWeight: 'bold', color: '#475569' }}>استلمنا من متجر:</span>
                    <span style={{ fontWeight: 'bold', color: '#0f172a', fontSize: '1.2rem' }}>{tenants.find(t => t.id === selectedPayment.tenant_id)?.store_name || 'متجر غير معروف'}</span>
                  </div>

                  <div style={{ display: 'flex', borderBottom: '1px dashed #cbd5e1', paddingBottom: '0.5rem' }}>
                    <span style={{ width: '150px', fontWeight: 'bold', color: '#475569' }}>مبلغاً وقدره:</span>
                    <span style={{ fontWeight: 'bold', color: '#0284c7', fontSize: '1.2rem' }}>{selectedPayment.amount.toLocaleString('ar-YE')} ر.ي</span>
                    <span style={{ marginRight: '1rem', fontStyle: 'italic', color: '#64748b' }}>(فقط {convertNumberToArabicWords(selectedPayment.amount)} ريال يمني لا غير)</span>
                  </div>

                  <div style={{ display: 'flex', borderBottom: '1px dashed #cbd5e1', paddingBottom: '0.5rem' }}>
                    <span style={{ width: '150px', fontWeight: 'bold', color: '#475569' }}>وذلك مقابل:</span>
                    <span>
                      {selectedPayment.payment_type === 'initial_setup' ? 'رسوم التأسيس المبدئي وتفعيل الترخيص' :
                       selectedPayment.payment_type === 'renewal' ? 'رسوم تجديد الترخيص السحابي' :
                       selectedPayment.payment_type === 'upgrade' ? 'رسوم ترقية الباقة والمستخدمين' : 'رسوم تسوية وتعديل الاشتراك'}
                      {' - '}
                      <strong>{getPlanNameAr(selectedPayment.license_plan)}</strong>
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', borderBottom: '1px dashed #cbd5e1', paddingBottom: '0.5rem' }}>
                    <div style={{ display: 'flex' }}>
                      <span style={{ width: '150px', fontWeight: 'bold', color: '#475569' }}>المدة المرخصة:</span>
                      <span style={{ fontWeight: 'bold' }}>{selectedPayment.duration_days} يوم</span>
                    </div>
                    <div style={{ display: 'flex' }}>
                      <span style={{ width: '150px', fontWeight: 'bold', color: '#475569' }}>المستخدمين المتاحين:</span>
                      <span style={{ fontWeight: 'bold' }}>{selectedPayment.max_users} مستخدمين كحد أقصى</span>
                    </div>
                  </div>

                  {selectedPayment.notes && (
                    <div style={{ display: 'flex', borderBottom: '1px dashed #cbd5e1', paddingBottom: '0.5rem' }}>
                      <span style={{ width: '150px', fontWeight: 'bold', color: '#475569' }}>ملاحظات:</span>
                      <span style={{ color: '#475569' }}>{selectedPayment.notes}</span>
                    </div>
                  )}

                  <div style={{ display: 'flex' }}>
                    <span style={{ width: '150px', fontWeight: 'bold', color: '#475569' }}>حالة الترخيص:</span>
                    <span style={{ color: '#16a34a', fontWeight: 'bold' }}>نشط ومفعل لدى إدارة النظام</span>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3rem', borderTop: '1px solid #e2e8f0', paddingTop: '1.5rem' }}>
                  <div style={{ textAlign: 'center', width: '200px' }}>
                    <p style={{ margin: 0, fontWeight: 'bold', color: '#475569' }}>توقيع المستلم (إدارة دكّان)</p>
                    <div style={{ height: '60px' }}></div>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: '#64748b' }}>توقيع إلكتروني معتمد</p>
                  </div>
                  <div style={{ textAlign: 'center', width: '200px' }}>
                    <p style={{ margin: 0, fontWeight: 'bold', color: '#475569' }}>ختم الإدارة العامة</p>
                    <div style={{ height: '60px' }}></div>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: '#64748b' }}>DUKKAN SaaS</p>
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
          backgroundColor: 'rgba(0, 0, 0, 0.45)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)'
        }}>
          <div className="card animate-scale-up animate-fade-in" onClick={(e) => e.stopPropagation()} style={{
            width: '95%', maxWidth: '850px', maxHeight: '95vh',
            display: 'flex', flexDirection: 'column', padding: '0',
            overflow: 'hidden', borderRadius: '24px', boxShadow: 'var(--shadow-lg)',
            backgroundColor: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)'
          }}>
            <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', backgroundColor: 'var(--surface-hover)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileText size={20} style={{ color: 'var(--primary)' }} />
                <span style={{ fontWeight: '800', color: 'var(--text-dark)' }}>كشف حساب المبيعات والاشتراكات للمتجر</span>
              </div>
              <div style={{ display: 'flex', gap: '0.65rem' }}>
                <button
                  onClick={exportStatementToPDF}
                  className="btn btn-primary"
                  style={{ border: 'none', padding: '0.65rem 1.25rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: '800', cursor: 'pointer' }}
                  disabled={isLoading}
                >
                  <FileText size={16} />
                  <span>{isLoading ? 'جاري التصدير...' : 'تصدير كشف الحساب (PDF)'}</span>
                </button>
                <button
                  onClick={() => { setShowStatementModal(false); setStatementStore(null); }}
                  className="btn btn-secondary"
                  style={{ padding: '0.65rem 1.25rem', borderRadius: '12px', border: '1px solid var(--border)', fontWeight: '700', cursor: 'pointer' }}
                >
                  إغلاق
                </button>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '2rem', backgroundColor: 'var(--surface-hover)' }}>
              {/* Screen paper container wrapper */}
              <div style={{
                maxWidth: '790px',
                margin: '0 auto',
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05)'
              }}>
                <div id="printableStatement" className="report-print-container" style={{
                  backgroundColor: '#ffffff', color: '#000000', direction: 'rtl',
                  textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '1.5rem',
                  padding: '2.5rem', position: 'relative'
                }}>
                  {/* Brand Accent Bar */}
                  <div className="no-print" style={{
                    position: 'absolute', top: 0, left: 0, right: 0, height: '6px',
                    backgroundColor: 'var(--primary)', borderTopLeftRadius: '16px', borderTopRightRadius: '16px'
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
                    borderRadius: '12px', padding: '1.25rem'
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
                      <span style={{ fontSize: '0.95rem', color: '#0284c7', fontWeight: '700' }}>{getPlanNameAr(statementStore.license_plan)}</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                      <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600' }}>انتهاء الترخيص</span>
                      <span style={{ fontSize: '0.95rem', color: '#ef4444', fontWeight: '700' }}>{new Date(statementStore.subscription_expires_at).toLocaleDateString('ar-YE')}</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                      <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600' }}>حالة المتجر</span>
                      <div style={{ marginTop: '0.1rem' }}>
                        <span className={`badge ${statementStore.status === 'active' ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', borderRadius: '6px' }}>
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
                              }`} style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', borderRadius: '6px' }}>
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
          backgroundColor: 'rgba(0, 0, 0, 0.45)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)'
        }}>
          <div className="card animate-scale-up" onClick={(e) => e.stopPropagation()} style={{
            width: '95%', maxWidth: '480px', padding: '2rem', gap: '1.5rem',
            borderRadius: '24px', boxShadow: 'var(--shadow-lg)', borderTop: '6px solid var(--danger)',
            backgroundColor: 'var(--surface)', color: 'var(--text)', borderLeft: '1px solid var(--border)', borderRight: '1px solid var(--border)', borderBottom: '1px solid var(--border)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1.5px solid var(--border)', paddingBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{ padding: '0.5rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', borderRadius: '8px', display: 'flex' }}>
                  <Trash2 size={20} />
                </div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '900', color: 'var(--danger)' }}>حذف المتجر نهائياً</h3>
              </div>
              <span className="badge badge-danger" style={{ fontWeight: 'bold', fontSize: '0.8rem', padding: '0.3rem 0.6rem', borderRadius: '6px' }}>{targetDeleteStore.store_name}</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{
                backgroundColor: 'rgba(239, 68, 68, 0.06)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                borderRadius: '12px',
                padding: '1rem',
                fontSize: '0.88rem',
                color: 'var(--danger)',
                lineHeight: '1.6'
              }}>
                <strong>⚠️ تنبيه هام جداً:</strong>
                <p style={{ margin: '0.35rem 0 0 0', fontWeight: '500' }}>
                  هذا الإجراء سيقوم بحذف متجر <strong>{targetDeleteStore.store_name}</strong> وكل البيانات التابعة له بشكل نهائي وغير قابل للاسترداد.
                  يشمل ذلك: حسابات المستخدمين والموظفين، قائمة المنتجات، حركات المخازن، سجلات المبيعات، الفواتير، الديون والمدفوعات.
                </p>
              </div>

              <div className="input-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: 0 }}>
                <label className="input-label" style={{ fontWeight: '700', fontSize: '0.85rem', color: 'var(--text-dark)' }}>
                  لتأكيد الحذف النهائي، يرجى كتابة رمز المتجر <strong style={{ color: 'var(--danger)' }}>({targetDeleteStore.client_code})</strong> أدناه:
                </label>
                <input
                  type="text"
                  style={{
                    border: deleteConfirmText === targetDeleteStore.client_code ? '1.5px solid var(--success)' : '1.5px solid var(--border)',
                    textAlign: 'center', fontWeight: 'bold', letterSpacing: '1.5px', width: '100%',
                    padding: '0.75rem 1rem', borderRadius: '12px', outline: 'none', backgroundColor: 'var(--surface-hover)',
                    color: 'var(--text)', transition: 'all 0.2s ease'
                  }}
                  placeholder={targetDeleteStore.client_code}
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
                <button
                  onClick={() => { setShowDeleteModal(false); setTargetDeleteStore(null); setDeleteConfirmText(''); }}
                  className="btn btn-secondary"
                  style={{ padding: '0.65rem 1.25rem', borderRadius: '12px', border: '1px solid var(--border)', cursor: 'pointer', fontWeight: '700' }}
                  disabled={isLoading}
                >
                  إلغاء
                </button>
                <button
                  onClick={handleDeleteStoreConfirm}
                  className="btn btn-danger"
                  style={{
                    flex: 1, padding: '0.65rem 1.25rem', borderRadius: '12px', fontWeight: '800', border: 'none',
                    cursor: deleteConfirmText === targetDeleteStore.client_code ? 'pointer' : 'not-allowed',
                    backgroundColor: deleteConfirmText === targetDeleteStore.client_code ? 'var(--danger)' : '#fca5a5',
                    color: '#ffffff', transition: 'all 0.2s ease'
                  }}
                  disabled={deleteConfirmText !== targetDeleteStore.client_code || isLoading}
                >
                  {isLoading ? 'جاري الحذف...' : 'نعم، احذف المتجر والبيانات'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== CHANGE ADMIN PASSWORD MODAL ===== */}
      {showChangePasswordModal && (
        <div className="modal-backdrop" onClick={() => { setShowChangePasswordModal(false); setCurrentPasswordInput(''); setNewPasswordInput(''); setConfirmPasswordInput(''); setError(null); }} style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.45)', zIndex: 1100,
          display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)'
        }}>
          <div className="card animate-scale-up" onClick={(e) => e.stopPropagation()} style={{
            width: '100%', maxWidth: '440px', padding: '2rem', borderRadius: '24px',
            display: 'flex', flexDirection: 'column', gap: '1.5rem', boxShadow: 'var(--shadow-lg)',
            backgroundColor: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1.5px solid var(--border)', paddingBottom: '1rem' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', margin: 0, fontSize: '1.25rem', fontWeight: '900', color: 'var(--text-dark)' }}>
                <div style={{ padding: '0.5rem', backgroundColor: 'var(--primary-lighter)', color: 'var(--primary)', borderRadius: '8px', display: 'flex' }}>
                  <KeyRound size={20} />
                </div>
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
              <div style={{
                backgroundColor: 'rgba(239, 68, 68, 0.06)', borderRight: '4px solid var(--danger)',
                color: 'var(--danger)', padding: '0.75rem 1rem', borderRadius: '12px', fontSize: '0.88rem', fontWeight: '600'
              }}>{error}</div>
            )}

            <form onSubmit={handleChangeAdminPassword} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label" style={{ fontWeight: '700', fontSize: '0.85rem', color: 'var(--text-dark)', marginBottom: '0.4rem' }}>كلمة المرور الحالية</label>
                <input
                  type="password"
                  placeholder="أدخل كلمة المرور الحالية"
                  value={currentPasswordInput}
                  onChange={(e) => setCurrentPasswordInput(e.target.value)}
                  style={{
                    borderRadius: '12px', border: '1.5px solid var(--border)', padding: '0.75rem 1rem',
                    width: '100%', backgroundColor: 'var(--surface-hover)', color: 'var(--text)', outline: 'none'
                  }}
                  required
                  disabled={isLoading}
                />
              </div>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label" style={{ fontWeight: '700', fontSize: '0.85rem', color: 'var(--text-dark)', marginBottom: '0.4rem' }}>كلمة المرور الجديدة</label>
                <input
                  type="password"
                  placeholder="6 أحرف على الأقل"
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                  style={{
                    borderRadius: '12px', border: '1.5px solid var(--border)', padding: '0.75rem 1rem',
                    width: '100%', backgroundColor: 'var(--surface-hover)', color: 'var(--text)', outline: 'none'
                  }}
                  required
                  disabled={isLoading}
                />
              </div>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label" style={{ fontWeight: '700', fontSize: '0.85rem', color: 'var(--text-dark)', marginBottom: '0.4rem' }}>تأكيد كلمة المرور الجديدة</label>
                <input
                  type="password"
                  style={{
                    borderRadius: '12px',
                    border: confirmPasswordInput && confirmPasswordInput === newPasswordInput ? '1.5px solid var(--success)' : '1.5px solid var(--border)',
                    padding: '0.75rem 1rem', width: '100%', backgroundColor: 'var(--surface-hover)', color: 'var(--text)', outline: 'none'
                  }}
                  placeholder="أعد كتابة كلمة المرور الجديدة"
                  value={confirmPasswordInput}
                  onChange={(e) => setConfirmPasswordInput(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
                <button
                  type="button"
                  onClick={() => { setShowChangePasswordModal(false); setCurrentPasswordInput(''); setNewPasswordInput(''); setConfirmPasswordInput(''); setError(null); }}
                  className="btn btn-secondary"
                  style={{ padding: '0.75rem 1.5rem', borderRadius: '12px', border: '1px solid var(--border)', fontWeight: '700', cursor: 'pointer' }}
                  disabled={isLoading}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 1, padding: '0.75rem 1.5rem', borderRadius: '12px', fontWeight: '800', border: 'none', cursor: 'pointer' }}
                  disabled={isLoading}
                >
                  {isLoading ? 'جاري الحفظ...' : 'حفظ كلمة المرور الجديدة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE INVOICE MODAL */}
      {showCreateInvoiceModal && (
        <div className="modal-backdrop" onClick={() => setShowCreateInvoiceModal(false)} style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.45)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)'
        }}>
          <div className="card animate-scale-up" onClick={(e) => e.stopPropagation()} style={{
            width: '95%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto',
            padding: '2rem', gap: '1.5rem', borderRadius: '24px', boxShadow: 'var(--shadow-lg)',
            backgroundColor: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1.5px solid var(--border)', paddingBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{ padding: '0.5rem', backgroundColor: 'var(--primary-lighter)', color: 'var(--primary)', borderRadius: '8px', display: 'flex' }}>
                  <Receipt size={20} />
                </div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '900', color: 'var(--text-dark)' }}>إصدار فاتورة ترخيص جديدة</h3>
              </div>
              <button onClick={() => setShowCreateInvoiceModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateInvoice} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label" style={{ fontWeight: '700', fontSize: '0.85rem', color: 'var(--text-dark)', marginBottom: '0.4rem' }}>المتجر المستهدف</label>
                <select
                  value={newInvoiceStoreId}
                  onChange={(e) => setNewInvoiceStoreId(e.target.value)}
                  style={{
                    borderRadius: '12px', border: '1.5px solid var(--border)', padding: '0.75rem 1rem',
                    width: '100%', backgroundColor: 'var(--surface-hover)', color: 'var(--text)', outline: 'none'
                  }}
                  required
                >
                  <option value="" style={{ backgroundColor: 'var(--surface)' }}>-- اختر المتجر --</option>
                  {tenants.filter(t => t.id !== '0').map(t => (
                    <option key={t.id} value={t.id} style={{ backgroundColor: 'var(--surface)' }}>{t.store_name} ({t.client_code})</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label className="input-label" style={{ fontWeight: '700', fontSize: '0.85rem', color: 'var(--text-dark)', marginBottom: '0.4rem' }}>الباقة المطلوبة</label>
                  <select
                    value={newInvoicePlan}
                    onChange={(e) => setNewInvoicePlan(e.target.value)}
                    style={{
                      borderRadius: '12px', border: '1.5px solid var(--border)', padding: '0.75rem 1rem',
                      width: '100%', backgroundColor: 'var(--surface-hover)', color: 'var(--text)', outline: 'none'
                    }}
                  >
                    <option value="1_inventory" style={{ backgroundColor: 'var(--surface)' }}>باقة المخزون</option>
                    <option value="2_sales" style={{ backgroundColor: 'var(--surface)' }}>باقة المبيعات</option>
                    <option value="3_standard" style={{ backgroundColor: 'var(--surface)' }}>الباقة القياسية</option>
                    <option value="4_business" style={{ backgroundColor: 'var(--surface)' }}>باقة الأعمال</option>
                    <option value="5_pro" style={{ backgroundColor: 'var(--surface)' }}>الباقة الاحترافية</option>
                    <option value="6_gold" style={{ backgroundColor: 'var(--surface)' }}>الباقة الذهبية</option>
                  </select>
                </div>

                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label className="input-label" style={{ fontWeight: '700', fontSize: '0.85rem', color: 'var(--text-dark)', marginBottom: '0.4rem' }}>مدة الترخيص</label>
                  <select
                    value={newInvoiceTerm}
                    onChange={(e) => setNewInvoiceTerm(e.target.value as any)}
                    style={{
                      borderRadius: '12px', border: '1.5px solid var(--border)', padding: '0.75rem 1rem',
                      width: '100%', backgroundColor: 'var(--surface-hover)', color: 'var(--text)', outline: 'none'
                    }}
                  >
                    <option value="30" style={{ backgroundColor: 'var(--surface)' }}>30 يوم (شهر)</option>
                    <option value="90" style={{ backgroundColor: 'var(--surface)' }}>90 يوم (3 أشهر)</option>
                    <option value="180" style={{ backgroundColor: 'var(--surface)' }}>180 يوم (6 أشهر)</option>
                    <option value="365" style={{ backgroundColor: 'var(--surface)' }}>365 يوم (سنة)</option>
                    <option value="custom" style={{ backgroundColor: 'var(--surface)' }}>مدة مخصصة</option>
                  </select>
                </div>
              </div>

              {newInvoiceTerm === 'custom' && (
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label className="input-label" style={{ fontWeight: '700', fontSize: '0.85rem', color: 'var(--text-dark)', marginBottom: '0.4rem' }}>عدد الأيام المخصصة</label>
                  <input
                    type="number"
                    min={1}
                    value={newInvoiceCustomDays}
                    onChange={(e) => setNewInvoiceCustomDays(parseInt(e.target.value) || 30)}
                    style={{
                      borderRadius: '12px', border: '1.5px solid var(--border)', padding: '0.75rem 1rem',
                      width: '100%', backgroundColor: 'var(--surface-hover)', color: 'var(--text)', outline: 'none'
                    }}
                    required
                  />
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label className="input-label" style={{ fontWeight: '700', fontSize: '0.85rem', color: 'var(--text-dark)', marginBottom: '0.4rem' }}>أقصى عدد مستخدمين</label>
                  <input
                    type="number"
                    min={1}
                    value={newInvoiceMaxUsers}
                    onChange={(e) => setNewInvoiceMaxUsers(parseInt(e.target.value) || 5)}
                    style={{
                      borderRadius: '12px', border: '1.5px solid var(--border)', padding: '0.75rem 1rem',
                      width: '100%', backgroundColor: 'var(--surface-hover)', color: 'var(--text)', outline: 'none'
                    }}
                    required
                  />
                </div>

                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label className="input-label" style={{ fontWeight: '700', fontSize: '0.85rem', color: 'var(--text-dark)', marginBottom: '0.4rem' }}>المبلغ الإجمالي (ر.ي)</label>
                  <input
                    type="number"
                    min={0}
                    placeholder="مثال: 50000"
                    value={newInvoiceAmount}
                    onChange={(e) => setNewInvoiceAmount(e.target.value)}
                    style={{
                      borderRadius: '12px', border: '1.5px solid var(--border)', padding: '0.75rem 1rem',
                      width: '100%', backgroundColor: 'var(--surface-hover)', color: 'var(--text)', outline: 'none'
                    }}
                    required
                  />
                </div>
              </div>

              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label" style={{ fontWeight: '700', fontSize: '0.85rem', color: 'var(--text-dark)', marginBottom: '0.4rem' }}>كوبون الخصم (اختياري)</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    placeholder="مثال: SAVE30، DUKKAN2026"
                    value={newInvoiceCoupon}
                    onChange={(e) => setNewInvoiceCoupon(e.target.value.toUpperCase())}
                    style={{
                      textTransform: 'uppercase', borderRadius: '12px', border: '1.5px solid var(--border)',
                      padding: '0.75rem 1rem', flex: 1, backgroundColor: 'var(--surface-hover)', color: 'var(--text)',
                      outline: 'none', fontWeight: 'bold'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => handleApplyInvoiceCoupon(newInvoiceCoupon)}
                    className="btn btn-secondary"
                    style={{ whiteSpace: 'nowrap', padding: '0 1.25rem', borderRadius: '12px', fontWeight: 'bold', border: '1px solid var(--border)', cursor: 'pointer' }}
                  >
                    تطبيق
                  </button>
                </div>
                {newInvoiceDiscountCalculated > 0 && (
                  <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.78rem', color: 'var(--success)', fontWeight: 'bold' }}>
                    تم تطبيق الخصم: {newInvoiceDiscountCalculated.toLocaleString('ar-YE')} ر.ي
                  </p>
                )}
              </div>

              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label" style={{ fontWeight: '700', fontSize: '0.85rem', color: 'var(--text-dark)', marginBottom: '0.4rem' }}>ملاحظات الفاتورة</label>
                <textarea
                  placeholder="ملاحظات تظهر للمتجر في الفاتورة..."
                  value={newInvoiceNotes}
                  onChange={(e) => setNewInvoiceNotes(e.target.value)}
                  style={{
                    minHeight: '60px', resize: 'vertical', borderRadius: '12px', border: '1.5px solid var(--border)',
                    padding: '0.75rem 1rem', width: '100%', backgroundColor: 'var(--surface-hover)', color: 'var(--text)', outline: 'none'
                  }}
                />
              </div>

              {newInvoiceAmount && (
                <div style={{
                  padding: '0.85rem 1.25rem', backgroundColor: 'rgba(22, 163, 74, 0.08)', border: '1.5px solid rgba(22, 163, 74, 0.25)',
                  borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                  <span style={{ fontSize: '0.88rem', fontWeight: '800', color: 'var(--success)' }}>الصافي بعد الخصم:</span>
                  <span style={{ fontSize: '1.2rem', fontWeight: '900', color: 'var(--success)' }}>
                    {Math.max(0, (parseFloat(newInvoiceAmount) || 0) - newInvoiceDiscountCalculated).toLocaleString('ar-YE')} ر.ي
                  </span>
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateInvoiceModal(false)}
                  className="btn btn-secondary"
                  style={{ padding: '0.75rem 1.5rem', borderRadius: '12px', border: '1px solid var(--border)', fontWeight: '700', cursor: 'pointer' }}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 1, padding: '0.75rem 1.5rem', borderRadius: '12px', fontWeight: '800', border: 'none', cursor: 'pointer' }}
                  disabled={isLoadingPlatform}
                >
                  {isLoadingPlatform ? 'جاري الإصدار...' : 'إصدار الفاتورة والمطالبة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PAY INVOICE MODAL */}
      {showPayInvoiceModal && payingInvoice && (
        <div className="modal-backdrop" onClick={() => { setShowPayInvoiceModal(false); setPayingInvoice(null); }} style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.45)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)'
        }}>
          <div className="card animate-scale-up" onClick={(e) => e.stopPropagation()} style={{
            width: '95%', maxWidth: '460px', padding: '2rem', gap: '1.5rem',
            borderRadius: '24px', boxShadow: 'var(--shadow-lg)',
            backgroundColor: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1.5px solid var(--border)', paddingBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{ padding: '0.5rem', backgroundColor: 'var(--primary-lighter)', color: 'var(--primary)', borderRadius: '8px', display: 'flex' }}>
                  <CreditCard size={20} />
                </div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '900', color: 'var(--text-dark)' }}>تسجيل عملية سداد فاتورة</h3>
              </div>
              <button onClick={() => { setShowPayInvoiceModal(false); setPayingInvoice(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{
              backgroundColor: 'var(--surface-hover)', padding: '1rem 1.25rem', borderRadius: '14px',
              fontSize: '0.88rem', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '0.5rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: '600', color: 'var(--text-muted)' }}>رقم الفاتورة:</span>
                <strong style={{ fontFamily: 'monospace', color: 'var(--text-dark)' }}>#{payingInvoice.invoice_number}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: '600', color: 'var(--text-muted)' }}>المتجر:</span>
                <strong style={{ color: 'var(--text-dark)' }}>{tenants.find(t => t.id === payingInvoice.tenant_id)?.store_name || '---'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed var(--border)', paddingTop: '0.5rem', marginTop: '0.25rem' }}>
                <span style={{ fontWeight: '700', color: 'var(--text-dark)' }}>المبلغ المطلوب سداده:</span>
                <strong style={{ color: 'var(--primary)', fontSize: '1.1rem', fontWeight: '900' }}>{payingInvoice.final_total.toLocaleString('ar-YE')} ر.ي</strong>
              </div>
            </div>

            <form onSubmit={handlePayInvoice} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label" style={{ fontWeight: '700', fontSize: '0.85rem', color: 'var(--text-dark)', marginBottom: '0.4rem' }}>طريقة السداد المستلمة</label>
                <select
                  value={payInvoiceMethod}
                  onChange={(e) => setPayInvoiceMethod(e.target.value)}
                  style={{
                    borderRadius: '12px', border: '1.5px solid var(--border)', padding: '0.75rem 1rem',
                    width: '100%', backgroundColor: 'var(--surface-hover)', color: 'var(--text)', outline: 'none'
                  }}
                  required
                >
                  <option value="" style={{ backgroundColor: 'var(--surface)' }}>-- اختر طريقة السداد --</option>
                  {paymentMethods.filter(pm => pm.is_active).map(pm => (
                    <option key={pm.id} value={pm.name} style={{ backgroundColor: 'var(--surface)' }}>{pm.name}</option>
                  ))}
                  <option value="نقداً" style={{ backgroundColor: 'var(--surface)' }}>نقداً (كاش)</option>
                  <option value="أخرى" style={{ backgroundColor: 'var(--surface)' }}>أخرى / تحويل مباشر</option>
                </select>
              </div>

              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label" style={{ fontWeight: '700', fontSize: '0.85rem', color: 'var(--text-dark)', marginBottom: '0.4rem' }}>ملاحظات السداد والقبض</label>
                <textarea
                  placeholder="مثال: تم الاستلام عبر حساب كريمي، رقم الحوالة 12345..."
                  value={payInvoiceNotes}
                  onChange={(e) => setPayInvoiceNotes(e.target.value)}
                  style={{
                    minHeight: '80px', resize: 'vertical', borderRadius: '12px', border: '1.5px solid var(--border)',
                    padding: '0.75rem 1rem', width: '100%', backgroundColor: 'var(--surface-hover)', color: 'var(--text)', outline: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
                <button
                  type="button"
                  onClick={() => { setShowPayInvoiceModal(false); setPayingInvoice(null); }}
                  className="btn btn-secondary"
                  style={{ padding: '0.75rem 1.5rem', borderRadius: '12px', border: '1px solid var(--border)', fontWeight: '700', cursor: 'pointer' }}
                  disabled={isLoadingPlatform}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 1, padding: '0.75rem 1.5rem', borderRadius: '12px', fontWeight: '800', border: 'none', cursor: 'pointer' }}
                  disabled={isLoadingPlatform}
                >
                  {isLoadingPlatform ? 'جاري الحفظ...' : 'تأكيد السداد وتمديد الترخيص'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE COUPON MODAL */}
      {showCreateCouponModal && (
        <div className="modal-backdrop" onClick={() => setShowCreateCouponModal(false)} style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.45)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)'
        }}>
          <div className="card animate-scale-up" onClick={(e) => e.stopPropagation()} style={{
            width: '95%', maxWidth: '440px', padding: '2rem', gap: '1.5rem',
            borderRadius: '24px', boxShadow: 'var(--shadow-lg)',
            backgroundColor: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1.5px solid var(--border)', paddingBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{ padding: '0.5rem', backgroundColor: 'var(--primary-lighter)', color: 'var(--primary)', borderRadius: '8px', display: 'flex' }}>
                  <Tag size={20} />
                </div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '900', color: 'var(--text-dark)' }}>إنشاء كوبون خصم جديد</h3>
              </div>
              <button onClick={() => setShowCreateCouponModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateCoupon} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label" style={{ fontWeight: '700', fontSize: '0.85rem', color: 'var(--text-dark)', marginBottom: '0.4rem' }}>رمز الكوبون</label>
                <input
                  type="text"
                  placeholder="مثال: SAVE30، DUKKAN2026"
                  value={newCouponCode}
                  onChange={(e) => setNewCouponCode(e.target.value.toUpperCase())}
                  style={{
                    textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '1.5px',
                    borderRadius: '12px', border: '1.5px solid var(--border)', padding: '0.75rem 1rem',
                    width: '100%', backgroundColor: 'var(--surface-hover)', color: 'var(--text)', outline: 'none'
                  }}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label className="input-label" style={{ fontWeight: '700', fontSize: '0.85rem', color: 'var(--text-dark)', marginBottom: '0.4rem' }}>نوع الخصم</label>
                  <select
                    value={newCouponType}
                    onChange={(e) => setNewCouponType(e.target.value as any)}
                    style={{
                      borderRadius: '12px', border: '1.5px solid var(--border)', padding: '0.75rem 1rem',
                      width: '100%', backgroundColor: 'var(--surface-hover)', color: 'var(--text)', outline: 'none'
                    }}
                  >
                    <option value="percent" style={{ backgroundColor: 'var(--surface)' }}>نسبة مئوية (%)</option>
                    <option value="fixed" style={{ backgroundColor: 'var(--surface)' }}>مبلغ ثابت (ر.ي)</option>
                  </select>
                </div>

                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label className="input-label" style={{ fontWeight: '700', fontSize: '0.85rem', color: 'var(--text-dark)', marginBottom: '0.4rem' }}>قيمة الخصم</label>
                  <input
                    type="number"
                    min={0}
                    value={newCouponValue}
                    onChange={(e) => setNewCouponValue(parseFloat(e.target.value) || 0)}
                    style={{
                      borderRadius: '12px', border: '1.5px solid var(--border)', padding: '0.75rem 1rem',
                      width: '100%', backgroundColor: 'var(--surface-hover)', color: 'var(--text)', outline: 'none'
                    }}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label className="input-label" style={{ fontWeight: '700', fontSize: '0.85rem', color: 'var(--text-dark)', marginBottom: '0.4rem' }}>تاريخ انتهاء الصلاحية</label>
                  <input
                    type="date"
                    value={newCouponExpires}
                    onChange={(e) => setNewCouponExpires(e.target.value)}
                    style={{
                      borderRadius: '12px', border: '1.5px solid var(--border)', padding: '0.75rem 1rem',
                      width: '100%', backgroundColor: 'var(--surface-hover)', color: 'var(--text)', outline: 'none'
                    }}
                    required
                  />
                </div>

                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label className="input-label" style={{ fontWeight: '700', fontSize: '0.85rem', color: 'var(--text-dark)', marginBottom: '0.4rem' }}>أقصى حد للاستخدام</label>
                  <input
                    type="number"
                    min={1}
                    value={newCouponMaxUses}
                    onChange={(e) => setNewCouponMaxUses(parseInt(e.target.value) || 100)}
                    style={{
                      borderRadius: '12px', border: '1.5px solid var(--border)', padding: '0.75rem 1rem',
                      width: '100%', backgroundColor: 'var(--surface-hover)', color: 'var(--text)', outline: 'none'
                    }}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateCouponModal(false)}
                  className="btn btn-secondary"
                  style={{ padding: '0.75rem 1.5rem', borderRadius: '12px', border: '1px solid var(--border)', fontWeight: '700', cursor: 'pointer' }}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 1, padding: '0.75rem 1.5rem', borderRadius: '12px', fontWeight: '800', border: 'none', cursor: 'pointer' }}
                  disabled={isLoadingPlatform}
                >
                  {isLoadingPlatform ? 'جاري الإنشاء...' : 'إنشاء وتفعيل الكوبون'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE PAYMENT METHOD MODAL */}
      {showCreatePMethodModal && (
        <div className="modal-backdrop" onClick={() => setShowCreatePMethodModal(false)} style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.45)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)'
        }}>
          <div className="card animate-scale-up" onClick={(e) => e.stopPropagation()} style={{
            width: '95%', maxWidth: '460px', padding: '2rem', gap: '1.5rem',
            borderRadius: '24px', boxShadow: 'var(--shadow-lg)',
            backgroundColor: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1.5px solid var(--border)', paddingBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{ padding: '0.5rem', backgroundColor: 'var(--primary-lighter)', color: 'var(--primary)', borderRadius: '8px', display: 'flex' }}>
                  <CreditCard size={20} />
                </div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '900', color: 'var(--text-dark)' }}>إضافة طريقة سداد جديدة</h3>
              </div>
              <button onClick={() => setShowCreatePMethodModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreatePMethod} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label" style={{ fontWeight: '700', fontSize: '0.85rem', color: 'var(--text-dark)', marginBottom: '0.4rem' }}>اسم طريقة السداد</label>
                <input
                  type="text"
                  placeholder="مثال: حساب بنك الكريمي، محفظة جوالي..."
                  value={newPMethodName}
                  onChange={(e) => setNewPMethodName(e.target.value)}
                  style={{
                    borderRadius: '12px', border: '1.5px solid var(--border)', padding: '0.75rem 1rem',
                    width: '100%', backgroundColor: 'var(--surface-hover)', color: 'var(--text)', outline: 'none'
                  }}
                  required
                />
              </div>

              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label" style={{ fontWeight: '700', fontSize: '0.85rem', color: 'var(--text-dark)', marginBottom: '0.4rem' }}>تفاصيل وإرشادات التحويل</label>
                <textarea
                  placeholder="اكتب رقم الحساب، اسم المستفيد الكامل، وأي تفاصيل مطلوبة..."
                  value={newPMethodDetails}
                  onChange={(e) => setNewPMethodDetails(e.target.value)}
                  style={{
                    minHeight: '120px', resize: 'vertical', borderRadius: '12px', border: '1.5px solid var(--border)',
                    padding: '0.75rem 1rem', width: '100%', backgroundColor: 'var(--surface-hover)', color: 'var(--text)', outline: 'none'
                  }}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
                <button
                  type="button"
                  onClick={() => setShowCreatePMethodModal(false)}
                  className="btn btn-secondary"
                  style={{ padding: '0.75rem 1.5rem', borderRadius: '12px', border: '1px solid var(--border)', fontWeight: '700', cursor: 'pointer' }}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 1, padding: '0.75rem 1.5rem', borderRadius: '12px', fontWeight: '800', border: 'none', cursor: 'pointer' }}
                  disabled={isLoadingPlatform}
                >
                  {isLoadingPlatform ? 'جاري الإضافة...' : 'حفظ وطرح للمتاجر'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW TICKET DETAILS MODAL */}
      {showTicketModal && selectedTicket && (
        <div className="modal-backdrop" onClick={() => { setShowTicketModal(false); setSelectedTicket(null); }} style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.45)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)'
        }}>
          <div className="card animate-scale-up" onClick={(e) => e.stopPropagation()} style={{
            width: '95%', maxWidth: '560px', padding: '2rem', gap: '1.5rem',
            borderRadius: '24px', boxShadow: 'var(--shadow-lg)',
            backgroundColor: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1.5px solid var(--border)', paddingBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{ padding: '0.5rem', backgroundColor: 'var(--primary-lighter)', color: 'var(--primary)', borderRadius: '8px', display: 'flex' }}>
                  <LifeBuoy size={20} />
                </div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '900', color: 'var(--text-dark)' }}>مراجعة والرد على تذكرة دعم</h3>
              </div>
              <button onClick={() => { setShowTicketModal(false); setSelectedTicket(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{
                display: 'flex', flexWrap: 'wrap', gap: '0.75rem', fontSize: '0.85rem',
                backgroundColor: 'var(--surface-hover)', padding: '1rem 1.25rem', borderRadius: '12px', border: '1px solid var(--border)'
              }}>
                <div><strong style={{ color: 'var(--text-muted)' }}>المتجر:</strong> <span style={{ fontWeight: '700', color: 'var(--text-dark)' }}>{tenants.find(t => t.id === selectedTicket.tenant_id)?.store_name || '---'}</span></div>
                <div style={{ marginRight: 'auto' }}>
                  <span className={`badge ${
                    selectedTicket.priority === 'high' ? 'badge-danger' :
                    selectedTicket.priority === 'medium' ? 'badge-warning' : 'badge-info'
                  }`} style={{ fontWeight: 'bold', fontSize: '0.75rem', padding: '0.2rem 0.5rem', borderRadius: '6px' }}>
                    الأهمية: {selectedTicket.priority === 'high' ? 'عالية' : selectedTicket.priority === 'medium' ? 'متوسطة' : 'منخفضة'}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '800', color: 'var(--text-dark)' }}>{selectedTicket.title}</h4>
                <div style={{
                  backgroundColor: 'var(--surface-hover)', border: '1px solid var(--border)',
                  borderRadius: '12px', padding: '1rem', fontSize: '0.88rem', lineHeight: '1.6',
                  color: 'var(--text)', whiteSpace: 'pre-wrap'
                }}>
                  {selectedTicket.description}
                </div>
              </div>

              <form onSubmit={handleReplyTicket} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label className="input-label" style={{ fontWeight: '700', fontSize: '0.85rem', color: 'var(--text-dark)', marginBottom: '0.4rem' }}>تحديث حالة التذكرة</label>
                  <select
                    value={ticketStatus}
                    onChange={(e) => setTicketStatus(e.target.value)}
                    style={{
                      borderRadius: '12px', border: '1.5px solid var(--border)', padding: '0.75rem 1rem',
                      width: '100%', backgroundColor: 'var(--surface-hover)', color: 'var(--text)', outline: 'none'
                    }}
                  >
                    <option value="open" style={{ backgroundColor: 'var(--surface)' }}>مفتوحة (قيد الانتظار)</option>
                    <option value="in_progress" style={{ backgroundColor: 'var(--surface)' }}>قيد المعالجة والمتابعة</option>
                    <option value="resolved" style={{ backgroundColor: 'var(--surface)' }}>تم الحل بنجاح</option>
                    <option value="closed" style={{ backgroundColor: 'var(--surface)' }}>مغلقة نهائياً</option>
                  </select>
                </div>

                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label className="input-label" style={{ fontWeight: '700', fontSize: '0.85rem', color: 'var(--text-dark)', marginBottom: '0.4rem' }}>رد الدعم الفني والملاحظات</label>
                  <textarea
                    placeholder="اكتب الرد الرسمي للمتجر بخصوص المشكلة هنا..."
                    value={ticketResponseText}
                    onChange={(e) => setTicketResponseText(e.target.value)}
                    style={{
                      minHeight: '100px', resize: 'vertical', borderRadius: '12px', border: '1.5px solid var(--border)',
                      padding: '0.75rem 1rem', width: '100%', backgroundColor: 'var(--surface-hover)', color: 'var(--text)', outline: 'none'
                    }}
                    required
                  />
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
                  <button
                    type="button"
                    onClick={() => { setShowTicketModal(false); setSelectedTicket(null); }}
                    className="btn btn-secondary"
                    style={{ padding: '0.75rem 1.5rem', borderRadius: '12px', border: '1px solid var(--border)', fontWeight: '700', cursor: 'pointer' }}
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ flex: 1, padding: '0.75rem 1.5rem', borderRadius: '12px', fontWeight: '800', border: 'none', cursor: 'pointer' }}
                    disabled={isLoadingPlatform}
                  >
                    {isLoadingPlatform ? 'جاري الإرسال...' : 'إرسال الرد وتحديث الحالة'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}


    </div>
  );
};

export default SysAdminLayout;
