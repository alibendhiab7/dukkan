import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';
import { usePromotionStore } from '../../store/promotionStore';
import { useInventoryStore } from '../../store/inventoryStore';
import { strings } from '../../i18n';
import { Plus, Trash2, Tag, Gift, Zap, ToggleLeft, ToggleRight } from 'lucide-react';

const PromotionsTab: React.FC = () => {
  const { hasPermission } = useAuthStore();
  const { addToast } = useToastStore();
  const { products } = useInventoryStore();
  const { promotions, addPromotion, removePromotion, togglePromotion } = usePromotionStore();
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '', type: 'bogo' as 'bogo' | 'bundle' | 'flash_sale',
    productId: '', minQty: '2', freeQty: '1', discountPercent: '',
    validFrom: new Date().toISOString().split('T')[0],
    validTo: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
  });

  const handleAdd = () => {
    if (!formData.name || !formData.productId) {
      addToast('error', 'الرجاء تعبئة جميع الحقول');
      return;
    }
    addPromotion({
      name: formData.name,
      type: formData.type,
      productId: formData.productId,
      minQty: parseInt(formData.minQty) || 2,
      freeQty: parseInt(formData.freeQty) || 1,
      discountPercent: formData.discountPercent ? parseInt(formData.discountPercent) : undefined,
      validFrom: new Date(formData.validFrom).toISOString(),
      validTo: new Date(formData.validTo).toISOString(),
      isActive: true,
    });
    addToast('success', 'تم إضافة العرض بنجاح');
    setShowModal(false);
    setFormData({ name: '', type: 'bogo', productId: '', minQty: '2', freeQty: '1', discountPercent: '', validFrom: new Date().toISOString().split('T')[0], validTo: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0] });
  };

  const handleDelete = (id: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا العرض؟')) return;
    removePromotion(id);
    addToast('success', 'تم حذف العرض');
  };

  const typeIcons = { bogo: Gift, bundle: Tag, flash_sale: Zap };
  const typeLabels = { bogo: 'اشترِ X واحصل على Y مجاناً', bundle: 'عرض مجمّع', flash_sale: 'تخفيض سريع' };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ color: 'var(--primary)' }}>العروض والترويجات</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>إنشاء عروض خاصة بالمنتجات</p>
        </div>
        {hasPermission('promotions.add') && (
          <button onClick={() => setShowModal(true)} className="btn btn-primary" style={{ border: 'none' }}>
            <Plus size={18} /> إضافة عرض
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
        {promotions.map(p => {
          const product = products.find(pr => pr.id === p.productId);
          const Icon = typeIcons[p.type];
          const now = new Date();
          const isValid = p.isActive && now >= new Date(p.validFrom) && now <= new Date(p.validTo);
          return (
            <div key={p.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', borderRight: `4px solid ${isValid ? 'var(--success)' : 'var(--border)'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Icon size={18} style={{ color: 'var(--secondary-dark)' }} />
                  <h4 style={{ fontSize: '0.95rem' }}>{p.name}</h4>
                </div>
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  {hasPermission('promotions.add') ? (
                    <button onClick={() => togglePromotion(p.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: p.isActive ? 'var(--success)' : 'var(--text-muted)' }}>
                      {p.isActive ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                    </button>
                  ) : (
                    <span style={{ color: p.isActive ? 'var(--success)' : 'var(--text-muted)', display: 'inline-flex', alignItems: 'center' }}>
                      {p.isActive ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                    </span>
                  )}
                  {hasPermission('promotions.delete') && (
                    <button onClick={() => handleDelete(p.id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}>
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                <p>{typeLabels[p.type]}</p>
                {product && <p>المنتج: <strong>{product.name}</strong></p>}
                <p>الكمية: اشترِ {p.minQty} ← احصل على {p.freeQty} مجاناً</p>
                <p>صالح من: {new Date(p.validFrom).toLocaleDateString('ar-YE')} إلى: {new Date(p.validTo).toLocaleDateString('ar-YE')}</p>
              </div>
              <span className={`badge ${isValid ? 'badge-success' : 'badge-danger'}`} style={{ alignSelf: 'flex-start' }}>
                {isValid ? 'نشط' : 'منتهي'}
              </span>
            </div>
          );
        })}
        {promotions.length === 0 && (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>لا توجد عروض حالياً</div>
        )}
      </div>

      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card animate-fade-in" style={{ width: '450px', padding: '1.75rem' }}>
            <h3 style={{ marginBottom: '1.25rem' }}>إضافة عرض جديد</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="input-group">
                <label className="input-label">اسم العرض</label>
                <input type="text" className="input-field" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="مثال: عرض الحليب" />
              </div>
              <div className="input-group">
                <label className="input-label">نوع العرض</label>
                <select className="input-field" value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}>
                  <option value="bogo">اشترِ 2 واحصل على 1 مجاناً</option>
                  <option value="bundle">عرض مجمّع</option>
                  <option value="flash_sale">تخفيض سريع</option>
                </select>
              </div>
              <div className="input-group">
                <label className="input-label">المنتج</label>
                <select className="input-field" value={formData.productId} onChange={(e) => setFormData({ ...formData, productId: e.target.value })}>
                  <option value="">اختر منتجاً...</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.barcode})</option>)}
                </select>
              </div>
              {formData.type === 'bogo' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="input-group">
                    <label className="input-label">اشترِ (كمية)</label>
                    <input type="number" className="input-field" value={formData.minQty} onChange={(e) => setFormData({ ...formData, minQty: e.target.value })} />
                  </div>
                  <div className="input-group">
                    <label className="input-label">احصل على (مجاني)</label>
                    <input type="number" className="input-field" value={formData.freeQty} onChange={(e) => setFormData({ ...formData, freeQty: e.target.value })} />
                  </div>
                </div>
              )}
              {formData.type === 'flash_sale' && (
                <div className="input-group">
                  <label className="input-label">نسبة التخفيض (%)</label>
                  <input type="number" className="input-field" value={formData.discountPercent} onChange={(e) => setFormData({ ...formData, discountPercent: e.target.value })} placeholder="20" />
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="input-group">
                  <label className="input-label">من تاريخ</label>
                  <input type="date" className="input-field" value={formData.validFrom} onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })} />
                </div>
                <div className="input-group">
                  <label className="input-label">إلى تاريخ</label>
                  <input type="date" className="input-field" value={formData.validTo} onChange={(e) => setFormData({ ...formData, validTo: e.target.value })} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowModal(false)}>{strings.common.cancel}</button>
                <button className="btn btn-primary" style={{ flex: 1, border: 'none' }} onClick={handleAdd}>{strings.common.save}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PromotionsTab;
