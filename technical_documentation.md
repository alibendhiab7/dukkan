# دكّان — الوثائق التقنية والوظيفية
**نظام إدارة المتاجر متعدد المستأجرين | Multi-Tenant SaaS POS Platform**
*الإصدار 1.0 — يونيو 2026*

---

## 1. نظرة عامة على المشروع

**دكّان** هو نظام SaaS متكامل لإدارة نقاط البيع (POS) مصمم للسوق اليمني والسعودي. يتيح للشركة المشغّلة (المُشغِّل) تقديم خدمة إدارة المتاجر لعملاء متعددين من خلال بنية Multi-Tenant آمنة ومعزولة.

### 1.1 الأهداف الجوهرية
- ✅ إدارة مركزية لكل المتاجر من لوحة تحكم واحدة (SysAdmin)
- ✅ عزل كامل لبيانات كل متجر عن الآخر
- ✅ دعم اشتراكات مرنة بباقات متدرجة
- ✅ يعمل على الويب وقابل للتثبيت كـ PWA على الهاتف
- ✅ دعم ثنائي للعملات: الريال اليمني (YER) والريال السعودي (SAR)

---

## 2. المكدس التقني (Tech Stack)

| الطبقة | التقنية | الغرض |
|--------|---------|--------|
| **Frontend** | React 19 + TypeScript | واجهة المستخدم الكاملة |
| **Build Tool** | Vite 8 | بناء وتطوير سريع |
| **State Management** | Zustand 5 | إدارة الحالة العامة |
| **Routing** | React Router DOM 7 | التنقل بين الصفحات |
| **Database (Cloud)** | Turso (libSQL) | قاعدة البيانات السحابية |
| **Database (Local)** | SQLite (IndexedDB/OPFS) | وضع offline |
| **API Layer** | Vercel Serverless Functions | نقاط نهاية الـ API |
| **Styling** | Vanilla CSS + CSS Variables | تصميم كامل التحكم |
| **Icons** | Lucide React | أيقونات موحدة |
| **PWA** | Service Worker | قابل للتثبيت على الهاتف |
| **PDF Export** | html2pdf.js | تصدير كشوفات الحساب |
| **Animations** | Canvas Confetti | تأثيرات احتفالية |

---

## 3. البنية المعمارية (Architecture)

```
┌─────────────────────────────────────────────────────┐
│                    CLIENT (Browser)                  │
│  React SPA  ──►  Zustand Stores  ──►  UI Components │
│                        │                            │
│              core/api/client.ts                     │
└──────────────────────────────────────────────────────┘
                          │  HTTP REST
┌─────────────────────────▼────────────────────────────┐
│              API Layer (Vercel Functions)            │
│  /api/auth  /api/products  /api/sales  /api/tenants │
│  /api/customers  /api/debts  /api/reports  ...      │
└──────────────────────────────────────────────────────┘
                          │
┌─────────────────────────▼────────────────────────────┐
│              Turso Database (libSQL)                 │
│  20+ Tables — Multi-Tenant with tenant_id isolation │
└─────────────────────────────────────────────────────┘
```

### 3.1 نمط Repository
يتبع المشروع نمط **Repository Pattern** المزدوج:

```
IRepository (Interface)
    ├── TursoRepository (Cloud — Production)
    └── SQLiteRepository (Local — Offline)
```

يتم التبديل بين المستودعَين تلقائياً بناءً على البيئة، مما يضمن عمل التطبيق حتى في غياب الإنترنت.

### 3.2 عزل المستأجرين (Multi-Tenancy)
- كل صف في قاعدة البيانات يحمل `tenant_id`
- جميع الاستعلامات تُرسَّح بـ `tenant_id` تلقائياً
- المتجر الخاص بـ SysAdmin يحمل `tenant_id = '0'`
- يستحيل وصول متجر لبيانات متجر آخر

---

## 4. هيكل المجلدات

```
dukkan/
├── api/                          # Vercel Serverless Functions
│   ├── auth/login.ts             # تسجيل الدخول
│   ├── products/index.ts         # CRUD المنتجات
│   ├── sales/index.ts            # المبيعات والفواتير
│   ├── customers/index.ts        # العملاء
│   ├── debts/index.ts            # الديون والمدفوعات
│   ├── costs/index.ts            # المصاريف
│   ├── returns/index.ts          # المرتجعات
│   ├── coupons/index.ts          # كوبونات الخصم
│   ├── promotions/index.ts       # العروض الترويجية
│   ├── notifications/index.ts    # الإشعارات
│   ├── permissions/index.ts      # صلاحيات المستخدمين
│   ├── rates/index.ts            # أسعار الصرف
│   ├── reports/index.ts          # التقارير المالية
│   ├── tenants/index.ts          # إدارة المتاجر (SysAdmin)
│   ├── tenants/payments.ts       # سجل المدفوعات
│   ├── users/index.ts            # إدارة المستخدمين
│   └── db/                       # Migration & Seeding
│
├── src/
│   ├── core/
│   │   ├── api/client.ts         # HTTP client موحّد
│   │   ├── database/             # قاعدة البيانات المحلية
│   │   ├── repositories/
│   │   │   ├── interfaces.ts     # عقود البيانات (Interfaces)
│   │   │   ├── turso/index.ts    # تنفيذ Turso
│   │   │   └── sqlite/index.ts   # تنفيذ SQLite
│   │   └── utils/
│   │       └── hash.ts           # bcrypt لكلمات المرور
│   │
│   ├── store/                    # Zustand Stores
│   │   ├── authStore.ts          # الجلسة والمصادقة
│   │   ├── salesStore.ts         # المبيعات والسجلات
│   │   ├── inventoryStore.ts     # المخزون
│   │   └── cartStore.ts          # سلة البيع
│   │
│   ├── ui/
│   │   ├── layouts/
│   │   │   ├── AppLayout.tsx     # تخطيط المتجر الرئيسي
│   │   │   └── SysAdminLayout.tsx # لوحة تحكم المشرف
│   │   ├── tabs/                 # تبويبات التطبيق (13 تبويب)
│   │   ├── components/           # مكوّنات مشتركة
│   │   └── screens/              # شاشات (تسجيل الدخول)
│   │
│   ├── i18n/                     # النصوص العربية
│   └── index.css                 # نظام التصميم الكامل
│
├── public/                       # ملفات ثابتة (PWA assets)
└── vite.config.ts                # ضبط البناء والـ API middleware
```

---

## 5. نماذج البيانات (Data Models)

### 5.1 Tenant (المتجر)
```typescript
interface Tenant {
  id: string;                        // store_XXXXXXX
  client_code: string;               // رمز فريد للمتجر
  store_name: string;                // اسم المتجر
  status: 'active' | 'suspended';   // حالة الاشتراك
  subscription_expires_at: string;   // ISO date — تاريخ انتهاء الترخيص
  license_plan: string;              // الباقة المشتركة
  max_users?: number;                // الحد الأقصى للمستخدمين
}
```

### 5.2 User (المستخدم)
```typescript
interface User {
  id: string;
  tenant_id: string;                           // ربط بالمتجر
  username: string;
  password_hash: string;                       // bcrypt hash
  role: 'sysadmin' | 'admin' | 'employee';   // صلاحية المستخدم
  permissions?: Record<string, boolean>;       // صلاحيات تفصيلية
}
```

### 5.3 Product (المنتج)
```typescript
interface Product {
  id: string;
  tenant_id: string;
  name: string;
  barcode: string;
  purchase_price: number;     // سعر الشراء
  sale_price: number;         // سعر البيع
  currency: 'SAR' | 'YER';   // العملة
  quantity: number;           // الكمية الحالية
  category?: string;
  unit_of_measure?: string;
  min_stock?: number;         // حد التنبيه الأدنى
  max_stock?: number;
  image_url?: string;
  expiry_date?: string;       // تاريخ الانتهاء
}
```

### 5.4 Sale (الفاتورة)
```typescript
interface Sale {
  id: string;
  tenant_id: string;
  total: number;
  discount?: number;
  discount_type?: 'percentage' | 'fixed';
  final_total?: number;
  created_by: string;          // اسم الموظف
  created_at: string;
  customer_id?: string;
  customer_name?: string;
  items?: SaleItem[];          // عناصر الفاتورة
}
```

> **نماذج إضافية:** Customer, Coupon, ProductReturn, FinancialCost, ExchangeRate, AuditLog, Notification, InventoryMovement, TenantPayment

---

## 6. طبقة الـ API

### 6.1 نقاط النهاية الرئيسية

| Method | Endpoint | الوظيفة |
|--------|----------|---------|
| `POST` | `/api/auth/login` | تسجيل الدخول + التحقق من الترخيص |
| `GET/POST/PUT/DELETE` | `/api/products` | إدارة المنتجات |
| `GET/POST` | `/api/sales` | المبيعات والفواتير |
| `POST` | `/api/sales` `void` | إلغاء فاتورة |
| `GET/POST/PUT/DELETE` | `/api/customers` | إدارة العملاء |
| `GET/POST/PUT/DELETE` | `/api/debts` | الديون والمدفوعات |
| `GET/POST/PUT/DELETE` | `/api/costs` | المصاريف والتكاليف |
| `GET/POST` | `/api/returns` | المرتجعات |
| `GET/POST/PUT/DELETE` | `/api/coupons` | كوبونات الخصم |
| `GET/POST/PUT/DELETE` | `/api/promotions` | العروض الترويجية |
| `GET/PUT` | `/api/rates` | أسعار الصرف |
| `GET` | `/api/reports` | التقارير المالية |
| `GET/POST/DELETE` | `/api/tenants` | إدارة المتاجر |
| `GET/POST` | `/api/tenants/payments` | سجل الاشتراكات |
| `GET/POST/PUT/DELETE` | `/api/users` | إدارة المستخدمين |
| `GET/POST` | `/api/permissions` | صلاحيات المستخدمين |
| `GET/POST/PUT` | `/api/notifications` | الإشعارات |

### 6.2 آلية المصادقة
- لا يوجد JWT خارجي — الجلسة تُحفَظ في `localStorage` + Zustand
- عند كل دخول يتم التحقق من:
  1. صحة اسم المستخدم وكلمة المرور (bcrypt)
  2. حالة المتجر (`status !== 'suspended'`)
  3. تاريخ انتهاء الاشتراك (`subscription_expires_at`)
- في حال انتهاء الاشتراك: **يُجمَّد المتجر فعلياً** ويُمنع تسجيل الدخول

---

## 7. نظام الأدوار والصلاحيات

### 7.1 الأدوار الثلاثة

| الدور | التعريف | النطاق |
|-------|---------|--------|
| `sysadmin` | مشرف النظام العام | جميع المتاجر |
| `admin` | مدير المتجر | متجره فقط |
| `employee` | موظف | متجره + صلاحيات مخصصة |

### 7.2 الصلاحيات التفصيلية للموظفين (26 صلاحية)

```
نقطة البيع:        sales.read, sales.create, sales.delete
المخزون:           inventory.read, inventory.add, inventory.edit, inventory.delete
الديون:            debts.read, debts.add, debts.edit
العملاء:           customers.read, customers.add, customers.edit, customers.delete
المرتجعات:         returns.read, returns.add
المصاريف:          costs.read, costs.add, costs.edit, costs.delete
التقارير:          reports.read
أسعار الصرف:       rates.read, rates.edit
إعدادات الطباعة:   printSettings.read
النسخ الاحتياطي:   backup.read
العروض:            promotions.read, promotions.add, promotions.delete
```

### 7.3 صلاحيات SysAdmin

| الوظيفة | الوصف |
|---------|-------|
| إنشاء المتاجر | تأسيس متجر جديد بكل بياناته |
| تجديد الاشتراك | تمديد الترخيص وتغيير الباقة |
| تعليق/تفعيل المتجر | إيقاف المتجر فوراً |
| حذف المتجر | حذف متتالي لـ 20 جدول (Cascade Delete) مع تأكيد مزدوج |
| إدارة المستخدمين | إنشاء/حذف/تعديل مستخدمي أي متجر |
| تعديل الصلاحيات | ضبط دقيق لصلاحيات الموظفين |
| كشف الحساب | استعراض وتصدير PDF لسجل مدفوعات كل متجر |
| سجل التدقيق | عرض كل الأحداث لكل المتاجر |
| تغيير كلمة المرور | تغيير كلمة مرور حساب المشرف بأمان |

---

## 8. التبويبات الوظيفية (13 تبويب)

| التبويب | الملف | الوصف |
|---------|-------|-------|
| 🏠 لوحة التحكم | `DashboardTab.tsx` | إحصائيات اليوم، أسرع المنتجات، تنبيهات |
| 💰 نقطة البيع | `SalesTab.tsx` | POS كاملة، سلة، كوبونات، عملاء |
| 📦 المخزون | `InventoryTab.tsx` | CRUD المنتجات، بحث، باركود، تسوية |
| 📋 الفواتير | `InvoicesTab.tsx` | عرض، بحث، طباعة، إلغاء الفواتير |
| 👥 العملاء | `CustomersTab.tsx` | إدارة العملاء، نقاط الولاء |
| 💳 الديون | `DebtsTab.tsx` | تسجيل الديون، تسديد الدفعات |
| ↩️ المرتجعات | `ReturnsTab.tsx` | إرجاع المنتجات من الفواتير |
| 💸 المصاريف | `FinancialCostsTab.tsx` | تتبع التكاليف والمصاريف |
| 📊 التقارير | `ReportsTab.tsx` | تقارير مالية وإحصائية شاملة |
| 🎁 العروض | `PromotionsTab.tsx` | عروض الأسعار والتخفيضات |
| 🎟️ الكوبونات | `CouponsTab.tsx` | كوبونات الخصم |
| 💱 أسعار الصرف | `RatesTab.tsx` | تحديث سعر SAR/YER |
| 👨‍💼 الموظفون | `EmployeesTab.tsx` | إدارة حسابات الموظفين |

---

## 9. قاعدة البيانات

### 9.1 الجداول (20+ جدول)

```sql
tenants              -- المتاجر والتراخيص
tenant_settings      -- إعدادات وموديولات كل متجر
tenant_payments      -- سجل الاشتراكات والمدفوعات
users                -- المستخدمون والأدوار
user_permissions     -- الصلاحيات التفصيلية
products             -- المنتجات
inventory_movements  -- حركات المخزون
sales                -- الفواتير
sale_items           -- عناصر الفاتورة
exchange_rates       -- أسعار الصرف
audit_logs           -- سجل التدقيق
customers            -- العملاء
notifications        -- الإشعارات
coupons              -- كوبونات الخصم
product_returns      -- المرتجعات
return_items         -- عناصر المرتجع
financial_costs      -- المصاريف
debts                -- الديون
debt_payments        -- مدفوعات الديون
promotions           -- العروض الترويجية
```

### 9.2 أوامر قاعدة البيانات

```bash
npm run db:migrate   # تطبيق التحديثات الجديدة
npm run db:seed      # تعبئة بيانات تجريبية
npm run db:reset     # إعادة ضبط كاملة
npm run db:setup     # reset + migrate + seed
```

---

## 10. الأمان (Security)

| الآلية | التطبيق |
|--------|---------|
| **تشفير كلمات المرور** | bcrypt hashing في `core/utils/hash.ts` |
| **عزل المستأجرين** | `tenant_id` فلتر إلزامي في كل استعلام |
| **تجميد المتجر** | فحص حالة وتاريخ الترخيص عند كل دخول |
| **تأكيد الحذف** | إدخال رمز المتجر لتأكيد الحذف النهائي |
| **سجل التدقيق** | تسجيل كل عملية حساسة بالتاريخ والمستخدم |
| **حماية حساب SysAdmin** | لا يمكن حذفه حتى من لوحة التحكم |

---

## 11. PWA والعمل بدون إنترنت

- يدعم التطبيق التثبيت على الهاتف (Add to Home Screen)
- يعمل المستودع المحلي (SQLite) في وضع offline
- عرض نافذة تثبيت تلقائية للمستخدم غير المثبِّت

---

## 12. البيئات والنشر

### متغيرات البيئة المطلوبة
```env
TURSO_DATABASE_URL=libsql://...     # رابط قاعدة بيانات Turso
TURSO_AUTH_TOKEN=...                # مفتاح مصادقة Turso
```

### بيئة التطوير
```bash
npm run dev         # تشغيل محلي مع API middleware
```

### الإنتاج
```bash
npm run build       # TypeScript → Vite bundle
```
يُنشَر على Vercel تلقائياً — الـ `api/` folder تُصبح Serverless Functions.

---

## 13. نقاط القوة التقنية

> [!TIP]
> **قابلية التوسع**: إضافة متجر جديد لا تتطلب أي تعديل على الكود — يكفي إنشاؤه من لوحة SysAdmin.

> [!NOTE]
> **استقلالية الطبقات**: بإمكان استبدال Turso بأي قاعدة بيانات أخرى دون تعديل الـ UI — بفضل Repository Pattern.

> [!IMPORTANT]
> **الأمان الهيكلي**: لا توجد بيانات حساسة في الـ Frontend — كلمات المرور تُعالَج فقط في الـ API layer.

---

*وثيقة تقنية — دكّان v1.0 | تاريخ الإصدار: يونيو 2026*
