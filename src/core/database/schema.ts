// src/core/database/schema.ts
import { db } from './db';
import { hashPassword } from '../utils/hash';

export async function initializeSchemaAndSeed(): Promise<void> {
  const tenants = await db.query('SELECT * FROM tenants');

  if (
    tenants.length >= 3 &&
    tenants.some(t => t.client_code === 'mukalla1') &&
    tenants.some(t => t.client_code === 'SYS') &&
    tenants.some(t => t.client_code === 'mukalla2')
  ) {
    console.log('[Seed] Mukalla data already loaded. Skipping.');
    return;
  }

  if (tenants.length > 0) {
    console.log('[Seed] Old data detected. Clearing...');
    await db.clearDatabase();
    await db.initialize();
  }

  console.log('[Seed] Seeding Mukalla data...');
  const now = new Date();

  // 1. TENANTS
  await db.execute(
    'INSERT INTO tenants (id, client_code, store_name, status, subscription_expires_at, license_plan, max_users) VALUES (?, ?, ?, ?, ?, ?, ?)',
    ['0', 'SYS', 'دكّان | Dukkan', 'active', '2099-12-31T23:59:59.000Z', '7_enterprise', 999]
  );
  await db.execute(
    'INSERT INTO tenants (id, client_code, store_name, status, subscription_expires_at, license_plan, max_users) VALUES (?, ?, ?, ?, ?, ?, ?)',
    ['100', 'mukalla1', 'سوبرماركت المكلا الرئيسي', 'active', '2030-12-31T23:59:59.000Z', '7_enterprise', 10]
  );
  await db.execute(
    'INSERT INTO tenants (id, client_code, store_name, status, subscription_expires_at, license_plan, max_users) VALUES (?, ?, ?, ?, ?, ?, ?)',
    ['200', 'mukalla2', 'بقالة الدهمة للتموين', 'active', '2029-06-30T23:59:59.000Z', '6_gold', 5]
  );
  await db.execute(
    'INSERT INTO tenants (id, client_code, store_name, status, subscription_expires_at, license_plan, max_users) VALUES (?, ?, ?, ?, ?, ?, ?)',
    ['300', 'mukalla3', 'محلات الميناء التجارية', 'active', '2028-12-31T23:59:59.000Z', '5_silver', 3]
  );

  // 2. TENANT SETTINGS
  await db.execute(
    'INSERT INTO tenant_settings (tenant_id, enable_inventory, enable_sales, enable_reports, enable_employees) VALUES (?, ?, ?, ?, ?)',
    ['100', 1, 1, 1, 1]
  );
  await db.execute(
    'INSERT INTO tenant_settings (tenant_id, enable_inventory, enable_sales, enable_reports, enable_employees) VALUES (?, ?, ?, ?, ?)',
    ['200', 1, 1, 1, 1]
  );
  await db.execute(
    'INSERT INTO tenant_settings (tenant_id, enable_inventory, enable_sales, enable_reports, enable_employees) VALUES (?, ?, ?, ?, ?)',
    ['300', 1, 1, 1, 0]
  );

  // 3. USERS
  const sysHash = await hashPassword('sysadmin123');
  const adminHash = await hashPassword('admin123');
  const salimHash = await hashPassword('salim123');
  const omarHash = await hashPassword('omar123');
  const aliHash = await hashPassword('ali123');
  const nabilHash = await hashPassword('nabil123');
  const fatimaHash = await hashPassword('fatima123');
  const hassanHash = await hashPassword('hassan123');

  const users = [
    ['u1', '0', 'sysadmin', sysHash, 'sysadmin'],
    ['u2', '100', 'admin', adminHash, 'admin'],
    ['u3', '100', 'salim', salimHash, 'employee'],
    ['u4', '100', 'omar', omarHash, 'employee'],
    ['u5', '200', 'admin', adminHash, 'admin'],
    ['u6', '200', 'ali', aliHash, 'employee'],
    ['u7', '300', 'admin', adminHash, 'admin'],
    ['u8', '300', 'nabil', nabilHash, 'employee'],
    ['u9', '300', 'fatima', fatimaHash, 'employee'],
    ['u10', '100', 'hassan', hassanHash, 'employee'],
  ];
  for (const u of users) {
    await db.execute(
      'INSERT INTO users (id, tenant_id, username, password_hash, role) VALUES (?, ?, ?, ?, ?)',
      u
    );
  }

  // 4. PRODUCTS - المكلا الرئيسي (100)
  const products100 = [
    { id: 'p1', name: 'حليب طازج كامل الدسم 1 لتر', barcode: '6291003401211', buy: 6, sell: 7.50, qty: 80, cat: 'ألبان', unit: 'litre', min: 20, max: 200, expiry: '2026-12-25' },
    { id: 'p2', name: 'أرز بسمتي هندي 5 كجم', barcode: '6281007001402', buy: 42, sell: 52, qty: 35, cat: 'حبوب', unit: 'piece', min: 10, max: 100, expiry: '2027-06-20' },
    { id: 'p3', name: 'زيت ذرة نباتي 1.5 لتر', barcode: '6291011124454', buy: 11, sell: 14, qty: 50, cat: 'زيوت', unit: 'litre', min: 15, max: 120, expiry: '2027-03-10' },
    { id: 'p4', name: 'شاي أحمر كرك 400 كيس', barcode: '6201012345001', buy: 8, sell: 10, qty: 60, cat: 'مشروبات', unit: 'piece', min: 15, max: 100, expiry: '2027-12-01' },
    { id: 'p5', name: 'تونة قطع في الزيت 185 جرام', barcode: '6221005112023', buy: 4.50, sell: 6, qty: 100, cat: 'معلبات', unit: 'piece', min: 30, max: 200, expiry: '2027-08-15' },
    { id: 'p6', name: 'بسكويت شعري بالزبدة علبة', barcode: '6201002341109', buy: 12, sell: 16, qty: 40, cat: 'حلويات', unit: 'piece', min: 10, max: 80, expiry: '2027-04-20' },
    { id: 'p7', name: 'معكرونة سباغيتي 500 جرام', barcode: '6281007047001', buy: 3.50, sell: 5, qty: 120, cat: 'حبوب', unit: 'piece', min: 30, max: 250, expiry: '2027-09-10' },
    { id: 'p8', name: 'صلصة طماطم كاتشب 340 جرام', barcode: '8715700110608', buy: 6, sell: 8, qty: 45, cat: 'معلبات', unit: 'piece', min: 15, max: 100, expiry: '2027-07-05' },
    { id: 'p9', name: 'زبادي كاسات 6 حبات', barcode: '6281057000128', buy: 5, sell: 7, qty: 60, cat: 'ألبان', unit: 'pack', min: 20, max: 150, expiry: '2026-11-15' },
    { id: 'p10', name: 'مياه معدنية 12 × 600 مل', barcode: '6281052010104', buy: 8, sell: 11, qty: 100, cat: 'مشروبات', unit: 'pack', min: 30, max: 250, expiry: '2028-01-01' },
    { id: 'p11', name: 'سكر أبيض ناعم 5 كجم', barcode: '6281048110051', buy: 15, sell: 19, qty: 70, cat: 'أساسيات', unit: 'piece', min: 20, max: 150, expiry: '2028-06-01' },
    { id: 'p12', name: 'طحين أبيض فاخر 10 كجم', barcode: '6281001006007', buy: 20, sell: 26, qty: 40, cat: 'أساسيات', unit: 'piece', min: 10, max: 80, expiry: '2027-05-15' },
    { id: 'p13', name: 'حليب مجفف نادك 900 جرام', barcode: '6291003401299', buy: 35, sell: 42, qty: 25, cat: 'ألبان', unit: 'piece', min: 8, max: 60, expiry: '2027-01-15' },
    { id: 'p14', name: 'زيت زيتون بكر 500 مل', barcode: '6291011124500', buy: 28, sell: 35, qty: 20, cat: 'زيوت', unit: 'bottle', min: 5, max: 40, expiry: '2028-03-01' },
    { id: 'p15', name: 'جبنة بيضاء بلدية كيلو', barcode: '6281057000200', buy: 18, sell: 22, qty: 30, cat: 'ألبان', unit: 'kg', min: 10, max: 60, expiry: '2026-10-20' },
    { id: 'p16', name: 'خبز توست أبيض رغيف', barcode: '6201003000100', buy: 3, sell: 4.50, qty: 80, cat: 'مخبوزات', unit: 'piece', min: 20, max: 150, expiry: '2026-10-10' },
    { id: 'p17', name: 'بيض طازج 30 حبة', barcode: '6201005000200', buy: 18, sell: 23, qty: 40, cat: 'ألبان', unit: 'tray', min: 10, max: 80, expiry: '2026-11-01' },
    { id: 'p18', name: 'دجاج مبرد كامل 1 كجم', barcode: '6201006000300', buy: 14, sell: 18, qty: 30, cat: 'لحوم', unit: 'kg', min: 10, max: 50, expiry: '2026-10-08' },
    { id: 'p19', name: 'أرز يمني أبيض 5 كجم', barcode: '6281007001500', buy: 25, sell: 32, qty: 60, cat: 'حبوب', unit: 'piece', min: 15, max: 120, expiry: '2027-12-01' },
    { id: 'p20', name: 'عسل طبيعي يمني 500 جرام', barcode: '6201008000400', buy: 55, sell: 70, qty: 15, cat: 'أساسيات', unit: 'jar', min: 5, max: 30, expiry: '2028-12-01' },
    { id: 'p21', name: 'تمر سكري فاخر 1 كجم', barcode: '6201009000500', buy: 35, sell: 45, qty: 25, cat: 'أساسيات', unit: 'kg', min: 8, max: 50, expiry: '2027-09-01' },
    { id: 'p22', name: 'مكرونة صوابع 500 جرام', barcode: '6281007047100', buy: 3, sell: 4.50, qty: 90, cat: 'حبوب', unit: 'piece', min: 25, max: 200, expiry: '2027-08-01' },
    { id: 'p23', name: 'فول مدمس معلب 400 جرام', barcode: '6221005112100', buy: 3, sell: 4, qty: 70, cat: 'معلبات', unit: 'piece', min: 20, max: 150, expiry: '2027-11-01' },
    { id: 'p24', name: 'حمص مسلوق معلب 400 جرام', barcode: '6221005112200', buy: 3.50, sell: 4.50, qty: 50, cat: 'معلبات', unit: 'piece', min: 15, max: 100, expiry: '2027-10-01' },
    { id: 'p25', name: 'فلافل جاهزة 400 جرام', barcode: '6201007000600', buy: 8, sell: 11, qty: 35, cat: 'معلبات', unit: 'piece', min: 10, max: 60, expiry: '2026-12-01' },
    { id: 'p26', name: 'مكسرات مشكلة فاخرة 250 جرام', barcode: '6201010000700', buy: 32, sell: 42, qty: 15, cat: 'مكسرات', unit: 'piece', min: 5, max: 30, expiry: '2027-06-01' },
    { id: 'p27', name: 'زبيب ذهبي 500 جرام', barcode: '6201010000800', buy: 15, sell: 20, qty: 20, cat: 'أساسيات', unit: 'piece', min: 5, max: 40, expiry: '2027-09-01' },
    { id: 'p28', name: 'بيبسي عبوة 330 مل × 6', barcode: '6281052020100', buy: 10, sell: 13, qty: 80, cat: 'مشروبات', unit: 'pack', min: 20, max: 200, expiry: '2027-05-01' },
    { id: 'p29', name: 'عصير برتقال طبيعي 1 لتر', barcode: '6281052030200', buy: 7, sell: 9.50, qty: 40, cat: 'مشروبات', unit: 'bottle', min: 10, max: 80, expiry: '2026-12-15' },
    { id: 'p30', name: 'شيبس بطاطس كلاسيك 170 جرام', barcode: '6201011000900', buy: 6, sell: 8, qty: 55, cat: 'حلويات', unit: 'piece', min: 15, max: 100, expiry: '2027-02-01' },
    { id: 'p31', name: 'نوتيلا كركم 350 جرام', barcode: '8000500310427', buy: 22, sell: 28, qty: 18, cat: 'حلويات', unit: 'piece', min: 5, max: 40, expiry: '2027-08-01' },
    { id: 'p32', name: 'شاي أخضر أخضرول 100 كيس', barcode: '6201012345100', buy: 12, sell: 15, qty: 30, cat: 'مشروبات', unit: 'piece', min: 8, max: 60, expiry: '2027-11-01' },
    { id: 'p33', name: 'فحم شواء 5 كجم', barcode: '6201013001000', buy: 10, sell: 14, qty: 25, cat: 'أخرى', unit: 'bag', min: 5, max: 50, expiry: '2029-01-01' },
    { id: 'p34', name: 'معقم يدين 500 مل', barcode: '6201014001100', buy: 8, sell: 12, qty: 40, cat: 'عناية شخصية', unit: 'bottle', min: 10, max: 80, expiry: '2028-06-01' },
    { id: 'p35', name: 'صابون سائل 500 مل', barcode: '6201014001200', buy: 6, sell: 9, qty: 35, cat: 'عناية شخصية', unit: 'bottle', min: 10, max: 60, expiry: '2028-03-01' },
    { id: 'p36', name: 'معجون أسنان كولجيت 100 مل', barcode: '6201014001300', buy: 7, sell: 10, qty: 30, cat: 'عناية شخصية', unit: 'piece', min: 8, max: 50, expiry: '2028-09-01' },
    { id: 'p37', name: 'مناديل ورقية 5 علب', barcode: '6201014001400', buy: 12, sell: 16, qty: 25, cat: 'عناية شخصية', unit: 'pack', min: 5, max: 40, expiry: '2029-01-01' },
    { id: 'p38', name: 'أكياس قمامة كبيرة 30 كيس', barcode: '6201015001500', buy: 5, sell: 7, qty: 40, cat: 'أخرى', unit: 'pack', min: 10, max: 80, expiry: '2029-06-01' },
    { id: 'p39', name: 'ملح بحري عادي 1 كجم', barcode: '6201016001600', buy: 1.50, sell: 2.50, qty: 60, cat: 'أساسيات', unit: 'piece', min: 20, max: 120, expiry: '2029-12-01' },
    { id: 'p40', name: 'فلفل أسود مطحون 50 جرام', barcode: '6201016001700', buy: 4, sell: 6, qty: 35, cat: 'بهارات', unit: 'piece', min: 10, max: 60, expiry: '2027-12-01' },
    { id: 'p41', name: 'كمون مطحون 50 جرام', barcode: '6201016001800', buy: 3, sell: 5, qty: 30, cat: 'بهارات', unit: 'piece', min: 8, max: 50, expiry: '2027-11-01' },
    { id: 'p42', name: 'قرفة مطحونة 30 جرام', barcode: '6201016001900', buy: 5, sell: 7.50, qty: 20, cat: 'بهارات', unit: 'piece', min: 5, max: 30, expiry: '2027-10-01' },
    { id: 'p43', name: 'زيت سمسم 375 مل', barcode: '6291011124600', buy: 18, sell: 24, qty: 20, cat: 'زيوت', unit: 'bottle', min: 5, max: 40, expiry: '2027-06-01' },
    { id: 'p44', name: 'مكسرات لوز مقشر 200 جرام', barcode: '6201010002000', buy: 28, sell: 38, qty: 12, cat: 'مكسرات', unit: 'piece', min: 3, max: 25, expiry: '2027-05-01' },
    { id: 'p45', name: 'كاجو محمص 200 جرام', barcode: '6201010002100', buy: 35, sell: 48, qty: 10, cat: 'مكسرات', unit: 'piece', min: 3, max: 20, expiry: '2027-04-01' },
  ];

  for (const p of products100) {
    await db.execute(
      `INSERT INTO products (id, tenant_id, name, barcode, purchase_price, sale_price, currency, quantity, category, unit_of_measure, min_stock, max_stock, expiry_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [p.id, '100', p.name, p.barcode, p.buy, p.sell, 'SAR', p.qty, p.cat, p.unit, p.min, p.max, p.expiry]
    );
    await db.execute(
      'INSERT INTO inventory_movements (id, tenant_id, product_id, type, quantity, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [`im_${p.id}`, '100', p.id, 'in', p.qty, daysAgo(now, 45)]
    );
  }

  // 5. PRODUCTS - الدهمة (200)
  const products200 = [
    { id: 'p201', name: 'دقيق أبيض 10 كجم', barcode: '6201001002003', buy: 18, sell: 24, qty: 25, cat: 'أساسيات', unit: 'piece', min: 8, max: 50, expiry: '2027-08-01' },
    { id: 'p202', name: 'سكر بني 5 كجم', barcode: '6281048110099', buy: 15, sell: 19, qty: 30, cat: 'أساسيات', unit: 'piece', min: 10, max: 60, expiry: '2028-02-01' },
    { id: 'p203', name: 'أرز مصري 5 كجم', barcode: '6281007001419', buy: 38, sell: 48, qty: 20, cat: 'حبوب', unit: 'piece', min: 8, max: 40, expiry: '2027-10-01' },
    { id: 'p204', name: 'زيت زيتون 1 لتر', barcode: '6291011124461', buy: 25, sell: 32, qty: 15, cat: 'زيوت', unit: 'bottle', min: 5, max: 30, expiry: '2027-06-01' },
    { id: 'p205', name: 'حليب مبخر 400 جرام', barcode: '6291003401300', buy: 8, sell: 10, qty: 35, cat: 'ألبان', unit: 'piece', min: 10, max: 60, expiry: '2027-09-01' },
    { id: 'p206', name: 'تونة في الزيت 200 جرام', barcode: '6221005112300', buy: 5, sell: 7, qty: 45, cat: 'معلبات', unit: 'piece', min: 15, max: 80, expiry: '2027-07-01' },
    { id: 'p207', name: 'معكرونة قودي 400 جرام', barcode: '6281007047200', buy: 3, sell: 4, qty: 60, cat: 'حبوب', unit: 'piece', min: 20, max: 120, expiry: '2027-11-01' },
    { id: 'p208', name: 'جبنة بيضاء 500 جرام', barcode: '6281057000300', buy: 12, sell: 16, qty: 20, cat: 'ألبان', unit: 'piece', min: 5, max: 40, expiry: '2026-10-25' },
  ];

  for (const p of products200) {
    await db.execute(
      `INSERT INTO products (id, tenant_id, name, barcode, purchase_price, sale_price, currency, quantity, category, unit_of_measure, min_stock, max_stock, expiry_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [p.id, '200', p.name, p.barcode, p.buy, p.sell, 'SAR', p.qty, p.cat, p.unit, p.min, p.max, p.expiry]
    );
    await db.execute(
      'INSERT INTO inventory_movements (id, tenant_id, product_id, type, quantity, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [`im_${p.id}`, '200', p.id, 'in', p.qty, daysAgo(now, 30)]
    );
  }

  // 6. PRODUCTS - الميناء (300)
  const products300 = [
    { id: 'p301', name: 'أرز بسمتي 10 كجم', barcode: '6281007001600', buy: 75, sell: 95, qty: 12, cat: 'حبوب', unit: 'piece', min: 3, max: 25, expiry: '2027-12-01' },
    { id: 'p302', name: 'زيت ذرة 3 لتر', barcode: '6291011124700', buy: 20, sell: 26, qty: 18, cat: 'زيوت', unit: 'bottle', min: 5, max: 30, expiry: '2027-05-01' },
    { id: 'p303', name: 'سكر أبيض 10 كجم', barcode: '6281048110100', buy: 28, sell: 36, qty: 22, cat: 'أساسيات', unit: 'piece', min: 8, max: 40, expiry: '2028-08-01' },
    { id: 'p304', name: 'دجاج مجمد 2 كجم', barcode: '6201006000400', buy: 26, sell: 34, qty: 15, cat: 'لحوم', unit: 'piece', min: 5, max: 30, expiry: '2026-12-10' },
  ];

  for (const p of products300) {
    await db.execute(
      `INSERT INTO products (id, tenant_id, name, barcode, purchase_price, sale_price, currency, quantity, category, unit_of_measure, min_stock, max_stock, expiry_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [p.id, '300', p.name, p.barcode, p.buy, p.sell, 'SAR', p.qty, p.cat, p.unit, p.min, p.max, p.expiry]
    );
    await db.execute(
      'INSERT INTO inventory_movements (id, tenant_id, product_id, type, quantity, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [`im_${p.id}`, '300', p.id, 'in', p.qty, daysAgo(now, 20)]
    );
  }

  // 7. CUSTOMERS - المكلا
  const customers = [
    { id: 'c1', name: 'أحمد محمد البَعْلاني', phone: '777123456', email: 'ahmed.b@email.com', address: 'المكلا - حي الجلاء', points: 450, created: 120 },
    { id: 'c2', name: 'سالم باوزير الحازمي', phone: '777987654', email: null, address: 'المكلا - شارع 40', points: 280, created: 90 },
    { id: 'c3', name: 'فاطمة علي العولقي', phone: '733456789', email: 'fatima.a@email.com', address: 'المكلا - حي الزهراء', points: 620, created: 180 },
    { id: 'c4', name: 'محمد سالم القحطاني', phone: '712345678', email: null, address: 'المكلا - حي الميناء', points: 150, created: 45 },
    { id: 'c5', name: 'عمر عبدالرحمن الحمدي', phone: '777555123', email: 'omar.h@email.com', address: 'المكلا - حي الدهمة', points: 890, created: 240 },
    { id: 'c6', name: 'حسين أحمد باشراحيل', phone: '777111222', email: null, address: 'المكلا - شارع است_browser', points: 320, created: 75 },
    { id: 'c7', name: 'نورا محمد الصديقي', phone: '733222333', email: 'nora.s@email.com', address: 'المكلا - حي الستين', points: 180, created: 60 },
    { id: 'c8', name: 'عبدالله صالح المعمري', phone: '777333444', email: null, address: 'المكلا - حي حمود', points: 560, created: 150 },
    { id: 'c9', name: 'مها علي البيتي', phone: '733444555', email: 'maha.b@email.com', address: 'المكلا - شارع القدسي', points: 720, created: 200 },
    { id: 'c10', name: 'يوسف عبدالملك العطاس', phone: '777666777', email: null, address: 'المكلا - حي الملعب', points: 110, created: 30 },
    { id: 'c11', name: 'سمير حسين الجريري', phone: '712888999', email: 'samir.j@email.com', address: 'المكلا - شارع الثورة', points: 430, created: 110 },
    { id: 'c12', name: 'هدى أحمد الوايلي', phone: '733555666', email: null, address: 'المكلا - حي المكلا القديم', points: 290, created: 85 },
    { id: 'c13', name: 'خالد ناصر العزي', phone: '777444555', email: 'khaled.a@email.com', address: 'المكلا - حي الصومعة', points: 680, created: 195 },
    { id: 'c14', name: 'ريم سعيد العامري', phone: '733777888', email: null, address: 'المكلا - شارع الميناء', points: 195, created: 55 },
    { id: 'c15', name: 'فؤاد محمد الحجري', phone: '712999000', email: 'fouad.h@email.com', address: 'المكلا - حي الشرعة', points: 510, created: 160 },
    { id: 'c16', name: 'آمنة عبدالفتاح السقاف', phone: '777222111', email: null, address: 'المكلا - حي النصر', points: 340, created: 95 },
    { id: 'c17', name: 'طارق حسن الهمداني', phone: '733888999', email: 'tarik.h@email.com', address: 'المكلا - شارع الأربعين', points: 750, created: 210 },
    { id: 'c18', name: 'زينب عبدالله المقطري', phone: '777999000', email: null, address: 'المكلا - حي الحمراء', points: 165, created: 40 },
    { id: 'c19', name: 'ماجد يوسف العمودي', phone: '712555111', email: 'majid.y@email.com', address: 'المكلا - شارع الجلاء', points: 920, created: 270 },
    { id: 'c20', name: 'نادية حسين الشهراني', phone: '733111999', email: null, address: 'المكلا - حي الطريف', points: 240, created: 70 },
  ];

  for (const c of customers) {
    await db.execute(
      'INSERT INTO customers (id, tenant_id, name, phone, email, address, loyalty_points, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [c.id, '100', c.name, c.phone, c.email, c.address, c.points, daysAgo(now, c.created)]
    );
  }

  const cust200 = [
    { id: 'c201', name: 'أحمد الدهماني', phone: '777100200', email: null, address: 'المكلا - الدهمة', points: 320, created: 100 },
    { id: 'c202', name: 'فاطمة الميناوية', phone: '733200300', email: 'fatima.m@email.com', address: 'المكلا - حي الميناء', points: 180, created: 65 },
    { id: 'c203', name: 'علي الجلاسي', phone: '777300400', email: null, address: 'المكلا - حي الجلاء', points: 450, created: 130 },
    { id: 'c204', name: 'مريم الزهراني', phone: '712400500', email: 'mariam.z@email.com', address: 'المكلا - حي الزهراء', points: 270, created: 80 },
    { id: 'c205', name: 'ياسر الحمدي', phone: '733500600', email: null, address: 'المكلا - حي الدهمة', points: 390, created: 115 },
  ];

  for (const c of cust200) {
    await db.execute(
      'INSERT INTO customers (id, tenant_id, name, phone, email, address, loyalty_points, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [c.id, '200', c.name, c.phone, c.email, c.address, c.points, daysAgo(now, c.created)]
    );
  }

  const cust300 = [
    { id: 'c301', name: 'سعيد المينائي', phone: '777600700', email: null, address: 'المكلا - حي الميناء', points: 210, created: 90 },
    { id: 'c302', name: 'هدى الجلاسية', phone: '733700800', email: 'huda.j@email.com', address: 'المكلا - حي الجلاء', points: 155, created: 50 },
  ];

  for (const c of cust300) {
    await db.execute(
      'INSERT INTO customers (id, tenant_id, name, phone, email, address, loyalty_points, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [c.id, '300', c.name, c.phone, c.email, c.address, c.points, daysAgo(now, c.created)]
    );
  }

  // 8. SALES - المكلا الرئيسي
  const salesData = [
    { id: 's1', day: 1, by: 'salim', cust: 'c1', items: [{ pid: 'p1', qty: 4, price: 7.50 }, { pid: 'p5', qty: 6, price: 6 }, { pid: 'p10', qty: 2, price: 11 }, { pid: 'p16', qty: 3, price: 4.50 }] },
    { id: 's2', day: 1, by: 'omar', cust: null, items: [{ pid: 'p7', qty: 5, price: 5 }, { pid: 'p8', qty: 3, price: 8 }, { pid: 'p23', qty: 4, price: 4 }] },
    { id: 's3', day: 1, by: 'hassan', cust: 'c3', items: [{ pid: 'p2', qty: 2, price: 52 }, { pid: 'p11', qty: 1, price: 19 }, { pid: 'p21', qty: 1, price: 45 }] },
    { id: 's4', day: 2, by: 'salim', cust: 'c5', items: [{ pid: 'p14', qty: 2, price: 35 }, { pid: 'p20', qty: 1, price: 70 }, { pid: 'p26', qty: 2, price: 42 }] },
    { id: 's5', day: 2, by: 'admin', cust: null, items: [{ pid: 'p28', qty: 4, price: 13 }, { pid: 'p30', qty: 3, price: 8 }] },
    { id: 's6', day: 2, by: 'omar', cust: 'c2', items: [{ pid: 'p9', qty: 3, price: 7 }, { pid: 'p17', qty: 2, price: 23 }, { pid: 'p18', qty: 2, price: 18 }] },
    { id: 's7', day: 3, by: 'salim', cust: 'c4', items: [{ pid: 'p3', qty: 3, price: 14 }, { pid: 'p12', qty: 2, price: 26 }, { pid: 'p11', qty: 2, price: 19 }] },
    { id: 's8', day: 3, by: 'hassan', cust: null, items: [{ pid: 'p1', qty: 6, price: 7.50 }, { pid: 'p4', qty: 2, price: 10 }] },
    { id: 's9', day: 3, by: 'admin', cust: 'c6', items: [{ pid: 'p19', qty: 3, price: 32 }, { pid: 'p22', qty: 4, price: 4.50 }] },
    { id: 's10', day: 4, by: 'omar', cust: 'c7', items: [{ pid: 'p29', qty: 3, price: 9.50 }, { pid: 'p31', qty: 2, price: 28 }, { pid: 'p6', qty: 2, price: 16 }] },
    { id: 's11', day: 4, by: 'salim', cust: null, items: [{ pid: 'p5', qty: 8, price: 6 }, { pid: 'p24', qty: 5, price: 4.50 }] },
    { id: 's12', day: 4, by: 'hassan', cust: 'c8', items: [{ pid: 'p13', qty: 2, price: 42 }, { pid: 'p34', qty: 3, price: 12 }] },
    { id: 's13', day: 5, by: 'admin', cust: 'c9', items: [{ pid: 'p20', qty: 2, price: 70 }, { pid: 'p26', qty: 1, price: 42 }, { pid: 'p44', qty: 1, price: 38 }] },
    { id: 's14', day: 5, by: 'salim', cust: null, items: [{ pid: 'p10', qty: 5, price: 11 }, { pid: 'p28', qty: 3, price: 13 }] },
    { id: 's15', day: 5, by: 'omar', cust: 'c10', items: [{ pid: 'p16', qty: 4, price: 4.50 }, { pid: 'p17', qty: 2, price: 23 }, { pid: 'p9', qty: 3, price: 7 }] },
    { id: 's16', day: 6, by: 'hassan', cust: 'c11', items: [{ pid: 'p32', qty: 2, price: 15 }, { pid: 'p30', qty: 4, price: 8 }, { pid: 'p6', qty: 2, price: 16 }] },
    { id: 's17', day: 6, by: 'admin', cust: null, items: [{ pid: 'p2', qty: 1, price: 52 }, { pid: 'p3', qty: 2, price: 14 }, { pid: 'p11', qty: 1, price: 19 }] },
    { id: 's18', day: 6, by: 'salim', cust: 'c12', items: [{ pid: 'p25', qty: 3, price: 11 }, { pid: 'p7', qty: 6, price: 5 }] },
    { id: 's19', day: 7, by: 'omar', cust: 'c13', items: [{ pid: 'p45', qty: 2, price: 48 }, { pid: 'p21', qty: 2, price: 45 }, { pid: 'p14', qty: 1, price: 35 }] },
    { id: 's20', day: 7, by: 'hassan', cust: null, items: [{ pid: 'p15', qty: 3, price: 22 }, { pid: 'p18', qty: 4, price: 18 }, { pid: 'p1', qty: 6, price: 7.50 }] },
    { id: 's21', day: 7, by: 'admin', cust: 'c14', items: [{ pid: 'p33', qty: 2, price: 14 }, { pid: 'p35', qty: 3, price: 9 }, { pid: 'p36', qty: 2, price: 10 }] },
    { id: 's22', day: 8, by: 'salim', cust: 'c15', items: [{ pid: 'p13', qty: 3, price: 42 }, { pid: 'p20', qty: 1, price: 70 }] },
    { id: 's23', day: 8, by: 'omar', cust: null, items: [{ pid: 'p5', qty: 10, price: 6 }, { pid: 'p23', qty: 6, price: 4 }, { pid: 'p24', qty: 4, price: 4.50 }] },
    { id: 's24', day: 8, by: 'admin', cust: 'c16', items: [{ pid: 'p28', qty: 6, price: 13 }, { pid: 'p29', qty: 4, price: 9.50 }] },
    { id: 's25', day: 9, by: 'hassan', cust: 'c17', items: [{ pid: 'p2', qty: 3, price: 52 }, { pid: 'p19', qty: 2, price: 32 }, { pid: 'p3', qty: 2, price: 14 }] },
    { id: 's26', day: 9, by: 'salim', cust: null, items: [{ pid: 'p16', qty: 6, price: 4.50 }, { pid: 'p10', qty: 4, price: 11 }] },
    { id: 's27', day: 9, by: 'omar', cust: 'c18', items: [{ pid: 'p37', qty: 2, price: 16 }, { pid: 'p34', qty: 1, price: 12 }, { pid: 'p35', qty: 2, price: 9 }] },
    { id: 's28', day: 10, by: 'admin', cust: 'c19', items: [{ pid: 'p44', qty: 3, price: 38 }, { pid: 'p45', qty: 2, price: 48 }, { pid: 'p26', qty: 2, price: 42 }] },
    { id: 's29', day: 10, by: 'hassan', cust: null, items: [{ pid: 'p7', qty: 8, price: 5 }, { pid: 'p8', qty: 5, price: 8 }, { pid: 'p22', qty: 4, price: 4.50 }] },
    { id: 's30', day: 10, by: 'salim', cust: 'c20', items: [{ pid: 'p11', qty: 3, price: 19 }, { pid: 'p12', qty: 1, price: 26 }] },
    { id: 's31', day: 11, by: 'omar', cust: 'c1', items: [{ pid: 'p31', qty: 3, price: 28 }, { pid: 'p30', qty: 4, price: 8 }, { pid: 'p6', qty: 3, price: 16 }] },
    { id: 's32', day: 11, by: 'admin', cust: null, items: [{ pid: 'p1', qty: 8, price: 7.50 }, { pid: 'p9', qty: 4, price: 7 }] },
    { id: 's33', day: 11, by: 'hassan', cust: 'c3', items: [{ pid: 'p38', qty: 3, price: 7 }, { pid: 'p39', qty: 4, price: 2.50 }, { pid: 'p40', qty: 2, price: 6 }] },
    { id: 's34', day: 12, by: 'salim', cust: 'c5', items: [{ pid: 'p20', qty: 3, price: 70 }, { pid: 'p21', qty: 2, price: 45 }] },
    { id: 's35', day: 12, by: 'omar', cust: null, items: [{ pid: 'p3', qty: 4, price: 14 }, { pid: 'p10', qty: 6, price: 11 }, { pid: 'p28', qty: 4, price: 13 }] },
    { id: 's36', day: 12, by: 'admin', cust: 'c6', items: [{ pid: 'p13', qty: 4, price: 42 }, { pid: 'p14', qty: 2, price: 35 }] },
    { id: 's37', day: 13, by: 'hassan', cust: 'c8', items: [{ pid: 'p2', qty: 4, price: 52 }, { pid: 'p11', qty: 3, price: 19 }, { pid: 'p12', qty: 2, price: 26 }] },
    { id: 's38', day: 13, by: 'salim', cust: null, items: [{ pid: 'p5', qty: 12, price: 6 }, { pid: 'p23', qty: 8, price: 4 }] },
    { id: 's39', day: 13, by: 'omar', cust: 'c9', items: [{ pid: 'p44', qty: 2, price: 38 }, { pid: 'p45', qty: 1, price: 48 }, { pid: 'p27', qty: 3, price: 20 }] },
    { id: 's40', day: 14, by: 'admin', cust: 'c11', items: [{ pid: 'p17', qty: 4, price: 23 }, { pid: 'p18', qty: 3, price: 18 }, { pid: 'p1', qty: 6, price: 7.50 }] },
    { id: 's41', day: 14, by: 'hassan', cust: null, items: [{ pid: 'p7', qty: 10, price: 5 }, { pid: 'p22', qty: 6, price: 4.50 }, { pid: 'p24', qty: 5, price: 4.50 }] },
    { id: 's42', day: 14, by: 'salim', cust: 'c13', items: [{ pid: 'p20', qty: 2, price: 70 }, { pid: 'p26', qty: 2, price: 42 }] },
    { id: 's43', day: 15, by: 'omar', cust: 'c15', items: [{ pid: 'p15', qty: 4, price: 22 }, { pid: 'p16', qty: 6, price: 4.50 }, { pid: 'p9', qty: 4, price: 7 }] },
    { id: 's44', day: 15, by: 'admin', cust: null, items: [{ pid: 'p10', qty: 8, price: 11 }, { pid: 'p28', qty: 6, price: 13 }, { pid: 'p29', qty: 4, price: 9.50 }] },
    { id: 's45', day: 15, by: 'hassan', cust: 'c17', items: [{ pid: 'p13', qty: 3, price: 42 }, { pid: 'p21', qty: 2, price: 45 }, { pid: 'p31', qty: 2, price: 28 }] },
    { id: 's46', day: 0, by: 'salim', cust: 'c19', items: [{ pid: 'p44', qty: 4, price: 38 }, { pid: 'p45', qty: 3, price: 48 }, { pid: 'p20', qty: 2, price: 70 }, { pid: 'p26', qty: 2, price: 42 }] },
    { id: 's47', day: 0, by: 'omar', cust: null, items: [{ pid: 'p1', qty: 10, price: 7.50 }, { pid: 'p5', qty: 15, price: 6 }, { pid: 'p7', qty: 8, price: 5 }] },
    { id: 's48', day: 0, by: 'admin', cust: 'c1', items: [{ pid: 'p2', qty: 3, price: 52 }, { pid: 'p19', qty: 2, price: 32 }, { pid: 'p3', qty: 3, price: 14 }] },
    { id: 's49', day: 0, by: 'hassan', cust: 'c4', items: [{ pid: 'p28', qty: 6, price: 13 }, { pid: 'p30', qty: 4, price: 8 }, { pid: 'p6', qty: 3, price: 16 }] },
    { id: 's50', day: 0, by: 'salim', cust: null, items: [{ pid: 'p33', qty: 4, price: 14 }, { pid: 'p34', qty: 3, price: 12 }, { pid: 'p35', qty: 4, price: 9 }, { pid: 'p36', qty: 3, price: 10 }] },
  ];

  for (const sale of salesData) {
    const saleDate = daysAgo(now, sale.day);
    const total = sale.items.reduce((sum, i) => sum + i.qty * i.price, 0);
    const discount = Math.random() > 0.7 ? Math.round(total * 0.05 * 100) / 100 : 0;
    const finalTotal = total - discount;
    await db.execute(
      'INSERT INTO sales (id, tenant_id, total, discount, discount_type, final_total, created_by, created_at, customer_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [sale.id, '100', total, discount, discount > 0 ? 'percentage' : null, finalTotal, sale.by, saleDate, sale.cust]
    );
    for (let idx = 0; idx < sale.items.length; idx++) {
      const item = sale.items[idx];
      await db.execute(
        'INSERT INTO sale_items (id, sale_id, product_id, qty, price) VALUES (?, ?, ?, ?, ?)',
        [`${sale.id}_item${idx}`, sale.id, item.pid, item.qty, item.price]
      );
      await db.execute(
        'INSERT INTO inventory_movements (id, tenant_id, product_id, type, quantity, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [`mov_${sale.id}_${idx}`, '100', item.pid, 'out', item.qty, saleDate]
      );
    }
  }

  // 9. EXCHANGE RATES
  await db.execute(
    'INSERT INTO exchange_rates (id, tenant_id, sar_to_yer, updated_at) VALUES (?, ?, ?, ?)',
    ['rate1', '100', 395.0, now.toISOString()]
  );
  await db.execute(
    'INSERT INTO exchange_rates (id, tenant_id, sar_to_yer, updated_at) VALUES (?, ?, ?, ?)',
    ['rate2', '200', 396.0, daysAgo(now, 3)]
  );
  await db.execute(
    'INSERT INTO exchange_rates (id, tenant_id, sar_to_yer, updated_at) VALUES (?, ?, ?, ?)',
    ['rate3', '300', 395.5, daysAgo(now, 5)]
  );

  // 10. NOTIFICATIONS
  const notifications = [
    { tid: '100', title: 'مرحباً بكم في سوبرماركت المكلا الرئيسي', message: 'تم تهيئة النظام بنجاح. جاهزين للعمل!', type: 'success' },
    { tid: '100', title: 'تنبيه مخزون منخفض', message: 'المنتج "مكسرات لوز مقشر" وصل إلى 12 وحدة فقط.', type: 'warning' },
    { tid: '100', title: 'تنبيه انتهاء صلاحية', message: 'المنتج "جبنة بيضاء بلدية" سينتهي خلال 5 أيام.', type: 'warning' },
    { tid: '100', title: 'تقرير المبيعات الأسبوعي', message: 'تم إنجاز 50 فاتورة بيع هذا الأسبوع. إجمالي المبيعات: 12,500 SAR', type: 'info' },
    { tid: '100', title: 'عميل مميز', message: 'العميل "فؤاد محمد الحجري" تجاوز 500 نقطة ولاء!', type: 'success' },
    { tid: '100', title: 'مخزون منخفض - كاجو', message: 'المنتج "كاجو محمص 200 جرام" وصل إلى 10 وحدات.', type: 'danger' },
    { tid: '200', title: 'مرحباً بكم في بقالة الدهمة', message: 'تم تفعيل جميع الميزات بنجاح.', type: 'success' },
    { tid: '200', title: 'تنبيه مخزون منخفض', message: 'المنتج "جبنة بيضاء 500 جرام" وصل إلى 20 وحدة.', type: 'warning' },
    { tid: '300', title: 'مرحباً بكم في محلات الميناء التجارية', message: 'تم إعداد النظام بنجاح.', type: 'success' },
    { tid: '300', title: 'تنبيه انتهاء الاشتراك', message: 'سينتهي اشتراككم في نهاية 2028. يُنصح بالتجديد.', type: 'danger' },
  ];

  for (let i = 0; i < notifications.length; i++) {
    const n = notifications[i];
    await db.execute(
      'INSERT INTO notifications (id, tenant_id, title, message, type, is_read, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [`notif_${i + 1}`, n.tid, n.title, n.message, n.type, i < 3 ? 1 : 0, daysAgo(now, notifications.length - i)]
    );
  }

  // 11. FINANCIAL COSTS
  const costs = [
    { tid: '100', cat: 'rent', desc: 'إيجار محل المكلا الرئيسي - يونيو', amount: 8000, day: 25 },
    { tid: '100', cat: 'salary', desc: 'رواتب الموظفين - 4 موظفين', amount: 12000, day: 25 },
    { tid: '100', cat: 'utilities', desc: 'فاتورة كهرباء المتجر - مايو', amount: 850, day: 20 },
    { tid: '100', cat: 'utilities', desc: 'فاتورة مياه - مايو', amount: 280, day: 18 },
    { tid: '100', cat: 'transport', desc: 'نقل بضاعة من مستودع عدن', amount: 650, day: 15 },
    { tid: '100', cat: 'transport', desc: 'توصيل طلبيات العملاء الكبار', amount: 350, day: 12 },
    { tid: '100', cat: 'other', desc: 'صيانة مكيفات المتجر', amount: 1200, day: 10 },
    { tid: '100', cat: 'other', desc: 'مستلزمات تغليف وأكياس نايلون', amount: 450, day: 8 },
    { tid: '100', cat: 'utilities', desc: 'اشتراك الإنترنت الشهري', amount: 200, day: 5 },
    { tid: '100', cat: 'other', desc: 'إصلاح ثلاجة العرض الكبيرة', amount: 800, day: 3 },
    { tid: '100', cat: 'transport', desc: 'شحن بضاعة من صنعاء', amount: 1500, day: 1 },
    { tid: '200', cat: 'rent', desc: 'إيجار محل الدهمة - يونيو', amount: 4500, day: 25 },
    { tid: '200', cat: 'salary', desc: 'راتب الموظف علي', amount: 3000, day: 25 },
    { tid: '200', cat: 'utilities', desc: 'فاتورة كهرباء - مايو', amount: 450, day: 20 },
    { tid: '200', cat: 'transport', desc: 'نقل بضاعة محلية', amount: 250, day: 10 },
    { tid: '200', cat: 'other', desc: 'مواد تنظيف للمحل', amount: 180, day: 5 },
    { tid: '300', cat: 'rent', desc: 'إيجار محل الميناء - يونيو', amount: 6000, day: 25 },
    { tid: '300', cat: 'salary', desc: 'رواتب الموظفين - نabil و فاطمة', amount: 6000, day: 25 },
    { tid: '300', cat: 'utilities', desc: 'فاتورة كهرباء - مايو', amount: 600, day: 18 },
    { tid: '300', cat: 'transport', desc: 'شحن بحري من عدن', amount: 800, day: 8 },
  ];

  for (let i = 0; i < costs.length; i++) {
    const c = costs[i];
    await db.execute(
      'INSERT INTO financial_costs (id, tenant_id, category, description, amount, currency, cost_date, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [`cost_${i + 1}`, c.tid, c.cat, c.desc, c.amount, 'SAR', daysAgo(now, c.day).split('T')[0], 'admin', daysAgo(now, c.day)]
    );
  }

  // 12. COUPONS
  const coupons = [
    { id: 'coupon1', code: 'MUKALLA10', type: 'percentage', value: 10, maxUses: 200, used: 45, minTotal: 50, expires: '2027-12-31', active: true, created: 60 },
    { id: 'coupon2', code: 'SAVE50', type: 'fixed', value: 50, maxUses: 100, used: 18, minTotal: 200, expires: '2027-06-30', active: true, created: 30 },
    { id: 'coupon3', code: 'VIP100', type: 'fixed', value: 100, maxUses: 50, used: 8, minTotal: 500, expires: '2027-12-31', active: true, created: 90 },
    { id: 'coupon4', code: 'RAMADAN20', type: 'percentage', value: 20, maxUses: 300, used: 120, minTotal: 100, expires: '2027-06-30', active: true, created: 120 },
    { id: 'coupon5', code: 'NEWYEAR15', type: 'percentage', value: 15, maxUses: 150, used: 65, minTotal: 75, expires: '2027-12-31', active: true, created: 45 },
    { id: 'coupon6', code: 'LOYALTY25', type: 'percentage', value: 25, maxUses: 30, used: 12, minTotal: 300, expires: '2027-06-30', active: true, created: 15 },
  ];

  for (const c of coupons) {
    await db.execute(
      'INSERT INTO coupons (id, tenant_id, code, discount_type, discount_value, max_uses, used_count, min_cart_total, expires_at, is_active, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [c.id, '100', c.code, c.type, c.value, c.maxUses, c.used, c.minTotal, daysAgo(now, -365).split('T')[0], c.active ? 1 : 0, daysAgo(now, c.created)]
    );
  }

  // 13. PRODUCT RETURNS
  const returns = [
    { id: 'ret1', saleId: 's6', refund: 36, reason: 'دجاج تالف - رائحة كريهة', by: 'admin', day: 10, items: [{ pid: 'p18', qty: 2, price: 18 }] },
    { id: 'ret2', saleId: 's10', refund: 56, reason: 'نوتيلا منتهية الصلاحية', by: 'salim', day: 7, items: [{ pid: 'p31', qty: 2, price: 28 }] },
    { id: 'ret3', saleId: 's16', refund: 32, reason: 'شيبس متكسر - عبوة مفتوحة', by: 'omar', day: 5, items: [{ pid: 'p30', qty: 4, price: 8 }] },
    { id: 'ret4', saleId: 's22', refund: 70, reason: 'العميل غير راضٍ عن العسل', by: 'admin', day: 3, items: [{ pid: 'p20', qty: 1, price: 70 }] },
  ];

  for (const r of returns) {
    const retDate = daysAgo(now, r.day);
    await db.execute(
      'INSERT INTO product_returns (id, tenant_id, sale_id, total_refund, reason, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [r.id, '100', r.saleId, r.refund, r.reason, r.by, retDate]
    );
    for (let idx = 0; idx < r.items.length; idx++) {
      const item = r.items[idx];
      await db.execute(
        'INSERT INTO return_items (id, return_id, product_id, qty, price) VALUES (?, ?, ?, ?, ?)',
        [`${r.id}_item${idx}`, r.id, item.pid, item.qty, item.price]
      );
      await db.execute(
        'INSERT INTO inventory_movements (id, tenant_id, product_id, type, quantity, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [`mov_return_${r.id}_${idx}`, '100', item.pid, 'in', item.qty, retDate]
      );
    }
  }

  // 14. DEBTS
  const debts = [
    { id: 'd1', cust: 'c5', amount: 2500, desc: 'ديون تجميعية - شهر مايو', status: 'pending', by: 'admin', day: 30 },
    { id: 'd2', cust: 'c13', amount: 1800, desc: 'مشتريات شهر يونيو', status: 'pending', by: 'admin', day: 20 },
    { id: 'd3', cust: 'c9', amount: 3200, desc: 'ديون عميل مميز', status: 'partial', by: 'admin', day: 15 },
    { id: 'd4', cust: 'c1', amount: 500, desc: 'مبلغ متبقي من فاتورة سابقة', status: 'paid', by: 'admin', day: 10 },
    { id: 'd5', cust: 'c15', amount: 1200, desc: 'مشتريات بالآجل', status: 'pending', by: 'admin', day: 5 },
    { id: 'd6', cust: 'c8', amount: 800, desc: 'دين شهر مايو', status: 'partial', by: 'admin', day: 25 },
    { id: 'd7', cust: 'c19', amount: 4500, desc: 'عميل جملة - ديون كبيرة', status: 'pending', by: 'admin', day: 2 },
  ];

  for (const d of debts) {
    await db.execute(
      'INSERT INTO debts (id, tenant_id, customer_id, amount, currency, description, status, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [d.id, '100', d.cust, d.amount, 'SAR', d.desc, d.status, d.by, daysAgo(now, d.day)]
    );
  }

  // 15. PROMOTIONS
  const promotions = [
    { id: 'promo1', name: 'عرض 2 + 1 المجاني على التونة', type: 'buy_x_get_y', pid: 'p5', minQty: 2, freeQty: 1, discount: null, from: 30, to: 30 },
    { id: 'promo2', name: 'خصم 15% على المكسرات', type: 'discount', pid: null, minQty: 0, freeQty: 0, discount: 15, from: 20, to: 20 },
    { id: 'promo3', name: 'عرض عيد الأضحى - خصم 10%', type: 'discount', pid: null, minQty: 0, freeQty: 0, discount: 10, from: 10, to: 10 },
    { id: 'promo4', name: '3 + 1 على المعكرونة', type: 'buy_x_get_y', pid: 'p7', minQty: 3, freeQty: 1, discount: null, from: 15, to: 15 },
  ];

  for (const pr of promotions) {
    await db.execute(
      'INSERT INTO promotions (id, tenant_id, name, type, product_id, min_qty, free_qty, discount_percent, valid_from, valid_to, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [pr.id, '100', pr.name, pr.type, pr.pid, pr.minQty, pr.freeQty, pr.discount, daysAgo(now, -pr.from).split('T')[0], daysAgo(now, -pr.to).split('T')[0], 1]
    );
  }

  // 16. AUDIT LOGS
  const auditEntries = [
    { action: 'تهيئة نظام سوبرماركت المكلا الرئيسي', by: 'System', day: 45 },
    { action: 'تسجيل دخول المدير', by: 'admin', day: 40 },
    { action: 'إضافة 45 منتج للمخزون', by: 'admin', day: 40 },
    { action: 'تسجيل أول فاتورة بيع - 167 SAR', by: 'salim', day: 39 },
    { action: 'إضافة 20 عميل لنظام الولاء', by: 'admin', day: 38 },
    { action: 'تعديل سعر صرف الريال إلى 395 ي.ر', by: 'admin', day: 35 },
    { action: 'إنشاء 6 كوبونات خصم للموسم', by: 'admin', day: 30 },
    { action: 'تسجيل 15 فاتورة بيع في يوم واحد', by: 'salim', day: 25 },
    { action: 'إضافة 7 ديون عملاء', by: 'admin', day: 20 },
    { action: 'معالجة 4 مرتجعات', by: 'omar', day: 15 },
    { action: 'إنشاء 4 عروض ترويجية', by: 'admin', day: 10 },
    { action: 'تسجيل دخول الموظف حسن', by: 'hassan', day: 8 },
    { action: 'إضافة تكاليف مالية شهرية - 24,480 SAR', by: 'admin', day: 5 },
    { action: 'تحديث أسعار 8 منتجات', by: 'admin', day: 3 },
    { action: 'معالجة مرتجع جديد - عسل', by: 'admin', day: 1 },
    { action: 'تهيئة بقالة الدهمة للتموين', by: 'System', day: 30 },
    { action: 'إضافة 8 منتجات للدهمة', by: 'admin', day: 30 },
    { action: 'تهيئة محلات الميناء التجارية', by: 'System', day: 20 },
    { action: 'إضافة 4 منتجات للميناء', by: 'admin', day: 20 },
  ];

  for (let i = 0; i < auditEntries.length; i++) {
    const a = auditEntries[i];
    const tid = a.day >= 30 && a.day <= 45 ? '100' : a.day <= 30 && a.day >= 20 ? '200' : '100';
    await db.execute(
      'INSERT INTO audit_logs (id, tenant_id, action, performed_by, created_at) VALUES (?, ?, ?, ?, ?)',
      [`log_${i + 1}`, tid, a.action, a.by, daysAgo(now, a.day)]
    );
  }

  console.log('[Seed] ✅ Mukalla data seeded successfully!');
}

function daysAgo(from: Date, days: number): string {
  const d = new Date(from);
  d.setDate(d.getDate() - days);
  d.setHours(8 + Math.floor(Math.random() * 10), Math.floor(Math.random() * 60));
  return d.toISOString();
}
