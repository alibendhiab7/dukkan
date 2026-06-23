// src/core/database/schema.ts
// Professional seed data for the Grocery SaaS demo
import { db } from './db';
import { hashPassword } from '../utils/hash';

export async function initializeSchemaAndSeed(): Promise<void> {
  const tenants = await db.query('SELECT * FROM tenants');

  // If tenants already populated with correct data, skip
  if (
    tenants.length >= 3 &&
    tenants.some(t => t.client_code === 'hadhramaut') &&
    tenants.some(t => t.client_code === 'SYS') &&
    tenants.some(t => t.client_code === 'seiyun')
  ) {
    console.log('[Seed] Database already contains valid data. Skipping seed.');
    return;
  }

  // If partial data exists, wipe and start fresh
  if (tenants.length > 0) {
    console.log('[Seed] Partial/corrupt data detected. Clearing...');
    await db.clearDatabase();
    await db.initialize();
  }

  console.log('[Seed] Seeding database with demo data...');
  const now = new Date();

  // ============================================================
  // 1. TENANTS (المتاجر)
  // ============================================================
  await db.execute(
    'INSERT INTO tenants (id, client_code, store_name, status, subscription_expires_at, license_plan) VALUES (?, ?, ?, ?, ?, ?)',
    ['0', 'SYS', 'نظام إدارة البقالات السحابي', 'active', '2099-12-31T23:59:59.000Z', '7_enterprise']
  );
  await db.execute(
    'INSERT INTO tenants (id, client_code, store_name, status, subscription_expires_at, license_plan) VALUES (?, ?, ?, ?, ?, ?)',
    ['100', 'hadhramaut', 'بقالة حضرموت النموذجية', 'active', '2030-12-31T23:59:59.000Z', '6_gold']
  );
  await db.execute(
    'INSERT INTO tenants (id, client_code, store_name, status, subscription_expires_at, license_plan) VALUES (?, ?, ?, ?, ?, ?)',
    ['200', 'seiyun', 'سوبرماركت سيئون التجاري', 'active', '2030-12-31T23:59:59.000Z', '1_inventory']
  );

  // ============================================================
  // 2. TENANT SETTINGS (إعدادات الموديولات)
  // ============================================================
  await db.execute(
    'INSERT INTO tenant_settings (tenant_id, enable_inventory, enable_sales, enable_reports, enable_employees) VALUES (?, ?, ?, ?, ?)',
    ['100', 1, 1, 1, 1]
  );
  await db.execute(
    'INSERT INTO tenant_settings (tenant_id, enable_inventory, enable_sales, enable_reports, enable_employees) VALUES (?, ?, ?, ?, ?)',
    ['200', 1, 0, 1, 0]
  );

  // ============================================================
  // 3. USERS (المستخدمون) - كلمات مرور مشفرة SHA-256
  // ============================================================
  const sysHash = await hashPassword('sysadmin123');
  const adminHash = await hashPassword('admin123');
  const salimHash = await hashPassword('salim123');

  await db.execute(
    'INSERT INTO users (id, tenant_id, username, password_hash, role) VALUES (?, ?, ?, ?, ?)',
    ['u1', '0', 'sysadmin', sysHash, 'sysadmin']
  );
  await db.execute(
    'INSERT INTO users (id, tenant_id, username, password_hash, role) VALUES (?, ?, ?, ?, ?)',
    ['u2', '100', 'admin', adminHash, 'admin']
  );
  await db.execute(
    'INSERT INTO users (id, tenant_id, username, password_hash, role) VALUES (?, ?, ?, ?, ?)',
    ['u3', '100', 'salim', salimHash, 'employee']
  );
  await db.execute(
    'INSERT INTO users (id, tenant_id, username, password_hash, role) VALUES (?, ?, ?, ?, ?)',
    ['u4', '200', 'admin', adminHash, 'admin']
  );

  // ============================================================
  // 4. PRODUCTS - بقالة حضرموت (100) — 12 منتج
  // ============================================================
  const products100 = [
    { id: 'p1',  name: 'حليب المدهش مجفف 900 جرام',       barcode: '6291003401211', buy: 35, sell: 40, qty: 45 },
    { id: 'p2',  name: 'أرز بسمتي الشعلان 5 كجم',         barcode: '6281007001402', buy: 42, sell: 48, qty: 15 },
    { id: 'p3',  name: 'زيت شروق نباتي 1.5 لتر',          barcode: '6291011124454', buy: 11, sell: 13.50, qty: 30 },
    { id: 'p4',  name: 'شاي الكبوس خرز 225 جرام',         barcode: '6201012345001', buy: 7.50, sell: 9, qty: 4 },
    { id: 'p5',  name: 'تونة مواسم قطعة 185 جرام',         barcode: '6221005112023', buy: 4.50, sell: 5.50, qty: 60 },
    { id: 'p6',  name: 'بسكويت أبو ولد علبة',              barcode: '6201002341109', buy: 12, sell: 15, qty: 25 },
    { id: 'p7',  name: 'معكرونة قودي سباغيتي 500 جرام',    barcode: '6281007047001', buy: 3.50, sell: 4.50, qty: 80 },
    { id: 'p8',  name: 'صلصة طماطم هاينز 340 جرام',       barcode: '8715700110608', buy: 6, sell: 7.50, qty: 35 },
    { id: 'p9',  name: 'حليب نادك طازج 1 لتر',            barcode: '6281057000128', buy: 6.50, sell: 8, qty: 20 },
    { id: 'p10', name: 'مياه صحة 12 × 600 مل',           barcode: '6281052010104', buy: 8, sell: 10, qty: 50 },
    { id: 'p11', name: 'سكر أبيض 5 كجم',                  barcode: '6281048110051', buy: 15, sell: 18, qty: 12 },
    { id: 'p12', name: 'طحين القصيم 10 كجم',              barcode: '6281001006007', buy: 20, sell: 25, qty: 8 },
  ];

  for (const p of products100) {
    await db.execute(
      'INSERT INTO products (id, tenant_id, name, barcode, purchase_price, sale_price, currency, quantity) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [p.id, '100', p.name, p.barcode, p.buy, p.sell, 'SAR', p.qty]
    );
    await db.execute(
      'INSERT INTO inventory_movements (id, tenant_id, product_id, type, quantity, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [`im_${p.id}`, '100', p.id, 'in', p.qty, daysAgo(now, 30)]
    );
  }

  // ============================================================
  // 5. PRODUCTS - سوبرماركت سيئون (200) — 4 منتج
  // ============================================================
  const products200 = [
    { id: 'p201', name: 'دقيق السنابل 10 كجم',   barcode: '6201001002003', buy: 18, sell: 22, qty: 10 },
    { id: 'p202', name: 'سكر الأسرة 5 كجم',      barcode: '6281048110099', buy: 15, sell: 18, qty: 3 },
    { id: 'p203', name: 'أرز هندي 5 كجم',        barcode: '6281007001419', buy: 38, sell: 44, qty: 7 },
    { id: 'p204', name: 'زيت ذرة 1.5 لتر',       barcode: '6291011124461', buy: 14, sell: 17, qty: 18 },
  ];

  for (const p of products200) {
    await db.execute(
      'INSERT INTO products (id, tenant_id, name, barcode, purchase_price, sale_price, currency, quantity) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [p.id, '200', p.name, p.barcode, p.buy, p.sell, 'SAR', p.qty]
    );
  }

  // ============================================================
  // 6. DEMO SALES — 15 فاتورة على مدى الأسبوعين الماضيين
  // ============================================================
  const salesData = [
    { id: 's1',  day: 1,  by: 'admin',  items: [{ pid: 'p1', qty: 2, price: 40 }, { pid: 'p5', qty: 5, price: 5.50 }] },
    { id: 's2',  day: 1,  by: 'salim',  items: [{ pid: 'p7', qty: 3, price: 4.50 }, { pid: 'p8', qty: 2, price: 7.50 }] },
    { id: 's3',  day: 2,  by: 'admin',  items: [{ pid: 'p2', qty: 1, price: 48 }, { pid: 'p3', qty: 2, price: 13.50 }] },
    { id: 's4',  day: 3,  by: 'salim',  items: [{ pid: 'p10', qty: 3, price: 10 }, { pid: 'p4', qty: 1, price: 9 }] },
    { id: 's5',  day: 4,  by: 'admin',  items: [{ pid: 'p9', qty: 2, price: 8 }, { pid: 'p6', qty: 1, price: 15 }] },
    { id: 's6',  day: 5,  by: 'salim',  items: [{ pid: 'p11', qty: 1, price: 18 }, { pid: 'p5', qty: 10, price: 5.50 }] },
    { id: 's7',  day: 5,  by: 'admin',  items: [{ pid: 'p1', qty: 3, price: 40 }, { pid: 'p7', qty: 5, price: 4.50 }] },
    { id: 's8',  day: 6,  by: 'salim',  items: [{ pid: 'p3', qty: 4, price: 13.50 }] },
    { id: 's9',  day: 7,  by: 'admin',  items: [{ pid: 'p12', qty: 2, price: 25 }, { pid: 'p2', qty: 1, price: 48 }] },
    { id: 's10', day: 8,  by: 'salim',  items: [{ pid: 'p8', qty: 3, price: 7.50 }, { pid: 'p10', qty: 2, price: 10 }] },
    { id: 's11', day: 9,  by: 'admin',  items: [{ pid: 'p5', qty: 8, price: 5.50 }, { pid: 'p9', qty: 1, price: 8 }] },
    { id: 's12', day: 10, by: 'salim',  items: [{ pid: 'p6', qty: 2, price: 15 }, { pid: 'p4', qty: 2, price: 9 }] },
    { id: 's13', day: 12, by: 'admin',  items: [{ pid: 'p1', qty: 1, price: 40 }, { pid: 'p11', qty: 2, price: 18 }] },
    { id: 's14', day: 13, by: 'salim',  items: [{ pid: 'p7', qty: 10, price: 4.50 }, { pid: 'p3', qty: 1, price: 13.50 }] },
    { id: 's15', day: 0,  by: 'admin',  items: [{ pid: 'p5', qty: 3, price: 5.50 }, { pid: 'p10', qty: 1, price: 10 }, { pid: 'p2', qty: 1, price: 48 }] },
  ];

  for (const sale of salesData) {
    const saleDate = daysAgo(now, sale.day);
    const total = sale.items.reduce((sum, i) => sum + i.qty * i.price, 0);

    await db.execute(
      'INSERT INTO sales (id, tenant_id, total, created_by, created_at) VALUES (?, ?, ?, ?, ?)',
      [sale.id, '100', total, sale.by, saleDate]
    );

    for (let idx = 0; idx < sale.items.length; idx++) {
      const item = sale.items[idx];
      await db.execute(
        'INSERT INTO sale_items (id, sale_id, product_id, qty, price) VALUES (?, ?, ?, ?, ?)',
        [`${sale.id}_item${idx}`, sale.id, item.pid, item.qty, item.price]
      );
      // Log out movement
      await db.execute(
        'INSERT INTO inventory_movements (id, tenant_id, product_id, type, quantity, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [`mov_${sale.id}_${idx}`, '100', item.pid, 'out', item.qty, saleDate]
      );
    }
  }

  // ============================================================
  // 7. EXCHANGE RATES (أسعار الصرف)
  // ============================================================
  await db.execute(
    'INSERT INTO exchange_rates (id, tenant_id, sar_to_yer, updated_at) VALUES (?, ?, ?, ?)',
    ['rate1', '100', 395.0, now.toISOString()]
  );
  await db.execute(
    'INSERT INTO exchange_rates (id, tenant_id, sar_to_yer, updated_at) VALUES (?, ?, ?, ?)',
    ['rate2', '200', 396.0, now.toISOString()]
  );

  // ============================================================
  // 8. NOTIFICATIONS (تنبيهات)
  // ============================================================
  const notifications = [
    { tid: '100', title: 'مرحباً بك في النظام!', message: 'تم تهيئة النظام بنجاح. يمكنك الآن استخدام جميع الموديولات المفعّلة.', type: 'success' },
    { tid: '100', title: 'تنبيه مخزون منخفض', message: 'المنتج "شاي الكبوس خرز 225 جرام" وصل إلى 4 وحدات فقط. يرجى إعادة الطلب.', type: 'warning' },
    { tid: '100', title: 'تقرير المبيعات اليومي', message: 'تم إنجاز 15 فاتورة بيع خلال الأسبوعين الماضيين. أداء ممتاز!', type: 'info' },
    { tid: '200', title: 'تحذير انتهاء الاشتراك', message: 'سينتهي اشتراككم في خطة المخزون الأساسية قريباً. تواصلوا مع إدارة النظام للتجديد.', type: 'danger' },
    { tid: '200', title: 'مخزون منخفض - سكر', message: 'المنتج "سكر الأسرة 5 كجم" وصل إلى 3 وحدات فقط.', type: 'warning' },
  ];

  for (let i = 0; i < notifications.length; i++) {
    const n = notifications[i];
    await db.execute(
      'INSERT INTO notifications (id, tenant_id, title, message, type, is_read, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [`notif_${i + 1}`, n.tid, n.title, n.message, n.type, 0, daysAgo(now, notifications.length - i)]
    );
  }

  // ============================================================
  // 9. FINANCIAL COSTS (التكاليف المالية - بقالة حضرموت)
  // ============================================================
  const costs = [
    { cat: 'rent',      desc: 'إيجار المحل - شهر يونيو',         amount: 3500, day: 25 },
    { cat: 'salary',    desc: 'راتب الموظف سالم',               amount: 2000, day: 25 },
    { cat: 'utilities', desc: 'فاتورة الكهرباء - شهر مايو',      amount: 450,  day: 20 },
    { cat: 'transport', desc: 'نقل بضاعة من المستودع',           amount: 200,  day: 15 },
    { cat: 'other',     desc: 'صيانة ثلاجة العرض',              amount: 350,  day: 10 },
    { cat: 'utilities', desc: 'فاتورة المياه - شهر مايو',        amount: 120,  day: 8 },
    { cat: 'transport', desc: 'توصيل طلبية عميل كبير',          amount: 150,  day: 5 },
    { cat: 'other',     desc: 'مستلزمات تغليف وأكياس',          amount: 85,   day: 3 },
  ];

  for (let i = 0; i < costs.length; i++) {
    const c = costs[i];
    await db.execute(
      'INSERT INTO financial_costs (id, tenant_id, category, description, amount, currency, cost_date, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [`cost_${i + 1}`, '100', c.cat, c.desc, c.amount, 'SAR', daysAgo(now, c.day).split('T')[0], 'admin', daysAgo(now, c.day)]
    );
  }

  // ============================================================
  // 10. AUDIT LOGS (سجل العمليات)
  // ============================================================
  const auditEntries = [
    { action: 'تهيئة النظام وقاعدة البيانات', by: 'System', day: 30 },
    { action: 'تسجيل دخول مدير المتجر', by: 'admin', day: 14 },
    { action: 'إضافة 6 منتجات جديدة للمخزون', by: 'admin', day: 14 },
    { action: 'تسجيل أول فاتورة بيع', by: 'admin', day: 13 },
    { action: 'تعديل سعر صرف الريال إلى 395 ي.ر', by: 'admin', day: 10 },
    { action: 'تسجيل دخول الموظف سالم', by: 'salim', day: 7 },
    { action: 'تسجيل 3 فواتير بيع', by: 'salim', day: 5 },
    { action: 'إضافة تكاليف مالية شهرية', by: 'admin', day: 3 },
  ];

  for (let i = 0; i < auditEntries.length; i++) {
    const a = auditEntries[i];
    await db.execute(
      'INSERT INTO audit_logs (id, tenant_id, action, performed_by, created_at) VALUES (?, ?, ?, ?, ?)',
      [`log_${i + 1}`, '100', a.action, a.by, daysAgo(now, a.day)]
    );
  }

  console.log('[Seed] ✅ Database seeded successfully with rich demo data!');
}

// Helper: return ISO date string for N days ago
function daysAgo(from: Date, days: number): string {
  const d = new Date(from);
  d.setDate(d.getDate() - days);
  // Add a random hour to make timestamps look natural
  d.setHours(8 + Math.floor(Math.random() * 10), Math.floor(Math.random() * 60));
  return d.toISOString();
}
