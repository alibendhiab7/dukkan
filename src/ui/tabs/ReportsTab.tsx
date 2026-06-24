// src/ui/tabs/ReportsTab.tsx
import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useSalesStore } from '../../store/salesStore';
import { useToastStore } from '../../store/toastStore';
import { salesRepo, productRepo } from '../../core/repositories/turso';
import type { SaleItem, Product, Sale } from '../../core/repositories/interfaces';
import { strings } from '../../i18n';
import {
  TrendingUp, DollarSign, Briefcase, Eye, Percent, ArrowLeftRight,
  Download, Filter, AlertTriangle, Award, BarChart3
} from 'lucide-react';

type ReportTab = 'overview' | 'topProducts' | 'profitPerProduct' | 'lowStock' | 'comparison';

const ReportsTab: React.FC = () => {
  const { tenant } = useAuthStore();
  const { sales, exchangeRate, loadExchangeRate } = useSalesStore();
  const { addToast } = useToastStore();

  const [stats, setStats] = useState<any | null>(null);
  const [selectedSale, setSelectedSale] = useState<any | null>(null);
  const [selectedSaleItems, setSelectedSaleItems] = useState<SaleItem[]>([]);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [costOfSales, setCostOfSales] = useState(0);

  // Date range filter
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [filteredSales, setFilteredSales] = useState<Sale[]>([]);

  // Selected custom filters
  const [filterCashier, setFilterCashier] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterProduct, setFilterProduct] = useState('');

  // Dropdown lists
  const [cashiers, setCashiers] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);

  // Active sub-tab
  const [activeReport, setActiveReport] = useState<ReportTab>('overview');
  const [printMode, setPrintMode] = useState<'current' | 'comprehensive' | null>(null);

  // Top products data
  const [topProducts, setTopProducts] = useState<{ name: string; qty: number; revenue: number }[]>([]);

  // Profit per product data
  const [profitPerProduct, setProfitPerProduct] = useState<{ name: string; revenue: number; cost: number; profit: number; margin: number }[]>([]);

  // Low stock data
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);

  // Comparison
  const [compFrom1, setCompFrom1] = useState('');
  const [compTo1, setCompTo1] = useState('');
  const [compFrom2, setCompFrom2] = useState('');
  const [compTo2, setCompTo2] = useState('');
  const [compResult1, setCompResult1] = useState<{ count: number; total: number }>({ count: 0, total: 0 });
  const [compResult2, setCompResult2] = useState<{ count: number; total: number }>({ count: 0, total: 0 });

  useEffect(() => {
    if (tenant) loadAllData();
  }, [tenant]);

  useEffect(() => {
    if (tenant) {
      applyAllFilters();
    }
  }, [tenant, sales, dateFrom, dateTo, filterCashier, filterCategory, filterProduct]);

  const loadAllData = async () => {
    if (!tenant) return;

    // Load exchange rate
    loadExchangeRate(tenant.id);

    // Initial calculations
    await applyAllFilters();
  };

  const applyAllFilters = async () => {
    if (!tenant) return;

    // 1. Fetch raw data from database
    const salesHistory = await salesRepo.getAll(tenant.id);
    const products = await productRepo.getAll(tenant.id);
    const prodMap = new Map(products.map(p => [p.id, p]));

    // 2. Set unique lists for filters
    const uniqueCashiers = Array.from(new Set(salesHistory.map(s => s.created_by))).filter(Boolean) as string[];
    const uniqueCategories = Array.from(new Set(products.map(p => p.category).filter(Boolean))) as string[];
    
    setCashiers(uniqueCashiers);
    setCategories(uniqueCategories);
    setAllProducts(products);

    // 3. Filter Sales by date & cashier
    let filteredSalesList = [...salesHistory];
    if (dateFrom) {
      filteredSalesList = filteredSalesList.filter(s => new Date(s.created_at) >= new Date(dateFrom));
    }
    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59);
      filteredSalesList = filteredSalesList.filter(s => new Date(s.created_at) <= toDate);
    }
    if (filterCashier) {
      filteredSalesList = filteredSalesList.filter(s => s.created_by === filterCashier);
    }

    // 4. Calculate cost of sales & revenue contribution matching category/product filters
    let totalRevenue = 0;
    let totalCost = 0;
    let matchingSalesCount = 0;
    const productSalesMap = new Map<string, { name: string; qty: number; revenue: number; cost: number }>();

    for (const s of filteredSalesList) {
      const items = await salesRepo.getItems(s.id);
      let saleMatchesFilters = false;
      let saleRevenueContribution = 0;

      for (const item of items) {
        const prod = prodMap.get(item.product_id);
        
        // Filter by category or specific product
        if (filterCategory && prod?.category !== filterCategory) continue;
        if (filterProduct && item.product_id !== filterProduct) continue;

        const costPrice = prod ? prod.purchase_price : (item.price * 0.8);
        totalCost += (costPrice * item.qty);
        saleRevenueContribution += (item.qty * item.price);
        saleMatchesFilters = true;

        const existing = productSalesMap.get(item.product_id);
        if (existing) {
          existing.qty += item.qty;
          existing.revenue += item.qty * item.price;
          existing.cost += costPrice * item.qty;
        } else {
          productSalesMap.set(item.product_id, {
            name: item.product_name || 'غير معروف',
            qty: item.qty,
            revenue: item.qty * item.price,
            cost: costPrice * item.qty,
          });
        }
      }

      if (saleMatchesFilters) {
        matchingSalesCount++;
        totalRevenue += saleRevenueContribution;
      }
    }

    setCostOfSales(totalCost);
    
    // Top products
    const topProds = Array.from(productSalesMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
    setTopProducts(topProds);

    // Profit per product
    const profitData = Array.from(productSalesMap.values()).map(p => ({
      name: p.name,
      revenue: p.revenue,
      cost: p.cost,
      profit: p.revenue - p.cost,
      margin: p.revenue > 0 ? ((p.revenue - p.cost) / p.revenue) * 100 : 0,
    })).sort((a, b) => b.profit - a.profit);
    setProfitPerProduct(profitData);

    // Low stock products filtered by category if selected
    const lowStock = await productRepo.getLowStock(tenant.id, 10);
    const filteredLowStock = lowStock.filter(p => !filterCategory || p.category === filterCategory);
    setLowStockProducts(filteredLowStock);

    setFilteredSales(filteredSalesList);

    // Calculate inventory valuation for this selection
    const filteredProducts = products.filter(p => !filterCategory || p.category === filterCategory);
    const inventoryValuation = filteredProducts.reduce((sum, p) => sum + (p.purchase_price * p.quantity), 0);

    // Calculate daily chart data
    const salesByDateMap = new Map<string, number>();
    filteredSalesList.forEach(s => {
      const dateStr = new Date(s.created_at).toLocaleDateString('ar-YE', { day: 'numeric', month: 'short' });
      salesByDateMap.set(dateStr, (salesByDateMap.get(dateStr) || 0) + s.total);
    });

    const salesByDate = Array.from(salesByDateMap.entries()).map(([date, amount]) => ({
      date,
      amount
    })).slice(0, 7).reverse();

    setStats({
      salesCount: matchingSalesCount,
      totalRevenueSar: totalRevenue,
      totalProfitSar: totalRevenue - totalCost,
      inventoryValuationSar: inventoryValuation,
      salesByDate: salesByDate.length > 0 ? salesByDate : [{ date: 'اليوم', amount: 0 }]
    });
  };

  const handleViewInvoice = async (sale: any) => {
    try {
      const items = await salesRepo.getItems(sale.id);
      setSelectedSale(sale);
      setSelectedSaleItems(items);
      setShowInvoiceModal(true);
    } catch (e) {
      addToast('error', 'فشل تحميل تفاصيل الفاتورة');
    }
  };

  const exportToCSV = (data: any[], filename: string) => {
    if (data.length === 0) {
      addToast('warning', 'لا توجد بيانات للتصدير');
      return;
    }
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(h => `"${row[h]}"`).join(','))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    addToast('success', 'تم تصدير البيانات بنجاح');
  };

  if (!stats) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '40vh' }}>
        <p style={{ color: 'var(--primary)', fontWeight: 'bold' }}>جاري احتساب التقارير...</p>
      </div>
    );
  }

  const profitMarginPercent = stats.totalRevenueSar > 0
    ? (stats.totalProfitSar / stats.totalRevenueSar) * 100 : 0;

  const rateVal = exchangeRate?.sar_to_yer || 395;
  const formatMoney = (sarAmount: number) => {
    const yerAmount = sarAmount * rateVal;
    return {
      sar: `${sarAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س`,
      yer: `${Math.round(yerAmount).toLocaleString()} ر.ي`,
      combined: `${Math.round(yerAmount).toLocaleString()} ر.ي (${sarAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س)`
    };
  };

  const chartHeight = 100;
  const chartWidth = 480;
  const maxRevenueVal = Math.max(...stats.salesByDate.map((d: any) => d.amount), 100);
  const barWidth = 35;
  const gap = 25;

  const reportTabs = [
    { id: 'overview' as ReportTab, label: 'نظرة عامة', icon: BarChart3 },
    { id: 'topProducts' as ReportTab, label: 'الأكثر مبيعاً', icon: Award },
    { id: 'profitPerProduct' as ReportTab, label: 'أرباح المنتجات', icon: DollarSign },
    { id: 'lowStock' as ReportTab, label: 'المخزون المنخفض', icon: AlertTriangle },
    { id: 'comparison' as ReportTab, label: 'مقارنة الفترات', icon: ArrowLeftRight },
  ];

  const runComparison = async () => {
    if (!tenant) return;
    const allSales = await salesRepo.getAll(tenant.id);

    const filterByDate = (from: string, to: string) => {
      let filtered = allSales;
      if (from) filtered = filtered.filter(s => new Date(s.created_at) >= new Date(from));
      if (to) { const d = new Date(to); d.setHours(23, 59, 59); filtered = filtered.filter(s => new Date(s.created_at) <= d); }
      return { count: filtered.length, total: filtered.reduce((sum, s) => sum + s.total, 0) };
    };

    setCompResult1(filterByDate(compFrom1, compTo1));
    setCompResult2(filterByDate(compFrom2, compTo2));
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ color: 'var(--primary)' }}>{strings.reports.title}</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>التحليل المالي وتتبع التكاليف والأرباح</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => setPrintMode('current')}
            className="btn btn-secondary"
            style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <span>طباعة التقرير الحالي</span>
          </button>
          <button
            onClick={() => setPrintMode('comprehensive')}
            className="btn btn-primary"
            style={{ border: 'none', padding: '0.5rem 1rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <span>طباعة التقرير الشامل PDF</span>
          </button>
        </div>
      </div>

      {/* Custom Filters Panel */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
          <Filter size={18} style={{ color: 'var(--primary)' }} />
          <span style={{ fontWeight: '800', fontSize: '0.9rem' }}>تصفية التقارير المتقدمة المخصصة</span>
        </div>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '1rem'
        }}>
          {/* Date From */}
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label className="input-label" style={{ fontSize: '0.75rem' }}>تاريخ من</label>
            <input type="date" className="input-field" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={{ padding: '0.45rem 0.65rem', fontSize: '0.8rem' }} />
          </div>

          {/* Date To */}
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label className="input-label" style={{ fontSize: '0.75rem' }}>تاريخ إلى</label>
            <input type="date" className="input-field" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={{ padding: '0.45rem 0.65rem', fontSize: '0.8rem' }} />
          </div>

          {/* Cashier Filter */}
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label className="input-label" style={{ fontSize: '0.75rem' }}>الموظف / الكاشير</label>
            <select className="input-field" value={filterCashier} onChange={(e) => setFilterCashier(e.target.value)} style={{ padding: '0.45rem 0.65rem', fontSize: '0.8rem' }}>
              <option value="">كل الكاشيرات</option>
              {cashiers.map((c, i) => (
                <option key={i} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label className="input-label" style={{ fontSize: '0.75rem' }}>تصنيف المنتجات</label>
            <select className="input-field" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} style={{ padding: '0.45rem 0.65rem', fontSize: '0.8rem' }}>
              <option value="">كل التصنيفات</option>
              {categories.map((c, i) => (
                <option key={i} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Product Filter */}
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label className="input-label" style={{ fontSize: '0.75rem' }}>منتج محدد</label>
            <select className="input-field" value={filterProduct} onChange={(e) => setFilterProduct(e.target.value)} style={{ padding: '0.45rem 0.65rem', fontSize: '0.8rem' }}>
              <option value="">كل المنتجات</option>
              {allProducts.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
          <button
            onClick={() => {
              setDateFrom('');
              setDateTo('');
              setFilterCashier('');
              setFilterCategory('');
              setFilterProduct('');
            }}
            className="btn btn-secondary"
            style={{ padding: '0.45rem 1rem', fontSize: '0.8rem' }}
          >
            إعادة تعيين الفلاتر
          </button>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '700' }}>
            عدد الفواتير المطابقة: {filteredSales.length} فاتورة
          </span>
        </div>
      </div>

      {/* Report Sub-tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {reportTabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveReport(tab.id)}
              className="btn"
              style={{
                padding: '0.55rem 1rem',
                fontSize: '0.8rem',
                backgroundColor: activeReport === tab.id ? 'var(--primary)' : 'var(--surface)',
                color: activeReport === tab.id ? 'var(--text-light)' : 'var(--text)',
                border: '1px solid var(--border)',
                fontWeight: activeReport === tab.id ? '700' : 'normal',
              }}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* OVERVIEW TAB */}
      {activeReport === 'overview' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
            <div className="card" style={{ borderRight: '4px solid var(--success)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>إجمالي المبيعات</span>
                <TrendingUp size={20} style={{ color: 'var(--success)' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ fontSize: '1.5rem', color: 'var(--success)', fontWeight: '800' }}>
                  {formatMoney(stats.totalRevenueSar).yer}
                </h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{formatMoney(stats.totalRevenueSar).sar}</span>
              </div>
            </div>
            <div className="card" style={{ borderRight: '4px solid var(--primary)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>تكلفة البضاعة المباعة</span>
                <ArrowLeftRight size={20} style={{ color: 'var(--primary)' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ fontSize: '1.5rem', color: 'var(--primary)', fontWeight: '800' }}>
                  {formatMoney(costOfSales).yer}
                </h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{formatMoney(costOfSales).sar}</span>
              </div>
            </div>
            <div className="card" style={{ borderRight: '4px solid var(--secondary-dark)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>صافي الأرباح</span>
                <DollarSign size={20} style={{ color: 'var(--secondary-dark)' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ fontSize: '1.5rem', color: 'var(--secondary-dark)', fontWeight: '800' }}>
                  {formatMoney(stats.totalProfitSar).yer}
                </h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{formatMoney(stats.totalProfitSar).sar}</span>
              </div>
            </div>
            <div className="card" style={{ borderRight: '4px solid var(--success)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>هامش الربح</span>
                <Percent size={20} style={{ color: 'var(--success)' }} />
              </div>
              <h3 style={{ fontSize: '1.6rem', color: 'var(--success)' }}>{profitMarginPercent.toFixed(1)}%</h3>
            </div>
            <div className="card" style={{ borderRight: '4px solid var(--text)', gridColumn: '1 / -1' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>رأس المال المجمد بالمخزن</span>
                <Briefcase size={20} style={{ color: 'var(--text)' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ fontSize: '1.6rem', color: 'var(--primary)', fontWeight: '800' }}>
                  {formatMoney(stats.inventoryValuationSar).yer}
                </h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{formatMoney(stats.inventoryValuationSar).sar}</span>
              </div>
            </div>
          </div>

          {/* Revenue Chart */}
          <div className="card">
            <h3 style={{ fontSize: '1rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>مؤشر المبيعات اليومية</h3>
            <div style={{ display: 'flex', justifyContent: 'center', overflowX: 'auto', padding: '1rem 0' }}>
              <svg width="100%" height="150" viewBox={`0 0 ${chartWidth} 150`} style={{ maxWidth: '420px', direction: 'ltr' }}>
                <line x1="30" y1="20" x2="450" y2="20" stroke="var(--border)" strokeDasharray="3 3" />
                <line x1="30" y1="60" x2="450" y2="60" stroke="var(--border)" strokeDasharray="3 3" />
                <line x1="30" y1="100" x2="450" y2="100" stroke="var(--border)" />
                {stats.salesByDate.map((d: any, index: number) => {
                  const height = (d.amount / maxRevenueVal) * chartHeight;
                  const x = 40 + index * (barWidth + gap);
                  const y = 100 - height;
                  return (
                    <g key={index}>
                      <rect x={x} y={y} width={barWidth} height={height} fill="var(--primary)" rx="3" />
                      <text x={x + barWidth / 2} y={y - 5} textAnchor="middle" fontSize="9" fill="var(--text)" fontWeight="bold">{d.amount.toFixed(0)}</text>
                      <text x={x + barWidth / 2} y="118" textAnchor="middle" fontSize="9" fill="var(--text-muted)">{d.date}</text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          {/* Sales List */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3>فواتير المبيعات ({filteredSales.length})</h3>
              <button onClick={() => exportToCSV(filteredSales.map(s => ({
                رقم_الفاتورة: s.id, التاريخ: s.created_at, الكاشير: s.created_by, الإجمالي: s.total
              })), 'sales-report')} className="btn btn-secondary" style={{ padding: '0.45rem 0.75rem', fontSize: '0.8rem' }}>
                <Download size={14} /> تصدير CSV
              </button>
            </div>
            <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--background)', borderBottom: '2px solid var(--border)' }}>
                    <th style={{ padding: '1rem' }}>رقم الفاتورة</th>
                    <th style={{ padding: '1rem' }}>التاريخ</th>
                    <th style={{ padding: '1rem' }}>الكاشير</th>
                    <th style={{ padding: '1rem' }}>الإجمالي</th>
                    <th style={{ padding: '1rem', textAlign: 'left' }}>الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSales.slice(0, 50).map(sale => (
                    <tr key={sale.id} className="table-row-hover" style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '1rem' }}><code style={{ fontWeight: 'bold' }}>{sale.id.toUpperCase()}</code></td>
                      <td style={{ padding: '1rem' }}>{new Date(sale.created_at).toLocaleString('ar-YE')}</td>
                      <td style={{ padding: '1rem' }}>{sale.created_by}</td>
                      <td style={{ padding: '1rem', fontWeight: 'bold', color: 'var(--success)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span>{formatMoney(sale.total).yer}</span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>{formatMoney(sale.total).sar}</span>
                        </div>
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'left' }}>
                        <button onClick={() => handleViewInvoice(sale)} className="btn btn-primary" style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem', borderRadius: '6px' }}>
                          <Eye size={12} /> تفاصيل
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredSales.length === 0 && (
                    <tr><td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>لا توجد فواتير</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* TOP PRODUCTS TAB */}
      {activeReport === 'topProducts' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Award size={20} /> {strings.reports.topProducts}</h3>
            <button onClick={() => exportToCSV(topProducts.map(p => ({
              المنتج: p.name, الكمية_المباعة: p.qty, الإيراد: p.revenue.toFixed(2)
            })), 'top-products')} className="btn btn-secondary" style={{ padding: '0.45rem 0.75rem', fontSize: '0.8rem' }}>
              <Download size={14} /> تصدير CSV
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {topProducts.map((p, idx) => {
              const maxRev = topProducts[0]?.revenue || 1;
              const barPct = (p.revenue / maxRev) * 100;
              return (
                <div key={idx} className="card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span style={{ fontSize: '1.1rem', fontWeight: '800', color: idx < 3 ? 'var(--secondary-dark)' : 'var(--text-muted)', minWidth: '30px' }}>#{idx + 1}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                      <span style={{ fontWeight: '700', fontSize: '0.9rem' }}>{p.name}</span>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{p.qty} قطعة</span>
                    </div>
                    <div style={{ background: 'var(--background)', height: '8px', borderRadius: '99px', overflow: 'hidden' }}>
                      <div style={{ background: 'linear-gradient(to left, var(--secondary-dark), var(--secondary))', height: '100%', width: `${barPct}%`, borderRadius: '99px' }} />
                    </div>
                  </div>
                  <span style={{ fontWeight: '800', color: 'var(--success)', fontSize: '0.95rem', minWidth: '80px', textAlign: 'left' }}>{p.revenue.toFixed(0)} ر.س</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* PROFIT PER PRODUCT TAB */}
      {activeReport === 'profitPerProduct' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><DollarSign size={20} /> {strings.reports.productProfit}</h3>
            <button onClick={() => exportToCSV(profitPerProduct.map(p => ({
              المنتج: p.name, الإيراد: p.revenue.toFixed(2), التكلفة: p.cost.toFixed(2), الربح: p.profit.toFixed(2), الهامش: p.margin.toFixed(1) + '%'
            })), 'profit-per-product')} className="btn btn-secondary" style={{ padding: '0.45rem 0.75rem', fontSize: '0.8rem' }}>
              <Download size={14} /> تصدير CSV
            </button>
          </div>
          <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)', backgroundColor: 'var(--surface-hover)' }}>
                  <th style={{ padding: '1rem' }}>المنتج</th>
                  <th style={{ padding: '1rem' }}>الإيراد</th>
                  <th style={{ padding: '1rem' }}>التكلفة</th>
                  <th style={{ padding: '1rem' }}>الربح</th>
                  <th style={{ padding: '1rem' }}>هامش الربح</th>
                </tr>
              </thead>
              <tbody>
                {profitPerProduct.map((p, idx) => (
                  <tr key={idx} className="table-row-hover" style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '1rem', fontWeight: '600' }}>{p.name}</td>
                    <td style={{ padding: '1rem' }}>{p.revenue.toFixed(2)} ر.س</td>
                    <td style={{ padding: '1rem', color: 'var(--danger)' }}>{p.cost.toFixed(2)} ر.س</td>
                    <td style={{ padding: '1rem', fontWeight: '700', color: p.profit >= 0 ? 'var(--success)' : 'var(--danger)' }}>{p.profit.toFixed(2)} ر.س</td>
                    <td style={{ padding: '1rem' }}>
                      <span className={`badge ${p.margin >= 20 ? 'badge-success' : p.margin >= 10 ? 'badge-warning' : 'badge-danger'}`}>
                        {p.margin.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* LOW STOCK TAB */}
      {activeReport === 'lowStock' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--danger)' }}>
              <AlertTriangle size={20} /> {strings.reports.lowStockReport} ({lowStockProducts.length})
            </h3>
            <button onClick={() => exportToCSV(lowStockProducts.map(p => ({
              المنتج: p.name, الباركود: p.barcode, الكمية_المتوفرة: p.quantity, الحد_الأدنى: p.min_stock || 5, التصنيف: p.category || '', تاريخ_الصلاحية: p.expiry_date || ''
            })), 'low-stock-report')} className="btn btn-secondary" style={{ padding: '0.45rem 0.75rem', fontSize: '0.8rem' }}>
              <Download size={14} /> تصدير CSV
            </button>
          </div>
          <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)', backgroundColor: 'var(--surface-hover)' }}>
                  <th style={{ padding: '1rem' }}>المنتج</th>
                  <th style={{ padding: '1rem' }}>الباركود</th>
                  <th style={{ padding: '1rem' }}>الكمية</th>
                  <th style={{ padding: '1rem' }}>الحد الأدنى</th>
                  <th style={{ padding: '1rem' }}>التصنيف</th>
                  <th style={{ padding: '1rem' }}>الصلاحية</th>
                </tr>
              </thead>
              <tbody>
                {lowStockProducts.map(p => (
                  <tr key={p.id} className="table-row-hover" style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '1rem', fontWeight: '600' }}>{p.name}</td>
                    <td style={{ padding: '1rem' }}><code>{p.barcode}</code></td>
                    <td style={{ padding: '1rem' }}>
                      <span className="badge badge-danger">{p.quantity} قطع</span>
                    </td>
                    <td style={{ padding: '1rem' }}>{p.min_stock || 5}</td>
                    <td style={{ padding: '1rem' }}>{p.category || '-'}</td>
                    <td style={{ padding: '1rem' }}>
                      {p.expiry_date ? (
                        new Date(p.expiry_date) < new Date()
                          ? <span className="badge badge-danger">منتهية</span>
                          : <span>{new Date(p.expiry_date).toLocaleDateString('ar-YE')}</span>
                      ) : '-'}
                    </td>
                  </tr>
                ))}
                {lowStockProducts.length === 0 && (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>جميع المنتجات متوفرة بمخزون كافٍ</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* COMPARISON TAB */}
      {activeReport === 'comparison' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><ArrowLeftRight size={20} /> مقارنة المبيعات بين فترتين</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            {/* Period 1 */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h4 style={{ fontSize: '0.95rem', color: 'var(--primary)' }}>الفترة الأولى</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label className="input-label" style={{ fontSize: '0.7rem' }}>من</label>
                  <input type="date" className="input-field" value={compFrom1} onChange={(e) => setCompFrom1(e.target.value)} style={{ padding: '0.45rem', fontSize: '0.8rem' }} />
                </div>
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label className="input-label" style={{ fontSize: '0.7rem' }}>إلى</label>
                  <input type="date" className="input-field" value={compTo1} onChange={(e) => setCompTo1(e.target.value)} style={{ padding: '0.45rem', fontSize: '0.8rem' }} />
                </div>
              </div>
              <div style={{ padding: '1rem', backgroundColor: 'var(--primary-lighter)', borderRadius: '8px', textAlign: 'center' }}>
                <p style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--success)' }}>{compResult1.total.toFixed(2)} ر.س</p>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{compResult1.count} فاتورة</p>
              </div>
            </div>

            {/* Period 2 */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h4 style={{ fontSize: '0.95rem', color: 'var(--primary)' }}>الفترة الثانية</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label className="input-label" style={{ fontSize: '0.7rem' }}>من</label>
                  <input type="date" className="input-field" value={compFrom2} onChange={(e) => setCompFrom2(e.target.value)} style={{ padding: '0.45rem', fontSize: '0.8rem' }} />
                </div>
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label className="input-label" style={{ fontSize: '0.7rem' }}>إلى</label>
                  <input type="date" className="input-field" value={compTo2} onChange={(e) => setCompTo2(e.target.value)} style={{ padding: '0.45rem', fontSize: '0.8rem' }} />
                </div>
              </div>
              <div style={{ padding: '1rem', backgroundColor: 'var(--primary-lighter)', borderRadius: '8px', textAlign: 'center' }}>
                <p style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--success)' }}>{compResult2.total.toFixed(2)} ر.س</p>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{compResult2.count} فاتورة</p>
              </div>
            </div>
          </div>

          <button onClick={runComparison} className="btn btn-primary" style={{ width: '200px', border: 'none' }}>
            <ArrowLeftRight size={16} /> مقارنة
          </button>

          {(compResult1.count > 0 || compResult2.count > 0) && (
            <div className="card">
              <h4 style={{ marginBottom: '1rem' }}>نتيجة المقارنة</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', textAlign: 'center' }}>
                <div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>الفترة الأولى</p>
                  <p style={{ fontSize: '1.2rem', fontWeight: '800' }}>{compResult1.total.toFixed(2)} ر.س</p>
                </div>
                <div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>الفرق</p>
                  <p style={{ fontSize: '1.2rem', fontWeight: '800', color: compResult2.total >= compResult1.total ? 'var(--success)' : 'var(--danger)' }}>
                    {compResult2.total - compResult1.total >= 0 ? '+' : ''}{(compResult2.total - compResult1.total).toFixed(2)} ر.س
                  </p>
                  <p style={{ fontSize: '0.75rem', color: compResult2.total >= compResult1.total ? 'var(--success)' : 'var(--danger)' }}>
                    {compResult1.total > 0 ? ((compResult2.total - compResult1.total) / compResult1.total * 100).toFixed(1) : '0'}%
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>الفترة الثانية</p>
                  <p style={{ fontSize: '1.2rem', fontWeight: '800' }}>{compResult2.total.toFixed(2)} ر.س</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Invoice Modal */}
      {showInvoiceModal && selectedSale && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '360px', padding: '1.5rem', backgroundColor: '#fff', color: '#000' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #ddd', paddingBottom: '0.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', color: '#000' }}>تفاصيل الفاتورة</h3>
              <button onClick={() => setShowInvoiceModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#888' }}>&times;</button>
            </div>
            <div className="receipt-container" style={{ margin: '0 auto', border: '1px dashed #111' }}>
              <div className="receipt-header">
                <h4 style={{ color: '#000', fontSize: '1.1rem', fontWeight: 'bold' }}>{tenant?.store_name}</h4>
              </div>
              <div style={{ fontSize: '0.75rem', marginBottom: '0.5rem', borderBottom: '1px dashed #111', paddingBottom: '0.35rem' }}>
                <div>رقم: {selectedSale.id.toUpperCase()}</div>
                <div>التاريخ: {new Date(selectedSale.created_at).toLocaleString('ar-YE')}</div>
                <div>الكاشير: {selectedSale.created_by}</div>
              </div>
              <div style={{ borderBottom: '1px dashed #111', paddingBottom: '0.35rem', marginBottom: '0.5rem' }}>
                {selectedSaleItems.map((item: any) => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginTop: '0.2rem' }}>
                    <span style={{ width: '50%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.product_name}</span>
                    <span style={{ width: '15%', textAlign: 'center' }}>{item.qty}</span>
                    <span style={{ width: '35%', textAlign: 'left' }}>{(item.qty * item.price).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="receipt-total" style={{ fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>الإجمالي:</span>
                  <span>{selectedSale.total.toFixed(2)} ر.س</span>
                </div>
              </div>
            </div>
            <button onClick={() => window.print()} className="btn btn-secondary" style={{ width: '100%', marginTop: '1.25rem' }}>
              <span>طباعة</span>
            </button>
          </div>
        </div>
      )}

      {/* Print Preview Overlay */}
      {printMode && (
        <div className="print-preview-overlay" style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(4px)', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '2rem'
        }}>
          {/* Top action bar in preview */}
          <div style={{
            width: '100%', maxWidth: '21cm', display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', marginBottom: '1rem', backgroundColor: 'var(--surface)',
            padding: '0.75rem 1.5rem', borderRadius: '12px', border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-lg)'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <h4 style={{ fontWeight: '800' }}>معاينة التقرير قبل الطباعة</h4>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>سيتم تنسيق المستند تلقائياً كـ A4 معد للطباعة أو الحفظ كـ PDF</p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => window.print()}
                className="btn btn-secondary"
                style={{ border: 'none', padding: '0.45rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              >
                <span>إصدار أمر الطباعة / PDF</span>
              </button>
              <button
                onClick={() => setPrintMode(null)}
                className="btn btn-danger"
                style={{ border: 'none', padding: '0.45rem 1.25rem' }}
              >
                <span>إغلاق المعاينة</span>
              </button>
            </div>
          </div>

          {/* A4 Paper Sheet Preview */}
          <div style={{
            flex: 1, width: '100%', maxWidth: '21cm', overflowY: 'auto',
            backgroundColor: '#f1f5f9', padding: '2rem 1rem', borderRadius: '12px',
            display: 'flex', justifyContent: 'center'
          }}>
            <div className="report-print-container" style={{
              backgroundColor: 'white', color: 'black', width: '21cm', minHeight: '29.7cm',
              padding: '2cm', boxShadow: '0 4px 20px rgba(0,0,0,0.15)', boxSizing: 'border-box',
              direction: 'rtl', textAlign: 'right', fontFamily: "'Tajawal', system-ui, sans-serif"
            }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '3px solid #000', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <h1 style={{ fontSize: '1.8rem', fontWeight: '900', color: '#000', margin: 0 }}>{tenant?.store_name || 'البقالة'}</h1>
                  <p style={{ fontSize: '0.9rem', color: '#666', marginTop: '0.25rem' }}>كود العميل: {tenant?.client_code || ''} | تقرير مالي معتمد</p>
                </div>
                <div style={{ textAlign: 'left' }}>
                  <h2 style={{ fontSize: '1.3rem', fontWeight: '800', margin: 0, color: '#000' }}>
                    {printMode === 'comprehensive' ? 'التقرير المالي الشامل' : `تقرير: ${reportTabs.find(t => t.id === activeReport)?.label || ''}`}
                  </h2>
                  <p style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.25rem' }}>
                    تاريخ الإصدار: {new Date().toLocaleDateString('ar-YE')}
                  </p>
                </div>
              </div>

              {/* Date range filter description if selected */}
              {(dateFrom || dateTo) && (
                <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', padding: '0.75rem 1rem', borderRadius: '6px', marginBottom: '1.25rem', fontSize: '0.85rem' }}>
                  <span>الفترة المحددة بالتقرير: </span>
                  <strong>
                    {dateFrom ? `من ${new Date(dateFrom).toLocaleDateString('ar-YE')}` : ''}
                    {dateTo ? ` إلى ${new Date(dateTo).toLocaleDateString('ar-YE')}` : ''}
                  </strong>
                </div>
              )}

              {/* Report Sections */}
              {printMode === 'comprehensive' ? (
                /* Comprehensive Report rendering all sections */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                  
                  {/* Section 1: Financial Summary */}
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: '800', borderBottom: '1.5px solid #000', paddingBottom: '0.35rem', marginBottom: '0.75rem', color: '#000' }}>1. ملخص الأداء المالي العام</h3>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', marginBottom: '1rem' }}>
                      <tbody>
                        <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '0.5rem 0', fontWeight: '700', color: '#444' }}>إجمالي المبيعات (الإيرادات):</td>
                          <td style={{ padding: '0.5rem 0', textAlign: 'left', fontWeight: '800', color: '#10b981' }}>{formatMoney(stats.totalRevenueSar).combined}</td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '0.5rem 0', fontWeight: '700', color: '#444' }}>تكلفة البضاعة المباعة:</td>
                          <td style={{ padding: '0.5rem 0', textAlign: 'left', fontWeight: '800', color: '#000' }}>{formatMoney(costOfSales).combined}</td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '0.5rem 0', fontWeight: '700', color: '#444' }}>صافي الأرباح:</td>
                          <td style={{ padding: '0.5rem 0', textAlign: 'left', fontWeight: '800', color: '#d97706' }}>{formatMoney(stats.totalProfitSar).combined}</td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '0.5rem 0', fontWeight: '700', color: '#444' }}>هامش الربح التشغيلي:</td>
                          <td style={{ padding: '0.5rem 0', textAlign: 'left', fontWeight: '800', color: '#10b981' }}>{profitMarginPercent.toFixed(1)}%</td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '0.5rem 0', fontWeight: '700', color: '#444' }}>رأس المال تقييم المخزون:</td>
                          <td style={{ padding: '0.5rem 0', textAlign: 'left', fontWeight: '800', color: '#059669' }}>{formatMoney(stats.inventoryValuationSar).combined}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Section 2: Top Products */}
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: '800', borderBottom: '1.5px solid #000', paddingBottom: '0.35rem', marginBottom: '0.75rem', color: '#000' }}>2. المنتجات الأكثر مبيعاً (الأعلى 10)</h3>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '1.5px solid #000', backgroundColor: '#f8fafc' }}>
                          <th style={{ padding: '0.5rem', textAlign: 'right', fontWeight: '700' }}>الترتيب</th>
                          <th style={{ padding: '0.5rem', textAlign: 'right', fontWeight: '700' }}>اسم المنتج</th>
                          <th style={{ padding: '0.5rem', textAlign: 'center', fontWeight: '700' }}>الكمية المباعة</th>
                          <th style={{ padding: '0.5rem', textAlign: 'left', fontWeight: '700' }}>الإيرادات (YER)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topProducts.map((p, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                            <td style={{ padding: '0.5rem', fontWeight: 'bold' }}>#{idx + 1}</td>
                            <td style={{ padding: '0.5rem' }}>{p.name}</td>
                            <td style={{ padding: '0.5rem', textAlign: 'center' }}>{p.qty} قطعة</td>
                            <td style={{ padding: '0.5rem', textAlign: 'left', fontWeight: '700' }}>{formatMoney(p.revenue).yer}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Section 3: Profitability */}
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: '800', borderBottom: '1.5px solid #000', paddingBottom: '0.35rem', marginBottom: '0.75rem', color: '#000' }}>3. ربحية المنتجات بالتفصيل</h3>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '1.5px solid #000', backgroundColor: '#f8fafc' }}>
                          <th style={{ padding: '0.5rem', textAlign: 'right', fontWeight: '700' }}>المنتج</th>
                          <th style={{ padding: '0.5rem', textAlign: 'left', fontWeight: '700' }}>الإيراد (YER)</th>
                          <th style={{ padding: '0.5rem', textAlign: 'left', fontWeight: '700' }}>التكلفة (YER)</th>
                          <th style={{ padding: '0.5rem', textAlign: 'left', fontWeight: '700' }}>الربح الصافي (YER)</th>
                          <th style={{ padding: '0.5rem', textAlign: 'left', fontWeight: '700' }}>الهامش %</th>
                        </tr>
                      </thead>
                      <tbody>
                        {profitPerProduct.slice(0, 15).map((p, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                            <td style={{ padding: '0.5rem', fontWeight: '700' }}>{p.name}</td>
                            <td style={{ padding: '0.5rem', textAlign: 'left' }}>{formatMoney(p.revenue).yer}</td>
                            <td style={{ padding: '0.5rem', textAlign: 'left', color: '#ef4444' }}>{formatMoney(p.cost).yer}</td>
                            <td style={{ padding: '0.5rem', textAlign: 'left', fontWeight: '700', color: p.profit >= 0 ? '#10b981' : '#ef4444' }}>{formatMoney(p.profit).yer}</td>
                            <td style={{ padding: '0.5rem', textAlign: 'left' }}>{p.margin.toFixed(1)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Section 4: Low Stock */}
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: '800', borderBottom: '1.5px solid #000', paddingBottom: '0.35rem', marginBottom: '0.75rem', color: '#ef4444' }}>4. النواقص وقائمة المخزون المنخفض</h3>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '1.5px solid #000', backgroundColor: '#f8fafc' }}>
                          <th style={{ padding: '0.5rem', textAlign: 'right', fontWeight: '700' }}>اسم المنتج</th>
                          <th style={{ padding: '0.5rem', textAlign: 'right', fontWeight: '700' }}>الباركود</th>
                          <th style={{ padding: '0.5rem', textAlign: 'center', fontWeight: '700' }}>الكمية المتبقية</th>
                          <th style={{ padding: '0.5rem', textAlign: 'center', fontWeight: '700' }}>الحد الأدنى</th>
                          <th style={{ padding: '0.5rem', textAlign: 'right', fontWeight: '700' }}>التصنيف</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lowStockProducts.map((p) => (
                          <tr key={p.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                            <td style={{ padding: '0.5rem', fontWeight: '700' }}>{p.name}</td>
                            <td style={{ padding: '0.5rem' }}><code>{p.barcode}</code></td>
                            <td style={{ padding: '0.5rem', textAlign: 'center', fontWeight: '800', color: '#ef4444' }}>{p.quantity} قطع</td>
                            <td style={{ padding: '0.5rem', textAlign: 'center' }}>{p.min_stock || 5}</td>
                            <td style={{ padding: '0.5rem' }}>{p.category || '-'}</td>
                          </tr>
                        ))}
                        {lowStockProducts.length === 0 && (
                          <tr>
                            <td colSpan={5} style={{ textAlign: 'center', padding: '1.5rem', color: '#666' }}>لا توجد منتجات منخفضة المخزون حالياً.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                </div>
              ) : (
                /* Print current tab only */
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '800', borderBottom: '1.5px solid #000', paddingBottom: '0.35rem', marginBottom: '1rem', color: '#000' }}>
                    تقرير تبويب: {reportTabs.find(t => t.id === activeReport)?.label}
                  </h3>
                  
                  {activeReport === 'overview' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem' }}>
                        <tbody>
                          <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                            <td style={{ padding: '0.75rem 0', fontWeight: '700' }}>إجمالي المبيعات:</td>
                            <td style={{ padding: '0.75rem 0', textAlign: 'left', fontWeight: '800', color: '#10b981' }}>{formatMoney(stats.totalRevenueSar).combined}</td>
                          </tr>
                          <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                            <td style={{ padding: '0.75rem 0', fontWeight: '700' }}>تكلفة المبيعات:</td>
                            <td style={{ padding: '0.75rem 0', textAlign: 'left', fontWeight: '800' }}>{formatMoney(costOfSales).combined}</td>
                          </tr>
                          <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                            <td style={{ padding: '0.75rem 0', fontWeight: '700' }}>صافي الأرباح المكتسبة:</td>
                            <td style={{ padding: '0.75rem 0', textAlign: 'left', fontWeight: '800', color: '#d97706' }}>{formatMoney(stats.totalProfitSar).combined}</td>
                          </tr>
                          <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                            <td style={{ padding: '0.75rem 0', fontWeight: '700' }}>هامش الربح التشغيلي:</td>
                            <td style={{ padding: '0.75rem 0', textAlign: 'left', fontWeight: '800' }}>{profitMarginPercent.toFixed(1)}%</td>
                          </tr>
                          <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                            <td style={{ padding: '0.75rem 0', fontWeight: '700' }}>رأس المال بالمخزون:</td>
                            <td style={{ padding: '0.75rem 0', textAlign: 'left', fontWeight: '800' }}>{formatMoney(stats.inventoryValuationSar).combined}</td>
                          </tr>
                        </tbody>
                      </table>

                      <h4 style={{ fontSize: '1rem', fontWeight: '800', marginTop: '1rem', borderBottom: '1px solid #000', paddingBottom: '0.25rem' }}>سجل الفواتير للفترة المحددة</h4>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                        <thead>
                          <tr style={{ borderBottom: '1.5px solid #000', backgroundColor: '#f8fafc' }}>
                            <th style={{ padding: '0.5rem', textAlign: 'right' }}>رقم الفاتورة</th>
                            <th style={{ padding: '0.5rem', textAlign: 'right' }}>التاريخ والوقت</th>
                            <th style={{ padding: '0.5rem', textAlign: 'right' }}>الكاشير</th>
                            <th style={{ padding: '0.5rem', textAlign: 'left' }}>الإجمالي (YER)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredSales.map(sale => (
                            <tr key={sale.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                              <td style={{ padding: '0.5rem' }}><code>{sale.id.toUpperCase()}</code></td>
                              <td style={{ padding: '0.5rem' }}>{new Date(sale.created_at).toLocaleString('ar-YE')}</td>
                              <td style={{ padding: '0.5rem' }}>{sale.created_by}</td>
                              <td style={{ padding: '0.5rem', textAlign: 'left', fontWeight: '700' }}>{formatMoney(sale.total).yer}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {activeReport === 'topProducts' && (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '1.5px solid #000', backgroundColor: '#f8fafc' }}>
                          <th style={{ padding: '0.5rem', textAlign: 'right' }}>الترتيب</th>
                          <th style={{ padding: '0.5rem', textAlign: 'right' }}>المنتج</th>
                          <th style={{ padding: '0.5rem', textAlign: 'center' }}>الكمية المباعة</th>
                          <th style={{ padding: '0.5rem', textAlign: 'left' }}>الإيرادات (YER)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topProducts.map((p, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                            <td style={{ padding: '0.5rem', fontWeight: 'bold' }}>#{idx + 1}</td>
                            <td style={{ padding: '0.5rem' }}>{p.name}</td>
                            <td style={{ padding: '0.5rem', textAlign: 'center' }}>{p.qty} قطعة</td>
                            <td style={{ padding: '0.5rem', textAlign: 'left', fontWeight: '700' }}>{formatMoney(p.revenue).yer}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  {activeReport === 'profitPerProduct' && (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '1.5px solid #000', backgroundColor: '#f8fafc' }}>
                          <th style={{ padding: '0.5rem', textAlign: 'right' }}>اسم المنتج</th>
                          <th style={{ padding: '0.5rem', textAlign: 'left' }}>الإيرادات (YER)</th>
                          <th style={{ padding: '0.5rem', textAlign: 'left' }}>التكلفة (YER)</th>
                          <th style={{ padding: '0.5rem', textAlign: 'left' }}>صافي الأرباح (YER)</th>
                          <th style={{ padding: '0.5rem', textAlign: 'left' }}>الهامش %</th>
                        </tr>
                      </thead>
                      <tbody>
                        {profitPerProduct.map((p, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                            <td style={{ padding: '0.5rem', fontWeight: '700' }}>{p.name}</td>
                            <td style={{ padding: '0.5rem', textAlign: 'left' }}>{formatMoney(p.revenue).yer}</td>
                            <td style={{ padding: '0.5rem', textAlign: 'left', color: '#ef4444' }}>{formatMoney(p.cost).yer}</td>
                            <td style={{ padding: '0.5rem', textAlign: 'left', fontWeight: '700', color: p.profit >= 0 ? '#10b981' : '#ef4444' }}>{formatMoney(p.profit).yer}</td>
                            <td style={{ padding: '0.5rem', textAlign: 'left' }}>{p.margin.toFixed(1)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  {activeReport === 'lowStock' && (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '1.5px solid #000', backgroundColor: '#f8fafc' }}>
                          <th style={{ padding: '0.5rem', textAlign: 'right' }}>المنتج</th>
                          <th style={{ padding: '0.5rem', textAlign: 'right' }}>الباركود</th>
                          <th style={{ padding: '0.5rem', textAlign: 'center' }}>الكمية الحالية</th>
                          <th style={{ padding: '0.5rem', textAlign: 'center' }}>الحد الأدنى للمخزون</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lowStockProducts.map(p => (
                          <tr key={p.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                            <td style={{ padding: '0.5rem', fontWeight: '700' }}>{p.name}</td>
                            <td style={{ padding: '0.5rem' }}><code>{p.barcode}</code></td>
                            <td style={{ padding: '0.5rem', textAlign: 'center', fontWeight: '800', color: '#ef4444' }}>{p.quantity} قطع</td>
                            <td style={{ padding: '0.5rem', textAlign: 'center' }}>{p.min_stock || 5}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  {activeReport === 'comparison' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                      <p style={{ fontSize: '0.9rem', color: '#444' }}>مقارنة تفصيلية للأرباح والمبيعات بين فترتين زمنيتين محددتين.</p>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                        <thead>
                          <tr style={{ borderBottom: '1.5px solid #000', backgroundColor: '#f8fafc' }}>
                            <th style={{ padding: '0.5rem', textAlign: 'right' }}>المعيار المالي</th>
                            <th style={{ padding: '0.5rem', textAlign: 'center' }}>الفترة الأولى</th>
                            <th style={{ padding: '0.5rem', textAlign: 'center' }}>الفترة الثانية</th>
                            <th style={{ padding: '0.5rem', textAlign: 'left' }}>الفرق والقيمة المئوية</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                            <td style={{ padding: '0.5rem', fontWeight: '700' }}>المبيعات الإجمالية:</td>
                            <td style={{ padding: '0.5rem', textAlign: 'center' }}>{formatMoney(compResult1.total).yer}</td>
                            <td style={{ padding: '0.5rem', textAlign: 'center' }}>{formatMoney(compResult2.total).yer}</td>
                            <td style={{ padding: '0.5rem', textAlign: 'left', fontWeight: '700', color: compResult2.total >= compResult1.total ? '#10b981' : '#ef4444' }}>
                              {formatMoney(compResult2.total - compResult1.total).yer} ({compResult1.total > 0 ? ((compResult2.total - compResult1.total) / compResult1.total * 100).toFixed(1) : '0'}%)
                            </td>
                          </tr>
                          <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                            <td style={{ padding: '0.5rem', fontWeight: '700' }}>عدد الفواتير الصادرة:</td>
                            <td style={{ padding: '0.5rem', textAlign: 'center' }}>{compResult1.count} فواتير</td>
                            <td style={{ padding: '0.5rem', textAlign: 'center' }}>{compResult2.count} فواتير</td>
                            <td style={{ padding: '0.5rem', textAlign: 'left', fontWeight: '700' }}>
                              {compResult2.count - compResult1.count >= 0 ? '+' : ''}{compResult2.count - compResult1.count}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Footer Signature */}
              <div style={{ marginTop: '3.5rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', borderTop: '1.5px dashed #ccc', paddingTop: '1.5rem' }}>
                <div>توقيع الكاشير / المسؤول: ............................</div>
                <div>الختم الرسمي للمحل: ............................</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportsTab;
