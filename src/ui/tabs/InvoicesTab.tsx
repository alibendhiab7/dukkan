// src/ui/tabs/InvoicesTab.tsx
import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useSalesStore } from '../../store/salesStore';
import { useToastStore } from '../../store/toastStore';
import { salesRepo } from '../../core/repositories/turso';
import type { Sale, SaleItem } from '../../core/repositories/interfaces';
import { 
  Search, 
  Calendar, 
  User, 
  Eye, 
  Printer, 
  FileText,
  DollarSign,
  Tag
} from 'lucide-react';

const InvoicesTab: React.FC = () => {
  const { tenant } = useAuthStore();
  const { sales, loadSales, exchangeRate, loadExchangeRate } = useSalesStore();
  const { addToast } = useToastStore();

  // Search & Filter State
  const [searchId, setSearchId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedCashier, setSelectedCashier] = useState('');

  // Modal State
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [selectedSaleItems, setSelectedSaleItems] = useState<SaleItem[]>([]);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [isLoadingItems, setIsLoadingItems] = useState(false);

  useEffect(() => {
    if (tenant) {
      loadSales(tenant.id);
      loadExchangeRate(tenant.id);
    }
  }, [tenant, loadSales, loadExchangeRate]);

  const rateVal = exchangeRate?.sar_to_yer || 395;

  const formatMoney = (sarAmount: number) => {
    const yerAmount = sarAmount * rateVal;
    return {
      sar: `${sarAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س`,
      yer: `${Math.round(yerAmount).toLocaleString()} ر.ي`,
      combined: `${Math.round(yerAmount).toLocaleString()} ر.ي (${sarAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س)`
    };
  };

  // Get unique cashiers from sales array for the dropdown filter
  const cashiers = Array.from(new Set(sales.map(s => s.created_by).filter(Boolean)));

  // Filter Logic
  const filteredSales = sales.filter(sale => {
    // 1. Search ID Match
    if (searchId && !sale.id.toLowerCase().includes(searchId.toLowerCase().trim())) {
      return false;
    }

    // 2. Date From Match
    if (dateFrom) {
      const saleDate = new Date(sale.created_at).toISOString().split('T')[0];
      if (saleDate < dateFrom) return false;
    }

    // 3. Date To Match
    if (dateTo) {
      const saleDate = new Date(sale.created_at).toISOString().split('T')[0];
      if (saleDate > dateTo) return false;
    }

    // 4. Cashier Match
    if (selectedCashier && sale.created_by !== selectedCashier) {
      return false;
    }

    return true;
  });

  // Calculate stats for filtered results
  const totalDiscount = filteredSales.reduce((sum, s) => sum + (s.discount || 0), 0);
  const totalFinalRevenue = filteredSales.reduce((sum, s) => sum + (s.final_total ?? s.total), 0);

  const handleViewInvoice = async (sale: Sale) => {
    setIsLoadingItems(true);
    try {
      const items = await salesRepo.getItems(sale.id);
      setSelectedSaleItems(items);
      setSelectedSale(sale);
      setShowInvoiceModal(true);
    } catch (err) {
      addToast('error', 'فشل تحميل تفاصيل الفاتورة');
    } finally {
      setIsLoadingItems(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Preset date filters helper
  const applyPresetFilter = (preset: 'today' | 'week' | 'month' | 'all') => {
    const todayStr = new Date().toISOString().split('T')[0];
    if (preset === 'today') {
      setDateFrom(todayStr);
      setDateTo(todayStr);
    } else if (preset === 'week') {
      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 7);
      setDateFrom(lastWeek.toISOString().split('T')[0]);
      setDateTo(todayStr);
    } else if (preset === 'month') {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      setDateFrom(startOfMonth.toISOString().split('T')[0]);
      setDateTo(todayStr);
    } else {
      setDateFrom('');
      setDateTo('');
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileText className="text-primary" size={24} />
            <span>سجل فواتير المبيعات</span>
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>استعراض، تصفية، وطباعة فواتير المبيعات السابقة</p>
        </div>

        {/* Preset quick buttons */}
        <div style={{ display: 'flex', gap: '0.35rem' }}>
          <button onClick={() => applyPresetFilter('today')} className="btn btn-secondary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem', borderRadius: '6px' }}>اليوم</button>
          <button onClick={() => applyPresetFilter('week')} className="btn btn-secondary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem', borderRadius: '6px' }}>آخر 7 أيام</button>
          <button onClick={() => applyPresetFilter('month')} className="btn btn-secondary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem', borderRadius: '6px' }}>هذا الشهر</button>
          <button onClick={() => applyPresetFilter('all')} className="btn btn-secondary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem', borderRadius: '6px' }}>الكل</button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid-3" style={{ gap: '1rem' }}>
        <div className="card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: 'var(--primary-lighter)', color: 'var(--primary)', padding: '0.65rem', borderRadius: '8px' }}>
            <FileText size={20} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>عدد الفواتير</span>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '800', marginTop: '0.1rem' }}>{filteredSales.length} فاتورة</h3>
          </div>
        </div>

        <div className="card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: 'hsl(142, 65%, 90%)', color: 'var(--success)', padding: '0.65rem', borderRadius: '8px' }}>
            <DollarSign size={20} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>إجمالي المبيعات</span>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '800', marginTop: '0.1rem', color: 'var(--success)' }}>
              {formatMoney(totalFinalRevenue).yer}
              <div style={{ fontSize: '0.7rem', fontWeight: 'normal', color: 'var(--text-muted)' }}>
                {formatMoney(totalFinalRevenue).sar}
              </div>
            </h3>
          </div>
        </div>

        <div className="card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: 'hsl(36, 100%, 93%)', color: 'var(--warning)', padding: '0.65rem', borderRadius: '8px' }}>
            <Tag size={20} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>إجمالي الخصومات</span>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '800', marginTop: '0.1rem', color: 'var(--warning)' }}>
              {formatMoney(totalDiscount).yer}
              <div style={{ fontSize: '0.7rem', fontWeight: 'normal', color: 'var(--text-muted)' }}>
                {formatMoney(totalDiscount).sar}
              </div>
            </h3>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'end' }}>
          
          {/* Invoice ID Search */}
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <Search size={14} />
              <span>رقم الفاتورة</span>
            </label>
            <input 
              type="text" 
              className="input-field" 
              placeholder="ابحث برقم الفاتورة..."
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
            />
          </div>

          {/* Date From */}
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <Calendar size={14} />
              <span>من تاريخ</span>
            </label>
            <input 
              type="date" 
              className="input-field"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>

          {/* Date To */}
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <Calendar size={14} />
              <span>إلى تاريخ</span>
            </label>
            <input 
              type="date" 
              className="input-field"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>

          {/* Cashier Filter */}
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <User size={14} />
              <span>الكاشير</span>
            </label>
            <select 
              className="input-field"
              value={selectedCashier}
              onChange={(e) => setSelectedCashier(e.target.value)}
            >
              <option value="">كل الكاشيرات</option>
              {cashiers.map(cashier => (
                <option key={cashier} value={cashier}>{cashier}</option>
              ))}
            </select>
          </div>

        </div>
      </div>

      {/* Invoices Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'right' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--surface-hover)', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '1rem' }}>رقم الفاتورة</th>
                <th style={{ padding: '1rem' }}>التاريخ والوقت</th>
                <th style={{ padding: '1rem' }}>الكاشير</th>
                <th style={{ padding: '1rem' }}>العميل</th>
                <th style={{ padding: '1rem', textAlign: 'left' }}>الخصم</th>
                <th style={{ padding: '1rem', textAlign: 'left' }}>الإجمالي النهائي</th>
                <th style={{ padding: '1rem', textAlign: 'center' }}>العمليات</th>
              </tr>
            </thead>
            <tbody>
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    لا توجد فواتير مبيعات مطابقة لمعايير البحث المحددة
                  </td>
                </tr>
              ) : (
                filteredSales.map(sale => {
                  const hasDiscount = sale.discount && sale.discount > 0;
                  const finalTotal = sale.final_total ?? sale.total;
                  
                  return (
                    <tr key={sale.id} className="table-row-hover" style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 'bold' }}>
                        <code style={{ fontSize: '0.75rem', background: 'var(--primary-lighter)', color: 'var(--primary)', padding: '0.2rem 0.4rem', borderRadius: '4px' }}>
                          {sale.id.toUpperCase().slice(0, 8)}...
                        </code>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)' }}>
                        {new Date(sale.created_at).toLocaleString('ar-YE')}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', fontWeight: '500' }}>
                        {sale.created_by}
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        {sale.customer_name || 'عميل سفري / نقدي'}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'left', color: hasDiscount ? 'var(--danger)' : 'inherit' }}>
                        {hasDiscount ? formatMoney(sale.discount!).yer : '-'}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'left', fontWeight: 'bold', color: 'var(--success)' }}>
                        <div>{formatMoney(finalTotal).yer}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>
                          {formatMoney(finalTotal).sar}
                        </div>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                        <button 
                          onClick={() => handleViewInvoice(sale)} 
                          className="btn btn-secondary" 
                          style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                          disabled={isLoadingItems}
                        >
                          <Eye size={12} />
                          <span>تفاصيل</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice Modal Overlay */}
      {showInvoiceModal && selectedSale && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '360px', padding: '1.5rem', backgroundColor: '#fff', color: '#000', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #ddd', paddingBottom: '0.5rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 'bold', color: '#000' }}>معاينة فاتورة المبيعات</h3>
              <button 
                onClick={() => setShowInvoiceModal(false)} 
                style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#888', padding: '0.25rem' }}
              >
                &times;
              </button>
            </div>

            {/* Printable Thermal Receipt */}
            <div className="receipt-container" style={{ margin: '0 auto', border: '1px dashed #111', width: '100%', boxSizing: 'border-box' }}>
              <div className="receipt-header" style={{ borderBottom: '1px dashed #111', paddingBottom: '0.5rem', marginBottom: '0.75rem', textAlign: 'center' }}>
                <h4 style={{ color: '#000', fontSize: '1.1rem', fontWeight: 'bold', margin: '0 0 0.25rem 0' }}>{tenant?.store_name}</h4>
                <div style={{ fontSize: '0.7rem', color: '#666' }}>فاتورة مبيعات مبسطة</div>
              </div>

              <div style={{ fontSize: '0.75rem', marginBottom: '0.5rem', borderBottom: '1px dashed #111', paddingBottom: '0.5rem', color: '#222' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>رقم الفاتورة:</span>
                  <span style={{ fontWeight: 'bold' }}>{selectedSale.id.toUpperCase().slice(0, 12)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>التاريخ:</span>
                  <span>{new Date(selectedSale.created_at).toLocaleString('ar-YE')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>الكاشير:</span>
                  <span>{selectedSale.created_by}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>العميل:</span>
                  <span>{selectedSale.customer_name || 'نقدي / سفري'}</span>
                </div>
              </div>

              {/* Items Table */}
              <div style={{ borderBottom: '1px dashed #111', paddingBottom: '0.5rem', marginBottom: '0.5rem' }}>
                <table style={{ width: '100%', fontSize: '0.75rem', borderCollapse: 'collapse', color: '#000' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px dashed #bbb' }}>
                      <th style={{ textAlign: 'right', padding: '0.25rem 0' }}>المنتج</th>
                      <th style={{ textAlign: 'center', padding: '0.25rem 0' }}>الكمية</th>
                      <th style={{ textAlign: 'left', padding: '0.25rem 0' }}>السعر</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedSaleItems.map(item => (
                      <tr key={item.id}>
                        <td style={{ padding: '0.35rem 0', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.product_name}
                        </td>
                        <td style={{ padding: '0.35rem 0', textAlign: 'center' }}>{item.qty}</td>
                        <td style={{ padding: '0.35rem 0', textAlign: 'left' }}>
                          {formatMoney(item.qty * item.price).yer}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div style={{ fontSize: '0.8rem', color: '#000', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>إجمالي المبيعات:</span>
                  <span>{formatMoney(selectedSale.total).yer}</span>
                </div>
                {selectedSale.discount && selectedSale.discount > 0 ? (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#ef4444' }}>
                    <span>الخصم الممنوح:</span>
                    <span>-{formatMoney(selectedSale.discount).yer}</span>
                  </div>
                ) : null}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', borderTop: '1px dashed #111', paddingTop: '0.35rem', fontSize: '0.85rem' }}>
                  <span>الإجمالي النهائي:</span>
                  <span>{formatMoney(selectedSale.final_total ?? selectedSale.total).yer}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#555' }}>
                  <span>ما يعادل بالر.س:</span>
                  <span>{formatMoney(selectedSale.final_total ?? selectedSale.total).sar}</span>
                </div>
              </div>

              <div style={{ borderTop: '1px dashed #111', marginTop: '0.75rem', paddingTop: '0.5rem', textAlign: 'center', fontSize: '0.65rem', color: '#666' }}>
                نشكركم لتسوقكم معنا!
              </div>
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.25rem' }}>
              <button 
                onClick={handlePrint} 
                className="btn btn-primary" 
                style={{ flex: 1, border: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}
              >
                <Printer size={16} />
                <span>طباعة حرارية</span>
              </button>
              <button 
                onClick={() => setShowInvoiceModal(false)} 
                className="btn btn-secondary" 
                style={{ border: 'none' }}
              >
                <span>إغلاق</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default InvoicesTab;
