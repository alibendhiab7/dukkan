// src/ui/tabs/InventoryTab.tsx
import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useInventoryStore } from '../../store/inventoryStore';
import { strings } from '../../i18n';
import { Plus, Edit2, ArrowUpDown, Trash2, Search, AlertCircle } from 'lucide-react';

const InventoryTab: React.FC = () => {
  const { tenant, user, hasPermission } = useAuthStore();
  const { products, addProduct, updateProduct, deleteProduct, adjustStock, error: inventoryError } = useInventoryStore();

  const [searchQuery, setSearchQuery] = useState('');
  
  // Product Modals State
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  
  // Product Form Fields
  const [prodName, setProdName] = useState('');
  const [prodBarcode, setProdBarcode] = useState('');
  const [prodPurchase, setProdPurchase] = useState('');
  const [prodSale, setProdSale] = useState('');
  const [prodQty, setProdQty] = useState('');

  // Stock Adjust Modal State
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustTargetProduct, setAdjustTargetProduct] = useState<any | null>(null);
  const [adjustType, setAdjustType] = useState<'in' | 'out'>('in');
  const [adjustQty, setAdjustQty] = useState('');
  
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const openAddModal = () => {
    setEditingProduct(null);
    setProdName('');
    setProdBarcode('');
    setProdPurchase('');
    setProdSale('');
    setProdQty('');
    setFormError(null);
    setShowAddEditModal(true);
  };

  const openEditModal = (p: any) => {
    setEditingProduct(p);
    setProdName(p.name);
    setProdBarcode(p.barcode);
    setProdPurchase(p.purchase_price.toString());
    setProdSale(p.sale_price.toString());
    setProdQty(p.quantity.toString());
    setFormError(null);
    setShowAddEditModal(true);
  };

  const openAdjustModal = (p: any) => {
    setAdjustTargetProduct(p);
    setAdjustType('in');
    setAdjustQty('');
    setFormError(null);
    setShowAdjustModal(true);
  };

  const handleAddEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const purchaseVal = parseFloat(prodPurchase);
    const saleVal = parseFloat(prodSale);
    const qtyVal = parseInt(prodQty, 10);

    if (!prodName || !prodBarcode || isNaN(purchaseVal) || isNaN(saleVal) || isNaN(qtyVal)) {
      setFormError('الرجاء تعبئة كافة الحقول بقيم صحيحة');
      return;
    }

    if (purchaseVal > saleVal) {
      setFormError('تحذير: سعر الشراء أكبر من سعر البيع!');
    }

    setIsSubmitting(true);
    let success = false;

    if (editingProduct) {
      // Update
      success = await updateProduct(tenant!.id, {
        ...editingProduct,
        name: prodName,
        barcode: prodBarcode,
        purchase_price: purchaseVal,
        sale_price: saleVal,
        quantity: qtyVal
      }, user!.username);
    } else {
      // Add new
      success = await addProduct(tenant!.id, {
        name: prodName,
        barcode: prodBarcode,
        purchase_price: purchaseVal,
        sale_price: saleVal,
        quantity: qtyVal,
        currency: 'SAR'
      }, user!.username);
    }

    setIsSubmitting(false);

    if (success) {
      setShowAddEditModal(false);
    } else {
      setFormError(inventoryError || 'حدث خطأ أثناء حفظ المنتج');
    }
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const qtyVal = parseInt(adjustQty, 10);
    if (isNaN(qtyVal) || qtyVal <= 0) {
      setFormError('الرجاء إدخال كمية صحيحة أكبر من الصفر');
      return;
    }

    setIsSubmitting(true);
    const success = await adjustStock(
      tenant!.id,
      adjustTargetProduct.id,
      qtyVal,
      adjustType,
      user!.username
    );
    setIsSubmitting(false);

    if (success) {
      setShowAdjustModal(false);
    } else {
      setFormError(inventoryError || 'فشل إجراء تسوية المخزون');
    }
  };

  const handleDeleteProduct = async (p: any) => {
    if (window.confirm(`هل أنت متأكد من حذف المنتج "${p.name}" نهائياً من المتجر؟`)) {
      const success = await deleteProduct(tenant!.id, p.id, user!.username);
      if (!success) {
        alert(inventoryError || 'فشل حذف المنتج');
      }
    }
  };

  // Filter products based on search
  const filteredProducts = products.filter(p => 
    p.name.includes(searchQuery) || 
    p.barcode.includes(searchQuery)
  );

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Top Header Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ color: 'var(--primary)' }}>{strings.inventory.title}</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>مراقبة وتعديل المخزون للمنتجات والكميات الحالية</p>
        </div>

        <button onClick={openAddModal} className="btn btn-primary" style={{ border: 'none' }}>
          <Plus size={18} />
          <span>{strings.inventory.addProduct}</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="card" style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', position: 'relative' }}>
        <input
          type="text"
          className="input-field"
          placeholder="البحث عن طريق اسم المنتج أو كود الباركود..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ width: '100%', paddingRight: '2.5rem', border: '1px solid var(--border)' }}
        />
        <Search size={18} style={{
          position: 'absolute', right: '1.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)'
        }} />
      </div>

      {/* Inventory Table Card */}
      <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border)', backgroundColor: 'var(--surface-hover)' }}>
              <th style={{ padding: '1rem' }}>{strings.inventory.barcode}</th>
              <th style={{ padding: '1rem' }}>{strings.inventory.productName}</th>
              <th style={{ padding: '1rem' }}>{strings.inventory.purchasePrice}</th>
              <th style={{ padding: '1rem' }}>{strings.inventory.salePrice}</th>
              <th style={{ padding: '1rem' }}>{strings.inventory.qty}</th>
              <th style={{ padding: '1rem', textAlign: 'left' }}>{strings.common.actions}</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map(p => (
              <tr key={p.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }} className="table-row-hover">
                <td style={{ padding: '1rem' }}>
                  <code style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>{p.barcode}</code>
                </td>
                <td style={{ padding: '1rem', fontWeight: '600' }}>
                  {p.name}
                  {p.quantity < 5 && (
                    <span className="badge badge-danger" style={{ marginRight: '0.5rem', fontSize: '0.65rem' }}>
                      منخفض
                    </span>
                  )}
                </td>
                <td style={{ padding: '1rem' }}>{p.purchase_price.toFixed(2)} ر.س</td>
                <td style={{ padding: '1rem', fontWeight: 'bold', color: 'var(--success)' }}>{p.sale_price.toFixed(2)} ر.س</td>
                <td style={{ padding: '1rem' }}>
                  <span style={{
                    fontWeight: 'bold',
                    color: p.quantity < 5 ? 'var(--danger)' : 'var(--text)'
                  }}>{p.quantity} قطع</span>
                </td>
                <td style={{ padding: '1rem', textAlign: 'left' }}>
                  <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => openAdjustModal(p)}
                      className="btn btn-secondary"
                      style={{ padding: '0.35rem 0.5rem', fontSize: '0.75rem', borderRadius: '6px' }}
                      title="تسوية الكمية"
                    >
                      <ArrowUpDown size={14} />
                      <span>تسوية</span>
                    </button>
                    <button
                      onClick={() => openEditModal(p)}
                      className="btn btn-secondary"
                      style={{ padding: '0.35rem 0.5rem', fontSize: '0.75rem', borderRadius: '6px' }}
                      title="تعديل المنتج"
                    >
                      <Edit2 size={14} />
                    </button>
                    {hasPermission('admin') && (
                      <button
                        onClick={() => handleDeleteProduct(p)}
                        className="btn btn-danger"
                        style={{ padding: '0.35rem 0.5rem', fontSize: '0.75rem', borderRadius: '6px', border: 'none' }}
                        title="حذف المنتج"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}

            {filteredProducts.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  {strings.inventory.noProducts}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 1. Add / Edit Product Modal */}
      {showAddEditModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '480px', padding: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
              <h3>{editingProduct ? strings.inventory.editProduct : strings.inventory.addProduct}</h3>
              <button onClick={() => setShowAddEditModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: 'var(--text-muted)' }}>&times;</button>
            </div>

            {formError && (
              <div style={{
                backgroundColor: 'hsl(0, 84%, 96%)', color: 'var(--danger)', padding: '0.5rem 0.75rem', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem'
              }}>
                <AlertCircle size={16} />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleAddEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="input-group">
                <label className="input-label">{strings.inventory.productName}</label>
                <input
                  type="text"
                  className="input-field"
                  value={prodName}
                  onChange={(e) => setProdName(e.target.value)}
                  placeholder="حليب، أرز، زيت..."
                  required
                />
              </div>

              <div className="input-group">
                <label className="input-label">{strings.inventory.barcode}</label>
                <input
                  type="text"
                  className="input-field"
                  value={prodBarcode}
                  onChange={(e) => setProdBarcode(e.target.value)}
                  placeholder="629100..."
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="input-group">
                  <label className="input-label">{strings.inventory.purchasePrice}</label>
                  <input
                    type="number"
                    step="0.01"
                    className="input-field"
                    value={prodPurchase}
                    onChange={(e) => setProdPurchase(e.target.value)}
                    placeholder="35.00"
                    required
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">{strings.inventory.salePrice}</label>
                  <input
                    type="number"
                    step="0.01"
                    className="input-field"
                    value={prodSale}
                    onChange={(e) => setProdSale(e.target.value)}
                    placeholder="40.00"
                    required
                  />
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">الكمية الحالية المتوفرة</label>
                <input
                  type="number"
                  className="input-field"
                  value={prodQty}
                  onChange={(e) => setProdQty(e.target.value)}
                  placeholder="50"
                  disabled={editingProduct !== null} // Adjust stock tab handles quantity modification after creation
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowAddEditModal(false)}>
                  {strings.common.cancel}
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 2, border: 'none' }} disabled={isSubmitting}>
                  {isSubmitting ? strings.common.loading : strings.common.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Stock Adjustment Modal */}
      {showAdjustModal && adjustTargetProduct && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '400px', padding: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
              <h3>{strings.inventory.adjustStock}</h3>
              <button onClick={() => setShowAdjustModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: 'var(--text-muted)' }}>&times;</button>
            </div>

            {formError && (
              <div style={{
                backgroundColor: 'hsl(0, 84%, 96%)', color: 'var(--danger)', padding: '0.5rem 0.75rem', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '1rem'
              }}>{formError}</div>
            )}

            <div style={{ marginBottom: '1rem', backgroundColor: 'var(--background)', padding: '0.75rem', borderRadius: '8px', fontSize: '0.85rem' }}>
              <div><strong>المنتج:</strong> {adjustTargetProduct.name}</div>
              <div><strong>المخزون الحالي:</strong> {adjustTargetProduct.quantity} قطع</div>
            </div>

            <form onSubmit={handleAdjustSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="input-group">
                <label className="input-label">{strings.inventory.adjustmentType}</label>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer', fontWeight: '600' }}>
                    <input
                      type="radio"
                      name="adjustType"
                      value="in"
                      checked={adjustType === 'in'}
                      onChange={() => setAdjustType('in')}
                    />
                    <span>{strings.inventory.stockIn} (+)</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer', fontWeight: '600' }}>
                    <input
                      type="radio"
                      name="adjustType"
                      value="out"
                      checked={adjustType === 'out'}
                      onChange={() => setAdjustType('out')}
                    />
                    <span>{strings.inventory.stockOut} (-)</span>
                  </label>
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">{strings.inventory.qtyToAdjust}</label>
                <input
                  type="number"
                  className="input-field"
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(e.target.value)}
                  placeholder="10"
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowAdjustModal(false)}>
                  {strings.common.cancel}
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 2, border: 'none' }} disabled={isSubmitting}>
                  {isSubmitting ? strings.common.loading : 'تأكيد التسوية'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default InventoryTab;
