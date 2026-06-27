import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';
import { usePromotionStore } from '../../store/promotionStore';
import { useInventoryStore } from '../../store/inventoryStore';
import { strings } from '../../i18n';
import { Plus, Trash2, Tag, Gift, Zap, ToggleLeft, ToggleRight, X } from 'lucide-react';

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
  const typeLabels = { bogo: 'اشترِ X واحصل على Y مجاناً', bundle: 'عرض مجمّع (خصم كمية)', flash_sale: 'تخفيض سريع (فلاش)' };

  const getPromotionDescription = (p: any, product: any) => {
    switch (p.type) {
      case 'bogo':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>نوع العرض: <strong style={{ color: 'var(--primary)' }}>اشترِ {p.minQty} واحصل على {p.freeQty} مجاناً</strong></span>
            {product && <span style={{ fontSize: '0.8rem' }}>المنتج: <strong style={{ color: 'var(--text)' }}>{product.name}</strong></span>}
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>عند شراء {p.minQty} قطع، ستحصل على {p.freeQty} قطعة مجانية بالكامل.</span>
          </div>
        );
      case 'flash_sale':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>نوع العرض: <strong style={{ color: 'var(--warning-dark, #d97706)' }}>تخفيض بنسبة {p.discountPercent}%</strong></span>
            {product && <span style={{ fontSize: '0.8rem' }}>المنتج: <strong style={{ color: 'var(--text)' }}>{product.name}</strong></span>}
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>خصم مباشر وفوري بقيمة {p.discountPercent}% على هذا المنتج.</span>
          </div>
        );
      case 'bundle':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>نوع العرض: <strong style={{ color: 'var(--secondary, #8b5cf6)' }}>خصم كمية {p.discountPercent}% عند شراء {p.minQty}</strong></span>
            {product && <span style={{ fontSize: '0.8rem' }}>المنتج: <strong style={{ color: 'var(--text)' }}>{product.name}</strong></span>}
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>احصل على خصم {p.discountPercent}% عند شراء {p.minQty} قطع أو أكثر من هذا المنتج.</span>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header section with Premium Title card */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'linear-gradient(135deg, var(--surface) 0%, rgba(99,102,241,0.05) 100%)',
        padding: '1.25rem 1.5rem',
        borderRadius: '16px',
        border: '1px solid var(--border)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.02)'
      }}>
        <div>
          <h2 style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.4rem' }}>
            <Gift size={24} style={{ color: 'var(--primary)' }} />
            العروض والترويجات والمكافآت
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.2rem' }}>أنشئ عروضاً خاصة للمنتجات (اشترِ X واحصل على Y، تخفيض فلاش، أو خصم كمية) لزيادة المبيعات</p>
        </div>
        {hasPermission('promotions.add') && (
          <button onClick={() => setShowModal(true)} className="btn btn-primary" style={{
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.6rem 1.25rem',
            borderRadius: '10px',
            boxShadow: '0 4px 12px rgba(99,102,241,0.25)',
            cursor: 'pointer',
            fontWeight: 'bold',
            transition: 'all 0.2s'
          }}>
            <Plus size={18} /> إضافة عرض ترويجي
          </button>
        )}
      </div>

      {/* Grid List */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
        {promotions.map(p => {
          const product = products.find(pr => pr.id === p.productId);
          const Icon = typeIcons[p.type] || Gift;
          const now = new Date();
          const isValid = p.isActive && now >= new Date(p.validFrom) && now <= new Date(p.validTo);
          
          // Color theme based on type
          const themeColor = p.type === 'bogo' ? 'var(--primary)' : p.type === 'flash_sale' ? '#f59e0b' : '#8b5cf6';
          const themeBgLight = p.type === 'bogo' ? 'rgba(99,102,241,0.06)' : p.type === 'flash_sale' ? 'rgba(245,158,11,0.06)' : 'rgba(139,92,246,0.06)';

          return (
            <div key={p.id} className="card hover-card animate-fade-in" style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.85rem',
              padding: '1.25rem',
              borderRadius: '14px',
              border: '1px solid var(--border)',
              borderRight: `5px solid ${themeColor}`,
              background: 'var(--surface)',
              position: 'relative',
              overflow: 'hidden',
              boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
              transition: 'transform 0.2s, box-shadow 0.2s'
            }}>
              {/* Decorative background circle */}
              <div style={{
                position: 'absolute',
                top: '-20px',
                left: '-20px',
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                backgroundColor: themeBgLight,
                zIndex: 0
              }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', zIndex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    backgroundColor: themeBgLight,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: themeColor
                  }}>
                    <Icon size={18} />
                  </div>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 'bold', color: 'var(--text)' }}>{p.name}</h4>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  {hasPermission('promotions.add') ? (
                    <button 
                      onClick={() => togglePromotion(p.id)} 
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: p.isActive ? 'var(--success)' : 'var(--text-muted)', display: 'flex', padding: 0 }}
                      title={p.isActive ? 'تعطيل العرض' : 'تفعيل العرض'}
                    >
                      {p.isActive ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                    </button>
                  ) : (
                    <span style={{ color: p.isActive ? 'var(--success)' : 'var(--text-muted)', display: 'inline-flex', alignItems: 'center' }}>
                      {p.isActive ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                    </span>
                  )}
                  {hasPermission('promotions.delete') && (
                    <button 
                      onClick={() => handleDelete(p.id)} 
                      style={{ 
                        background: 'rgba(239,68,68,0.06)', 
                        border: 'none', 
                        color: 'var(--danger)', 
                        cursor: 'pointer',
                        width: '26px',
                        height: '26px',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'background 0.2s'
                      }}
                      title="حذف العرض"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>

              {/* Description Details */}
              <div style={{ zIndex: 1, padding: '0.2rem 0', flex: 1 }}>
                {getPromotionDescription(p, product)}
              </div>

              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                borderTop: '1px dashed var(--border)', 
                paddingTop: '0.75rem',
                marginTop: '0.25rem',
                fontSize: '0.75rem', 
                color: 'var(--text-muted)',
                zIndex: 1 
              }}>
                <span>فترة الصلاحية: {new Date(p.validFrom).toLocaleDateString('ar-YE')} - {new Date(p.validTo).toLocaleDateString('ar-YE')}</span>
                <span className={`badge ${isValid ? 'badge-success' : 'badge-danger'}`} style={{ 
                  fontSize: '0.65rem', 
                  padding: '0.25rem 0.5rem', 
                  borderRadius: '6px',
                  fontWeight: 'bold' 
                }}>
                  {isValid ? 'نشط حالياً' : 'موقف/منتهي'}
                </span>
              </div>
            </div>
          );
        })}
        {promotions.length === 0 && (
          <div style={{ 
            gridColumn: '1/-1', 
            textAlign: 'center', 
            padding: '4rem 2rem', 
            color: 'var(--text-muted)',
            background: 'var(--surface)',
            border: '1px dashed var(--border)',
            borderRadius: '16px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.75rem'
          }}>
            <Gift size={40} style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
            <span>لا توجد أي عروض ترويجية مسجلة حالياً في هذا المتجر.</span>
          </div>
        )}
      </div>

      {/* Redesigned Premium Modal Drawer / Popup */}
      {showModal && (
        <div style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0, 
          backgroundColor: 'rgba(15, 23, 42, 0.4)', 
          backdropFilter: 'blur(8px)',
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          zIndex: 1050,
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div className="card animate-scale-up" style={{ 
            width: '480px', 
            maxWidth: '90%',
            padding: '2rem', 
            borderRadius: '20px',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
            border: '1px solid var(--border)',
            background: 'var(--surface)',
            overflow: 'hidden'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.15rem', color: 'var(--text)' }}>
                <Plus size={20} style={{ color: 'var(--primary)' }} />
                إنشاء عرض ترويجي جديد للمتجر
              </h3>
              <button 
                onClick={() => setShowModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.2rem' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
              <div className="input-group">
                <label className="input-label" style={{ fontWeight: 'bold', fontSize: '0.8rem', marginBottom: '0.4rem' }}>اسم العرض الترويجي</label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={formData.name} 
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                  placeholder="مثال: خصم الصيف الحارق، عرض العيد..." 
                  style={{ borderRadius: '8px', padding: '0.6rem 0.8rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="input-group">
                  <label className="input-label" style={{ fontWeight: 'bold', fontSize: '0.8rem', marginBottom: '0.4rem' }}>نوع العرض الترويجي</label>
                  <select 
                    className="input-field" 
                    value={formData.type} 
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    style={{ borderRadius: '8px', padding: '0.6rem 0.8rem' }}
                  >
                    <option value="bogo">اشترِ X واحصل على Y مجاناً</option>
                    <option value="flash_sale">خصم مئوي مباشر (فلاش)</option>
                    <option value="bundle">عرض كمية (تخفيض عند شراء X)</option>
                  </select>
                </div>

                <div className="input-group">
                  <label className="input-label" style={{ fontWeight: 'bold', fontSize: '0.8rem', marginBottom: '0.4rem' }}>المنتج المستهدف</label>
                  <select 
                    className="input-field" 
                    value={formData.productId} 
                    onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
                    style={{ borderRadius: '8px', padding: '0.6rem 0.8rem' }}
                  >
                    <option value="">اختر منتجاً...</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.barcode})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Dynamic form controls depending on promotion type */}
              {formData.type === 'bogo' && (
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '1fr 1fr', 
                  gap: '1rem',
                  backgroundColor: 'rgba(99,102,241,0.04)',
                  padding: '1rem',
                  borderRadius: '12px',
                  border: '1px solid rgba(99,102,241,0.1)'
                }}>
                  <div className="input-group">
                    <label className="input-label" style={{ fontWeight: 'bold', fontSize: '0.8rem', marginBottom: '0.4rem', color: 'var(--primary)' }}>كمية الشراء (X)</label>
                    <input 
                      type="number" 
                      min={1}
                      className="input-field" 
                      value={formData.minQty} 
                      onChange={(e) => setFormData({ ...formData, minQty: e.target.value })} 
                      style={{ borderRadius: '8px', padding: '0.5rem' }}
                    />
                  </div>
                  <div className="input-group">
                    <label className="input-label" style={{ fontWeight: 'bold', fontSize: '0.8rem', marginBottom: '0.4rem', color: 'var(--primary)' }}>الكمية المجانية (Y)</label>
                    <input 
                      type="number" 
                      min={1}
                      className="input-field" 
                      value={formData.freeQty} 
                      onChange={(e) => setFormData({ ...formData, freeQty: e.target.value })} 
                      style={{ borderRadius: '8px', padding: '0.5rem' }}
                    />
                  </div>
                </div>
              )}

              {formData.type === 'flash_sale' && (
                <div style={{ 
                  backgroundColor: 'rgba(245,158,11,0.04)',
                  padding: '1rem',
                  borderRadius: '12px',
                  border: '1px solid rgba(245,158,11,0.1)'
                }}>
                  <div className="input-group">
                    <label className="input-label" style={{ fontWeight: 'bold', fontSize: '0.8rem', marginBottom: '0.4rem', color: 'var(--secondary)' }}>نسبة التخفيض المئوية (%)</label>
                    <input 
                      type="number" 
                      min={1}
                      max={100}
                      className="input-field" 
                      value={formData.discountPercent} 
                      onChange={(e) => setFormData({ ...formData, discountPercent: e.target.value })} 
                      placeholder="مثال: 20 لخصم 20%" 
                      style={{ borderRadius: '8px', padding: '0.6rem 0.8rem' }}
                    />
                  </div>
                </div>
              )}

              {formData.type === 'bundle' && (
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '1fr 1fr', 
                  gap: '1rem',
                  backgroundColor: 'rgba(139,92,246,0.04)',
                  padding: '1rem',
                  borderRadius: '12px',
                  border: '1px solid rgba(139,92,246,0.1)'
                }}>
                  <div className="input-group">
                    <label className="input-label" style={{ fontWeight: 'bold', fontSize: '0.8rem', marginBottom: '0.4rem', color: 'var(--primary)' }}>الحد الأدنى للشراء</label>
                    <input 
                      type="number" 
                      min={1}
                      className="input-field" 
                      value={formData.minQty} 
                      onChange={(e) => setFormData({ ...formData, minQty: e.target.value })} 
                      style={{ borderRadius: '8px', padding: '0.5rem' }}
                    />
                  </div>
                  <div className="input-group">
                    <label className="input-label" style={{ fontWeight: 'bold', fontSize: '0.8rem', marginBottom: '0.4rem', color: 'var(--primary)' }}>نسبة الخصم المطبق (%)</label>
                    <input 
                      type="number" 
                      min={1}
                      max={100}
                      className="input-field" 
                      value={formData.discountPercent} 
                      onChange={(e) => setFormData({ ...formData, discountPercent: e.target.value })} 
                      style={{ borderRadius: '8px', padding: '0.5rem' }}
                    />
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="input-group">
                  <label className="input-label" style={{ fontWeight: 'bold', fontSize: '0.8rem', marginBottom: '0.4rem' }}>تاريخ بدء العرض</label>
                  <input 
                    type="date" 
                    className="input-field" 
                    value={formData.validFrom} 
                    onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })} 
                    style={{ borderRadius: '8px', padding: '0.6rem 0.8rem' }}
                  />
                </div>
                <div className="input-group">
                  <label className="input-label" style={{ fontWeight: 'bold', fontSize: '0.8rem', marginBottom: '0.4rem' }}>تاريخ انتهاء العرض</label>
                  <input 
                    type="date" 
                    className="input-field" 
                    value={formData.validTo} 
                    onChange={(e) => setFormData({ ...formData, validTo: e.target.value })} 
                    style={{ borderRadius: '8px', padding: '0.6rem 0.8rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                <button 
                  className="btn btn-secondary" 
                  style={{ flex: 1, padding: '0.6rem', borderRadius: '10px', fontWeight: 'bold' }} 
                  onClick={() => setShowModal(false)}
                >
                  {strings.common.cancel}
                </button>
                <button 
                  className="btn btn-primary" 
                  style={{ flex: 1, border: 'none', padding: '0.6rem', borderRadius: '10px', fontWeight: 'bold' }} 
                  onClick={handleAdd}
                >
                  {strings.common.save}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PromotionsTab;
