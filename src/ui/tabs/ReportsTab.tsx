// src/ui/tabs/ReportsTab.tsx
import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useSalesStore } from '../../store/salesStore';
import { salesRepo } from '../../core/repositories/sqlite';
import type { SaleItem, Product } from '../../core/repositories/interfaces';
import { db } from '../../core/database/db';
import { strings } from '../../i18n';
import { TrendingUp, DollarSign, Briefcase, Eye, Percent, ArrowLeftRight } from 'lucide-react';

const ReportsTab: React.FC = () => {
  const { tenant } = useAuthStore();
  const { sales, getAnalytics } = useSalesStore();

  const [stats, setStats] = useState<any | null>(null);
  const [selectedSale, setSelectedSale] = useState<any | null>(null);
  const [selectedSaleItems, setSelectedSaleItems] = useState<SaleItem[]>([]);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [costOfSales, setCostOfSales] = useState(0);

  useEffect(() => {
    if (tenant) {
      getAnalytics(tenant.id).then(async (res) => {
        setStats(res);
        
        // Calculate Cost of Sales manually to ensure precision
        try {
          const salesHistory = await salesRepo.getAll(tenant.id);
          const products = await db.query<Product>('SELECT * FROM products WHERE tenant_id = ?', [tenant.id]);
          const prodMap = new Map(products.map(p => [p.id, p]));
          
          let totalCost = 0;
          for (const s of salesHistory) {
            const items = await salesRepo.getItems(s.id);
            for (const item of items) {
              const prod = prodMap.get(item.product_id);
              const costPrice = prod ? prod.purchase_price : (item.price * 0.8);
              totalCost += (costPrice * item.qty);
            }
          }
          setCostOfSales(totalCost);
        } catch (e) {
          console.error(e);
        }
      });
    }
  }, [tenant, sales, getAnalytics]);

  const handleViewInvoice = async (sale: any) => {
    try {
      const items = await salesRepo.getItems(sale.id);
      setSelectedSale(sale);
      setSelectedSaleItems(items);
      setShowInvoiceModal(true);
    } catch (e) {
      console.error(e);
      alert('فشل تحميل تفاصيل الفاتورة');
    }
  };

  if (!stats) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '40vh' }}>
        <p style={{ color: 'var(--primary)', fontWeight: 'bold' }}>جاري احتساب التقارير المالية والتحليلات...</p>
      </div>
    );
  }

  // Calculate profit margin percentage
  const profitMarginPercent = stats.totalRevenueSar > 0 
    ? (stats.totalProfitSar / stats.totalRevenueSar) * 100 
    : 0;

  // Chart configuration
  const chartHeight = 100;
  const chartWidth = 480;
  
  // Calculate max scale for Revenue
  const maxRevenueVal = Math.max(...stats.salesByDate.map((d: any) => d.amount), 100);
  
  // Estimate daily profits for the second chart (approx 20% margin if details missing, or exact proportionally)
  const marginRatio = stats.totalRevenueSar > 0 ? (stats.totalProfitSar / stats.totalRevenueSar) : 0.20;
  const profitsByDate = stats.salesByDate.map((d: any) => ({
    date: d.date,
    amount: d.amount * marginRatio
  }));
  const maxProfitVal = Math.max(...profitsByDate.map((d: any) => d.amount), 50);

  const barWidth = 35;
  const gap = 25;

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
      
      {/* Title */}
      <div>
        <h2 style={{ color: 'var(--primary)' }}>{strings.reports.title}</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>التحليل المالي الدقيق وتتبع التكاليف والأرباح للمتجر</p>
      </div>

      {/* Financial Cost metrics - 4 column responsive grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '1.25rem'
      }}>
        {/* Sales Revenue */}
        <div className="card" style={{ borderRight: '4px solid var(--success)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>إجمالي المبيعات (Revenue)</span>
            <TrendingUp size={20} style={{ color: 'var(--success)' }} />
          </div>
          <h3 style={{ fontSize: '1.6rem', color: 'var(--success)', marginBottom: '0.2rem' }}>
            {stats.totalRevenueSar.toFixed(2)} <span style={{ fontSize: '0.85rem' }}>ر.س</span>
          </h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            القيمة الإجمالية للفواتير المحصلة
          </p>
        </div>

        {/* Cost of Sales */}
        <div className="card" style={{ borderRight: '4px solid var(--primary)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>تكلفة البضاعة المباعة (COGS)</span>
            <ArrowLeftRight size={20} style={{ color: 'var(--primary)' }} />
          </div>
          <h3 style={{ fontSize: '1.6rem', color: 'var(--primary)', marginBottom: '0.2rem' }}>
            {costOfSales.toFixed(2)} <span style={{ fontSize: '0.85rem' }}>ر.س</span>
          </h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            سعر شراء الكميات التي تم بيعها فعلياً
          </p>
        </div>

        {/* Net Profits */}
        <div className="card" style={{ borderRight: '4px solid var(--secondary-dark)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>الأرباح الصافية (Net Profit)</span>
            <DollarSign size={20} style={{ color: 'var(--secondary-dark)' }} />
          </div>
          <h3 style={{ fontSize: '1.6rem', color: 'var(--secondary-dark)', marginBottom: '0.2rem' }}>
            {stats.totalProfitSar.toFixed(2)} <span style={{ fontSize: '0.85rem' }}>ر.س</span>
          </h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            صافي الربح المتبقي (المبيعات - التكاليف)
          </p>
        </div>

        {/* Profit Margin % */}
        <div className="card" style={{ borderRight: '4px solid var(--success)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>هامش الربح الصافي (%)</span>
            <Percent size={20} style={{ color: 'var(--success)' }} />
          </div>
          <h3 style={{ fontSize: '1.6rem', color: 'var(--success)', marginBottom: '0.2rem' }}>
            {profitMarginPercent.toFixed(1)}%
          </h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            معدل العائد الربحي لكل فاتورة
          </p>
        </div>

        {/* Capital Cost (Inventory Valuation) */}
        <div className="card" style={{ borderRight: '4px solid var(--text)', gridColumn: '1 / -1' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>رأس المال المجمد بالمخزن (Capital Valuation)</span>
            <Briefcase size={20} style={{ color: 'var(--text)' }} />
          </div>
          <h3 style={{ fontSize: '1.8rem', color: 'var(--primary)', marginBottom: '0.2rem' }}>
            {stats.inventoryValuationSar.toFixed(2)} <span style={{ fontSize: '0.95rem' }}>ر.س</span>
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {strings.reports.valuationHelp} (إجمالي سعر شراء كافة المنتجات المتوفرة حالياً بالرفوف والمخزن).
          </p>
        </div>
      </div>

      {/* Dual SVG Charts Grid - 2 columns on Desktop/iPad, 1 column on Mobile */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
        gap: '2rem'
      }}>
        {/* Chart 1: Revenue */}
        <div className="card">
          <h3 style={{ fontSize: '1rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
            مؤشر قيمة المبيعات اليومية (SAR)
          </h3>
          <div style={{ display: 'flex', justifyContent: 'center', overflowX: 'auto', padding: '1rem 0' }}>
            <svg width="100%" height="150" viewBox={`0 0 ${chartWidth} 150`} style={{ maxWidth: '420px', direction: 'ltr' }}>
              <line x1="30" y1="20" x2="450" y2="20" stroke="#f1f1f1" strokeDasharray="3 3" />
              <line x1="30" y1="60" x2="450" y2="60" stroke="#f1f1f1" strokeDasharray="3 3" />
              <line x1="30" y1="100" x2="450" y2="100" stroke="var(--border)" />
              
              {stats.salesByDate.map((d: any, index: number) => {
                const height = (d.amount / maxRevenueVal) * chartHeight;
                const x = 40 + index * (barWidth + gap);
                const y = 100 - height;
                return (
                  <g key={index}>
                    <rect x={x} y={y} width={barWidth} height={height} fill="var(--primary)" rx="3" />
                    <text x={x + barWidth / 2} y={y - 5} textAnchor="middle" fontSize="9" fill="var(--text)" fontWeight="bold">
                      {d.amount.toFixed(0)}
                    </text>
                    <text x={x + barWidth / 2} y="118" textAnchor="middle" fontSize="9" fill="var(--text-muted)">
                      {d.date}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Chart 2: Net profit trend */}
        <div className="card">
          <h3 style={{ fontSize: '1rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
            تحليل مؤشر صافي الأرباح اليومية (SAR)
          </h3>
          <div style={{ display: 'flex', justifyContent: 'center', overflowX: 'auto', padding: '1rem 0' }}>
            <svg width="100%" height="150" viewBox={`0 0 ${chartWidth} 150`} style={{ maxWidth: '420px', direction: 'ltr' }}>
              <line x1="30" y1="20" x2="450" y2="20" stroke="#f1f1f1" strokeDasharray="3 3" />
              <line x1="30" y1="60" x2="450" y2="60" stroke="#f1f1f1" strokeDasharray="3 3" />
              <line x1="30" y1="100" x2="450" y2="100" stroke="var(--border)" />
              
              {profitsByDate.map((d: any, index: number) => {
                const height = (d.amount / maxProfitVal) * chartHeight;
                const x = 40 + index * (barWidth + gap);
                const y = 100 - height;
                return (
                  <g key={index}>
                    <rect x={x} y={y} width={barWidth} height={height} fill="var(--secondary)" rx="3" />
                    <text x={x + barWidth / 2} y={y - 5} textAnchor="middle" fontSize="9" fill="var(--text)" fontWeight="bold">
                      {d.amount.toFixed(0)}
                    </text>
                    <text x={x + barWidth / 2} y="118" textAnchor="middle" fontSize="9" fill="var(--text-muted)">
                      {d.date}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      </div>

      {/* Recent sales logs */}
      <div>
        <h3 style={{ marginBottom: '1.25rem' }}>فواتير المبيعات الحالية ({sales.length} فواتير)</h3>
        <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--background)', borderBottom: '2px solid var(--border)' }}>
                <th style={{ padding: '1rem' }}>رقم الفاتورة</th>
                <th style={{ padding: '1rem' }}>التاريخ والوقت</th>
                <th style={{ padding: '1rem' }}>الكاشير</th>
                <th style={{ padding: '1rem' }}>القيمة الإجمالية</th>
                <th style={{ padding: '1rem', textAlign: 'left' }}>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((sale) => (
                <tr key={sale.id} className="table-row-hover" style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '1rem' }}>
                    <code style={{ fontWeight: 'bold' }}>{sale.id.toUpperCase()}</code>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    {new Date(sale.created_at).toLocaleString('ar-YE')}
                  </td>
                  <td style={{ padding: '1rem' }}>{sale.created_by}</td>
                  <td style={{ padding: '1rem', fontWeight: 'bold', color: 'var(--success)' }}>
                    {sale.total.toFixed(2)} ر.س
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'left' }}>
                    <button
                      onClick={() => handleViewInvoice(sale)}
                      className="btn btn-primary"
                      style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem', borderRadius: '6px' }}
                    >
                      <Eye size={12} />
                      <span>تفاصيل الفاتورة</span>
                    </button>
                  </td>
                </tr>
              ))}

              {sales.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    لا توجد فواتير مبيعات مسجلة في المتجر حالياً.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice Detail Modal */}
      {showInvoiceModal && selectedSale && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '360px', padding: '1.5rem', backgroundColor: '#fff', color: '#000' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #ddd', paddingBottom: '0.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', color: '#000' }}>مستند الفاتورة النقدية</h3>
              <button
                onClick={() => setShowInvoiceModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#888' }}
              >
                &times;
              </button>
            </div>

            <div className="receipt-container" style={{ margin: '0 auto', border: '1px dashed #111' }}>
              <div className="receipt-header">
                <h4 style={{ color: '#000', fontSize: '1.1rem', fontWeight: 'bold' }}>{tenant?.store_name}</h4>
                <p style={{ fontSize: '0.75rem', color: '#555' }}>فاتورة مبسطة مبسطة</p>
              </div>

              <div style={{ fontSize: '0.75rem', marginBottom: '0.5rem', borderBottom: '1px dashed #111', paddingBottom: '0.35rem' }}>
                <div>رقم الفاتورة: {selectedSale.id.toUpperCase()}</div>
                <div>التاريخ: {new Date(selectedSale.created_at).toLocaleString('ar-YE')}</div>
                <div>الكاشير: {selectedSale.created_by}</div>
              </div>

              <div style={{ borderBottom: '1px dashed #111', paddingBottom: '0.35rem', marginBottom: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '0.75rem' }}>
                  <span style={{ width: '50%' }}>الصنف</span>
                  <span style={{ width: '15%', textAlign: 'center' }}>الكمية</span>
                  <span style={{ width: '35%', textAlign: 'left' }}>المجموع</span>
                </div>
                {selectedSaleItems.map((item: any) => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginTop: '0.2rem' }}>
                    <span style={{ width: '50%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.product_name}</span>
                    <span style={{ width: '15%', textAlign: 'center' }}>{item.qty}</span>
                    <span style={{ width: '35%', textAlign: 'left' }}>{(item.qty * item.price).toFixed(2)} SAR</span>
                  </div>
                ))}
              </div>

              <div className="receipt-total" style={{ fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>الإجمالي النهائي:</span>
                  <span>{selectedSale.total.toFixed(2)} ر.س</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => window.print()}
              className="btn btn-secondary"
              style={{ width: '100%', marginTop: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
            >
              <span>طباعة الفاتورة</span>
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default ReportsTab;
