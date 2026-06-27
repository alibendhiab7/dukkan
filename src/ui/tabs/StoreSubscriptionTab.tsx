// src/ui/tabs/StoreSubscriptionTab.tsx
import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../core/api/client';
import { CreditCard, Calendar, Clock, Receipt, RefreshCw, Copy, CheckCircle } from 'lucide-react';

const StoreSubscriptionTab: React.FC = () => {
  const { tenant } = useAuthStore();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchSubscriptionData = async () => {
    if (!tenant) return;
    setLoading(true);
    try {
      const [invList, pmList] = await Promise.all([
        api.invoices.getAll(tenant.id),
        api.platform.paymentMethods.getAll()
      ]);
      setInvoices(invList);
      // Filter active payment methods
      setPaymentMethods(pmList.filter(pm => pm.is_active));
    } catch (e) {
      console.error('Error fetching subscription details:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptionData();
  }, [tenant]);

  if (!tenant) return <div style={{ padding: '2rem', textAlign: 'center' }}>الرجاء تسجيل الدخول أولاً</div>;

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

  // Calculate days remaining
  const expDate = new Date(tenant.subscription_expires_at);
  const today = new Date();
  const diffTime = expDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const isExpired = diffDays <= 0;

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', direction: 'rtl' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ color: 'var(--primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CreditCard size={24} />
            <span>حسابي والاشتراك</span>
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0.25rem 0 0' }}>
            متابعة حالة باقة الاشتراك، الفواتير المستحقة، وطرق سداد الترخيص
          </p>
        </div>
        <button 
          onClick={fetchSubscriptionData} 
          className="btn btn-secondary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 0.85rem', borderRadius: '8px' }}
          disabled={loading}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          تحديث البيانات
        </button>
      </div>

      {/* Main Grid: Subscription Info and Payment Methods */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.5rem' }}>
        
        {/* Subscription Info Card */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'relative', overflow: 'hidden' }}>
          {/* Decorative backdrop glow */}
          <div style={{
            position: 'absolute', top: '-50px', left: '-50px', width: '200px', height: '200px',
            background: isExpired ? 'radial-gradient(circle, rgba(239,68,68,0.15) 0%, transparent 70%)' : 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)',
            pointerEvents: 'none'
          }} />

          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 'bold', borderRight: '4px solid var(--primary)', paddingRight: '0.5rem' }}>
            تفاصيل الاشتراك الحالي
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.25rem' }}>
            <div style={{ backgroundColor: 'var(--background)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>الباقة المفعلة</span>
              <p style={{ fontSize: '1.2rem', fontWeight: '900', color: 'var(--primary)', margin: '0.25rem 0 0' }}>
                {getPlanNameAr(tenant.license_plan)}
              </p>
            </div>

            <div style={{ backgroundColor: 'var(--background)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>حالة الاشتراك</span>
              <p style={{ margin: '0.25rem 0 0 0' }}>
                <span className={`badge ${isExpired ? 'badge-danger' : tenant.status === 'suspended' ? 'badge-danger' : 'badge-success'}`} style={{ fontSize: '0.8rem', padding: '0.25rem 0.6rem' }}>
                  {tenant.status === 'suspended' ? 'موقوف مؤقتاً' : isExpired ? 'منتهي الصلاحية' : 'نشط ومفعل'}
                </span>
              </p>
            </div>

            <div style={{ backgroundColor: 'var(--background)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>تاريخ انتهاء الترخيص</span>
              <p style={{ fontSize: '1rem', fontWeight: '700', margin: '0.25rem 0 0', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Calendar size={16} style={{ color: 'var(--text-muted)' }} />
                <span>{new Date(tenant.subscription_expires_at).toLocaleDateString('ar-YE')}</span>
              </p>
            </div>

            <div style={{ backgroundColor: 'var(--background)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>الأيام المتبقية</span>
              <p style={{ fontSize: '1.2rem', fontWeight: '900', color: isExpired ? 'var(--danger)' : 'var(--success)', margin: '0.25rem 0 0', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Clock size={18} />
                <span>{isExpired ? 'منتهي' : `${diffDays} يوم`}</span>
              </p>
            </div>
          </div>

          <div style={{
            padding: '1rem',
            backgroundColor: '#eff6ff',
            border: '1.5px dashed #bfdbfe',
            borderRadius: '12px',
            fontSize: '0.85rem',
            color: '#1e3a8a',
            lineHeight: '1.6'
          }}>
            <strong>💡 إشعار التجديد التلقائي:</strong>
            <p style={{ margin: '0.25rem 0 0 0' }}>
              لتجنب انقطاع الخدمة أو توقف نظام المبيعات، يرجى سداد قيمة فواتير الاشتراك المستحقة قبل تاريخ الانتهاء. 
              عند تحويل الرسوم لإحدى الحسابات الموضحة في اليسار، سيقوم مسؤول النظام باعتماد العملية وتمديد ترخيص متجرك فوراً.
            </p>
          </div>
        </div>

        {/* Platform Payment Methods */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 'bold', borderRight: '4px solid var(--primary)', paddingRight: '0.5rem' }}>
            طرق الحسابات المعتمدة للسداد
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: 0 }}>
            يمكنك إرسال رسوم التجديد إلى أحد الحسابات التالية ومن ثم التواصل مع الإدارة لاعتماد التمديد:
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '280px', overflowY: 'auto', paddingLeft: '0.25rem' }}>
            {paymentMethods.map((pm) => (
              <div 
                key={pm.id} 
                style={{
                  backgroundColor: 'var(--background)',
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                  transition: 'all 0.2s hover'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 'bold', color: 'var(--primary)', fontSize: '0.9rem' }}>{pm.name}</span>
                  <button
                    onClick={() => copyToClipboard(pm.details, pm.id)}
                    className="btn btn-secondary"
                    style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.25rem', border: 'none', borderRadius: '6px' }}
                  >
                    {copiedId === pm.id ? <CheckCircle size={12} style={{ color: 'var(--success)' }} /> : <Copy size={12} />}
                    <span>{copiedId === pm.id ? 'تم النسخ' : 'نسخ التفاصيل'}</span>
                  </button>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-dark)', whiteSpace: 'pre-wrap', lineHeight: '1.5', backgroundColor: 'var(--surface-hover)', padding: '0.5rem 0.75rem', borderRadius: '6px' }}>
                  {pm.details}
                </div>
              </div>
            ))}
            {paymentMethods.length === 0 && (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                لا توجد طرق دفع معرفة حالياً في النظام. يرجى التواصل مع الإدارة.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Invoices List */}
      <div className="card">
        <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.1rem', fontWeight: 'bold', borderRight: '4px solid var(--primary)', paddingRight: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Receipt size={20} />
          <span>سجل فواتير الاشتراكات والترخيص</span>
        </h3>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>جاري تحميل الفواتير...</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--surface-hover)', borderBottom: '2px solid var(--border)' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>رقم الفاتورة</th>
                  <th style={{ padding: '0.75rem 1rem' }}>الباقة الصادرة</th>
                  <th style={{ padding: '0.75rem 1rem' }}>مدة الرخصة</th>
                  <th style={{ padding: '0.75rem 1rem' }}>قيمة الاشتراك</th>
                  <th style={{ padding: '0.75rem 1rem' }}>تاريخ الاستحقاق</th>
                  <th style={{ padding: '0.75rem 1rem' }}>ملاحظات الإدارة</th>
                  <th style={{ padding: '0.75rem 1rem' }}>الحالة</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', fontWeight: 'bold' }}>#{inv.invoice_number}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>{getPlanNameAr(inv.license_plan)}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>{inv.duration_days} يوم</td>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 'bold' }}>
                      {inv.final_total.toLocaleString('ar-YE')} ر.ي
                      {inv.discount > 0 && (
                        <span style={{ fontSize: '0.7rem', color: 'var(--danger)', marginRight: '0.4rem', textDecoration: 'line-through' }}>
                          {inv.amount.toLocaleString('ar-YE')}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>{new Date(inv.due_date).toLocaleDateString('ar-YE')}</td>
                    <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>{inv.notes || '---'}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span className={`badge ${
                        inv.status === 'paid' ? 'badge-success' :
                        inv.status === 'unpaid' ? 'badge-danger' : 'badge-secondary'
                      }`} style={{ fontSize: '0.75rem' }}>
                        {inv.status === 'paid' ? 'مدفوعة' :
                         inv.status === 'unpaid' ? 'مستحقة' : 'ملغاة'}
                      </span>
                    </td>
                  </tr>
                ))}
                {invoices.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>لا توجد أي فواتير مسجلة لحسابك حالياً.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};

export default StoreSubscriptionTab;
