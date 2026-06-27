// src/i18n/index.ts
import { stringsEn } from './en';

const stringsAr = {
  common: {
    appName: 'دكّان',
    sar: 'ر.س',
    yer: 'ر.ي',
    loading: 'جاري التحميل...',
    save: 'حفظ',
    cancel: 'إلغاء',
    delete: 'حذف',
    edit: 'تعديل',
    add: 'إضافة',
    close: 'إغلاق',
    search: 'بحث...',
    status: 'الحالة',
    active: 'نشط',
    suspended: 'موقف',
    actions: 'الإجراءات',
    error: 'خطأ',
    success: 'نجاح',
    warning: 'تحذير',
    info: 'معلومات',
    currency: 'العملة',
    date: 'التاريخ',
    performedBy: 'بواسطة',
    confirmDelete: 'هل أنت متأكد من الحذف؟',
    lowStock: 'مخزون منخفض',
    export: 'تصدير',
    import: 'استيراد',
    filter: 'تصفية',
    from: 'من',
    to: 'إلى',
    total: 'الإجمالي',
    subtotal: 'المجموع الفرعي',
    discount: 'الخصم',
    noData: 'لا توجد بيانات',
    confirm: 'تأكيد',
    notes: 'ملاحظات',
    all: 'الكل',
  },
  auth: {
    title: 'تسجيل الدخول للنظام',
    tenantPlaceholder: 'رمز العميل / المتجر',
    usernamePlaceholder: 'اسم المستخدم',
    passwordPlaceholder: 'كلمة المرور',
    tenantLabel: 'رمز المتجر (العميل)',
    usernameLabel: 'اسم المستخدم',
    passwordLabel: 'كلمة المرور',
    loginButton: 'تسجيل الدخول',
    loggingIn: 'جاري تسجيل الدخول...',
    logout: 'تسجيل الخروج',
    welcomeBack: 'مرحباً بك مجدداً،'
  },
  dashboard: {
    quickActions: 'إجراءات سريعة',
    systemOverview: 'نظرة عامة على النظام',
    salesCount: 'عدد المبيعات اليوم',
    totalRevenue: 'إجمالي المبيعات (ر.ي)',
    totalProfit: 'إجمالي الأرباح (ر.ي)',
    inventoryValuation: 'قيمة المخزون (ر.ي)',
    lowStockAlerts: 'تنبيهات المخزون المنخفض',
    latestMovements: 'آخر حركات المخزون',
    exchangeRateDisplay: 'سعر الصرف الحالي (ر.ي)',
    noSalesToday: 'لا توجد مبيعات مسجلة اليوم بعد.'
  },
  inventory: {
    title: 'إدارة المخازن والمنتجات',
    productName: 'اسم المنتج',
    barcode: 'الباركود',
    purchasePrice: 'سعر الشراء (ر.س)',
    salePrice: 'سعر البيع (ر.س)',
    qty: 'الكمية المتوفرة',
    addProduct: 'إضافة منتج جديد',
    editProduct: 'تعديل المنتج',
    adjustStock: 'تسوية كمية المخزون',
    stockIn: 'توريد (+)',
    stockOut: 'سحب (-)',
    qtyToAdjust: 'الكمية المراد تسويتها',
    adjustmentType: 'نوع التسوية',
    noProducts: 'لا توجد منتجات مسجلة.',
    category: 'التصنيف',
    expiryDate: 'الصلاحية',
  },
  sales: {
    title: 'نقطة البيع',
    cart: 'سلة المشتريات',
    emptyCart: 'السلة فارغة.',
    completeSale: 'تأكيد البيع',
    cashier: 'الكاشير',
    customer: 'العميل',
    holdCart: 'حفظ مؤقت',
    voidSale: 'إلغاء',
    saleNotes: 'ملاحظات',
  },
  employees: {
    title: 'إدارة الموظفين',
    addEmployee: 'إضافة موظف',
    empUsername: 'اسم المستخدم',
    empPassword: 'كلمة المرور',
    empRole: 'الدور',
    roleAdmin: 'مدير متجر',
    roleEmployee: 'موظف مبيعات',
    noEmployees: 'لا يوجد موظفون.',
  },
  rates: {
    title: 'أسعار الصرف',
    sarToYerRate: 'سعر الصرف',
    updateRate: 'تحديث',
    ratePlaceholder: 'مثال: 395',
    rateHelp: 'يتم استخدام هذا السعر في نقطة البيع لحساب المبلغ بالريال اليمني تلقائياً.',
    lastUpdated: 'آخر تحديث',
  },
  reports: {
    title: 'التقارير',
    dateRange: 'نطاق التاريخ',
    topProducts: 'الأكثر مبيعاً',
    productProfit: 'أرباح المنتجات',
    lowStockReport: 'المخزون المنخفض',
    financialCosts: 'التكاليف',
    addCost: 'إضافة تكلفة',
    comparePeriods: 'مقارنة الفترات',
    totalCosts: 'إجمالي التكاليف',
    costCategory: 'تصنيف التكلفة',
    costDescription: 'وصف التكلفة',
    costAmount: 'المبلغ',
    costDate: 'التاريخ',
  },
  customers: {
    title: 'العملاء',
    addCustomer: 'إضافة عميل',
    editCustomer: 'تعديل العميل',
    customerName: 'اسم العميل',
    phone: 'الهاتف',
    email: 'البريد',
    address: 'العنوان',
    loyaltyPoints: 'نقاط الولاء',
    search: 'بحث...',
    noCustomers: 'لا يوجد عملاء.',
  },
  notifications: {
    title: 'الإشعارات',
    markAllRead: 'تعيين الكل كمقروء',
    noNotifications: 'لا توجد إشعارات.',
  },
  coupons: {
    title: 'الكوبونات',
    addCoupon: 'إضافة كوبون',
    editCoupon: 'تعديل الكوبون',
    code: 'الكود',
    discountType: 'نوع الخصم',
    percentage: 'نسبة (%)',
    fixed: 'مبلغ ثابت',
    discountValue: 'قيمة الخصم',
    maxUses: 'الحد الأقصى للاستخدام',
    minCartTotal: 'الحد الأدنى للسلة',
    expiresAt: 'تاريخ الانتهاء',
    noCoupons: 'لا توجد كوبونات.',
  },
  returns: {
    title: 'المرتجعات',
    createReturn: 'إنشاء مرتجع',
    reason: 'السبب',
    totalRefund: 'المبلغ المسترد',
    noReturns: 'لا توجد مرتجعات.',
    damaged: 'تالف',
    unsatisfied: 'غير راضٍ',
    wrongItem: 'منتج خاطئ',
    other: 'أخرى',
  },
  settings: {
    title: 'الإعدادات',
    darkMode: 'الوضع الداكن',
    language: 'اللغة',
    backup: 'نسخ احتياطي',
    printSettings: 'إعدادات الطباعة',
  },
  sysadmin: {
    title: 'دكّان — لوحة تحكم المشرف',
    tenantsManagement: 'إدارة المتاجر',
    addTenant: 'إضافة متجر',
    storeName: 'اسم المتجر',
    clientCode: 'رمز العميل المميز',
    auditLogs: 'سجلات التدقيق',
    noTenants: 'لا توجد متاجر.',
  }
};

type Language = 'ar' | 'en';

let currentLang: Language = 'ar';

export const setLanguage = (lang: Language) => {
  currentLang = 'ar';
  localStorage.setItem('grocery_saas_lang', 'ar');
  document.documentElement.dir = 'rtl';
  document.documentElement.lang = 'ar';
};

export const getLanguage = (): Language => 'ar';

export const strings = stringsAr;

export const t = (path: string): string => {
  const keys = path.split('.');
  let result: any = strings;
  for (const key of keys) {
    result = result?.[key];
  }
  return result || path;
};

export type AppStrings = typeof stringsAr;
export default strings;
