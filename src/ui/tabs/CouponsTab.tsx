import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';
import { couponRepo } from '../../core/repositories/turso';
import type { Coupon } from '../../core/repositories/interfaces';
import { strings } from '../../i18n';
import { Plus, Edit2, Trash2, Tag, CheckCircle, XCircle, Percent, DollarSign } from 'lucide-react';

const CouponsTab: React.FC = () => {
  const { tenant } = useAuthStore();
  const { addToast } = useToastStore();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    discount_type: 'percentage' as 'percentage' | 'fixed',
    discount_value: '',
    max_uses: '',
    min_cart_total: '',
    expires_at: '',
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (tenant) loadCoupons();
  }, [tenant]);

  const loadCoupons = async () => {
    if (!tenant) return;
    const data = await couponRepo.getAll(tenant.id);
    setCoupons(data);
  };

  const openAddModal = () => {
    setEditingCoupon(null);
    setFormData({ code: '', discount_type: 'percentage', discount_value: '', max_uses: '100', min_cart_total: '0', expires_at: '' });
    setShowModal(true);
  };

  const openEditModal = (c: Coupon) => {
    setEditingCoupon(c);
    setFormData({
      code: c.code,
      discount_type: c.discount_type,
      discount_value: c.discount_value.toString(),
      max_uses: c.max_uses.toString(),
      min_cart_total: c.min_cart_total.toString(),
      expires_at: c.expires_at.split('T')[0],
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant || !formData.code || !formData.discount_value || !formData.expires_at) {
      addToast('error', 'الرجاء تعبئة كافة الحقول المطلوبة');
      return;
    }
    setIsLoading(true);
    try {
      const couponData = {
        code: formData.code.toUpperCase(),
        discount_type: formData.discount_type,
        discount_value: parseFloat(formData.discount_value),
        max_uses: parseInt(formData.max_uses) || 100,
        min_cart_total: parseFloat(formData.min_cart_total) || 0,
        expires_at: new Date(formData.expires_at).toISOString(),
        is_active: true,
      };

      if (editingCoupon) {
        await couponRepo.update({ ...editingCoupon, ...couponData });
        addToast('success', `تم تعديل الكوبون "${couponData.code}" بنجاح`);
      } else {
        const id = 'coupon_' + crypto.randomUUID().replace(/-/g, '').slice(0, 12);
        await couponRepo.create({
          id,
          tenant_id: tenant.id,
          used_count: 0,
          created_at: new Date().toISOString(),
          ...couponData,
        });
        addToast('success', `تم إنشاء الكوبون "${couponData.code}" بنجاح`);
      }
      setShowModal(false);
      await loadCoupons();
    } catch (err) {
      addToast('error', 'حدث خطأ أثناء حفظ الكوبون');
    }
    setIsLoading(false);
  };

  const handleDelete = async (c: Coupon) => {
    if (!tenant || !window.confirm(`هل أنت متأكد من حذف الكوبون "${c.code}"؟`)) return;
    await couponRepo.delete(c.id, tenant.id);
    addToast('success', `تم حذف الكوبون "${c.code}" بنجاح`);
    await loadCoupons();
  };

  const isExpired = (c: Coupon) => new Date(c.expires_at) < new Date();
  const isMaxedOut = (c: Coupon) => c.used_count >= c.max_uses;
  const isValid = (c: Coupon) => c.is_active && !isExpired(c) && !isMaxedOut(c);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ color: 'var(--primary)' }}>{strings.coupons.title}</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>إنشاء وإدارة كوبونات الخصم للعملاء</p>
        </div>
        <button onClick={openAddModal} className="btn btn-primary" style={{ border: 'none' }}>
          <Plus size={18} />
          <span>{strings.coupons.addCoupon}</span>
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
        {coupons.map(c => (
          <div key={c.id} className="card" style={{
            display: 'flex', flexDirection: 'column', gap: '0.75rem',
            borderRight: `4px solid ${isValid(c) ? 'var(--success)' : 'var(--danger)'}`,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <Tag size={16} style={{ color: 'var(--primary)' }} />
                  <h3 style={{ fontSize: '1.1rem', fontFamily: 'monospace', letterSpacing: '1px' }}>{c.code}</h3>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.2rem', fontWeight: '800', color: 'var(--success)' }}>
                  {c.discount_type === 'percentage' ? <Percent size={18} /> : <DollarSign size={18} />}
                  <span>{c.discount_value} {c.discount_type === 'percentage' ? '%' : 'ر.س'}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                <button onClick={() => openEditModal(c)} className="btn btn-secondary" style={{ padding: '0.35rem', fontSize: '0.75rem', borderRadius: '6px' }}>
                  <Edit2 size={14} />
                </button>
                <button onClick={() => handleDelete(c)} className="btn btn-danger" style={{ padding: '0.35rem', fontSize: '0.75rem', borderRadius: '6px', border: 'none' }}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>الاستخدامات:</span>
                <span style={{ fontWeight: '700' }}>{c.used_count} / {c.max_uses}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>الحد الأدنى للسلة:</span>
                <span style={{ fontWeight: '700' }}>{c.min_cart_total} ر.س</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>تاريخ الانتهاء:</span>
                <span style={{ fontWeight: '700' }}>{new Date(c.expires_at).toLocaleDateString('ar-YE')}</span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              {isValid(c) ? (
                <span className="badge badge-success" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <CheckCircle size={12} /> صالح
                </span>
              ) : (
                <span className="badge badge-danger" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <XCircle size={12} />
                  {isExpired(c) ? 'منتهي الصلاحية' : isMaxedOut(c) ? 'تم الوصول للحد الأقصى' : 'معطل'}
                </span>
              )}
            </div>
          </div>
        ))}

        {coupons.length === 0 && (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            {strings.coupons.noCoupons}
          </div>
        )}
      </div>

      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '440px', padding: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
              <h3>{editingCoupon ? strings.coupons.editCoupon : strings.coupons.addCoupon}</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: 'var(--text-muted)' }}>&times;</button>
            </div>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="input-group">
                <label className="input-label">{strings.coupons.code}</label>
                <input type="text" className="input-field" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })} placeholder="WELCOME10" required style={{ fontFamily: 'monospace', letterSpacing: '1px' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="input-group">
                  <label className="input-label">{strings.coupons.discountType}</label>
                  <select className="input-field" value={formData.discount_type} onChange={(e) => setFormData({ ...formData, discount_type: e.target.value as 'percentage' | 'fixed' })}>
                    <option value="percentage">{strings.coupons.percentage}</option>
                    <option value="fixed">{strings.coupons.fixed}</option>
                  </select>
                </div>
                <div className="input-group">
                  <label className="input-label">{strings.coupons.discountValue}</label>
                  <input type="number" className="input-field" value={formData.discount_value} onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })} required />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="input-group">
                  <label className="input-label">{strings.coupons.maxUses}</label>
                  <input type="number" className="input-field" value={formData.max_uses} onChange={(e) => setFormData({ ...formData, max_uses: e.target.value })} />
                </div>
                <div className="input-group">
                  <label className="input-label">{strings.coupons.minCartTotal}</label>
                  <input type="number" className="input-field" value={formData.min_cart_total} onChange={(e) => setFormData({ ...formData, min_cart_total: e.target.value })} />
                </div>
              </div>
              <div className="input-group">
                <label className="input-label">{strings.coupons.expiresAt}</label>
                <input type="date" className="input-field" value={formData.expires_at} onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })} required />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowModal(false)}>{strings.common.cancel}</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 2, border: 'none' }} disabled={isLoading}>
                  {isLoading ? strings.common.loading : strings.common.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CouponsTab;
