import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';
import { returnRepo, salesRepo } from '../../core/repositories/turso';
import type { Sale, ProductReturn } from '../../core/repositories/interfaces';
import { strings } from '../../i18n';
import { RotateCcw, Package } from 'lucide-react';

const ReturnsTab: React.FC = () => {
  const { tenant, user } = useAuthStore();
  const { addToast } = useToastStore();
  const [returns, setReturns] = useState<ProductReturn[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [returnItems, setReturnItems] = useState<{ productId: string; qty: number; price: number; name: string }[]>([]);
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (tenant) {
      loadReturns();
      loadSales();
    }
  }, [tenant]);

  const loadReturns = async () => {
    if (!tenant) return;
    const data = await returnRepo.getAll(tenant.id);
    setReturns(data);
  };

  const loadSales = async () => {
    if (!tenant) return;
    const data = await salesRepo.getAll(tenant.id);
    setSales(data);
  };

  const openReturnModal = async (sale: Sale) => {
    const items = await salesRepo.getItems(sale.id);
    setSelectedSale(sale);
    setReturnItems(items.map(i => ({ productId: i.product_id, qty: 0, price: i.price, name: i.product_name || '' })));
    setReason('');
    setShowModal(true);
  };

  const handleReturn = async () => {
    if (!tenant || !user || !selectedSale) return;
    const itemsToReturn = returnItems.filter(i => i.qty > 0);
    if (itemsToReturn.length === 0) {
      addToast('error', 'الرجاء تحديد كمية مرتجعة لمنتج واحد على الأقل');
      return;
    }
    if (!reason) {
      addToast('error', 'الرجاء إدخال سبب الإرجاع');
      return;
    }

    setIsLoading(true);
    try {
      const id = 'ret_' + crypto.randomUUID().replace(/-/g, '').slice(0, 12);
      const totalRefund = itemsToReturn.reduce((sum, i) => sum + i.qty * i.price, 0);

      await returnRepo.create(
        {
          id,
          tenant_id: tenant.id,
          sale_id: selectedSale.id,
          total_refund: totalRefund,
          reason,
          created_by: user.username,
          created_at: new Date().toISOString(),
        },
        itemsToReturn.map((item, idx) => ({
          id: `${id}_item${idx}`,
          return_id: id,
          product_id: item.productId,
          qty: item.qty,
          price: item.price,
        }))
      );

      addToast('success', `تم إنشاء المرتجع بنجاح - المبلغ المسترد: ${totalRefund.toFixed(2)} ر.س`);
      setShowModal(false);
      await loadReturns();
    } catch (err) {
      addToast('error', 'حدث خطأ أثناء إنشاء المرتجع');
    }
    setIsLoading(false);
  };

  const totalRefunded = returns.reduce((sum, r) => sum + r.total_refund, 0);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h2 style={{ color: 'var(--primary)' }}>{strings.returns.title}</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>إدارة مرتجعات المنتجات واسترداد المبالغ ({returns.length} مرتجع - إجمالي المسترد: {totalRefunded.toFixed(2)} ر.س)</p>
      </div>

      <div className="card" style={{ padding: '1.25rem' }}>
        <h3 style={{ fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Package size={18} />
          <span>فواتير المبيعات المتاحة للإرجاع</span>
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '250px', overflowY: 'auto' }}>
          {sales.slice(0, 20).map(s => (
            <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.65rem', backgroundColor: 'var(--surface-hover)', borderRadius: '6px', fontSize: '0.85rem' }}>
              <div>
                <span style={{ fontWeight: '700' }}>{s.id.toUpperCase()}</span>
                <span style={{ color: 'var(--text-muted)', marginRight: '0.5rem' }}>
                  {new Date(s.created_at).toLocaleDateString('ar-YE')} - {s.total.toFixed(2)} ر.س
                </span>
              </div>
              <button onClick={() => openReturnModal(s)} className="btn btn-secondary" style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem' }}>
                <RotateCcw size={12} />
                <span>إرجاع</span>
              </button>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 style={{ marginBottom: '1rem' }}>سجل المرتجعات ({returns.length})</h3>
        <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)', backgroundColor: 'var(--surface-hover)' }}>
                <th style={{ padding: '1rem' }}>رقم المرتجع</th>
                <th style={{ padding: '1rem' }}>فاتورة الأصل</th>
                <th style={{ padding: '1rem' }}>سبب الإرجاع</th>
                <th style={{ padding: '1rem' }}>المبلغ المسترد</th>
                <th style={{ padding: '1rem' }}>بواسطة</th>
                <th style={{ padding: '1rem' }}>التاريخ</th>
              </tr>
            </thead>
            <tbody>
              {returns.map(r => (
                <tr key={r.id} className="table-row-hover" style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '1rem' }}><code style={{ fontWeight: 'bold' }}>{r.id.toUpperCase()}</code></td>
                  <td style={{ padding: '1rem' }}>{r.sale_id.toUpperCase()}</td>
                  <td style={{ padding: '1rem' }}>{r.reason}</td>
                  <td style={{ padding: '1rem', fontWeight: 'bold', color: 'var(--danger)' }}>{r.total_refund.toFixed(2)} ر.س</td>
                  <td style={{ padding: '1rem' }}>{r.created_by}</td>
                  <td style={{ padding: '1rem' }}>{new Date(r.created_at).toLocaleString('ar-YE')}</td>
                </tr>
              ))}
              {returns.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>{strings.returns.noReturns}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && selectedSale && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '500px', padding: '1.75rem', maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
              <h3>إرجاع من فاتورة {selectedSale.id.toUpperCase()}</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: 'var(--text-muted)' }}>&times;</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
              {returnItems.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.65rem', backgroundColor: item.qty > 0 ? 'hsl(142, 69%, 95%)' : 'var(--surface-hover)', borderRadius: '6px' }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: '600', fontSize: '0.85rem' }}>{item.name}</p>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>السعر: {item.price} ر.س</span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    className="input-field"
                    value={item.qty}
                    onChange={(e) => {
                      const newItems = [...returnItems];
                      newItems[idx].qty = parseInt(e.target.value) || 0;
                      setReturnItems(newItems);
                    }}
                    style={{ width: '70px', textAlign: 'center', padding: '0.4rem' }}
                  />
                </div>
              ))}
            </div>

            <div className="input-group">
              <label className="input-label">{strings.returns.reason}</label>
              <select className="input-field" value={reason} onChange={(e) => setReason(e.target.value)}>
                <option value="">اختر السبب...</option>
                <option value="تالف">{strings.returns.damaged}</option>
                <option value="عميل غير راضٍ">{strings.returns.unsatisfied}</option>
                <option value="منتج خاطئ">{strings.returns.wrongItem}</option>
                <option value="أخرى">{strings.returns.other}</option>
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', backgroundColor: 'hsl(0, 84%, 95%)', borderRadius: '6px', marginBottom: '1rem', fontWeight: '700' }}>
              <span>إجمالي الاسترداد:</span>
              <span style={{ color: 'var(--danger)' }}>
                {returnItems.reduce((sum, i) => sum + i.qty * i.price, 0).toFixed(2)} ر.س
              </span>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowModal(false)}>{strings.common.cancel}</button>
              <button className="btn btn-danger" style={{ flex: 2, border: 'none' }} onClick={handleReturn} disabled={isLoading}>
                {isLoading ? strings.common.loading : 'تأكيد الإرجاع'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReturnsTab;
