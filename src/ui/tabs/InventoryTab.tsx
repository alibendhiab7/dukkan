// src/ui/tabs/InventoryTab.tsx
import React, { useState, useRef } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useInventoryStore } from '../../store/inventoryStore';
import { useToastStore } from '../../store/toastStore';
import { movementRepo } from '../../core/repositories/turso';
import type { InventoryMovement } from '../../core/repositories/interfaces';
import { strings } from '../../i18n';
import {
  Plus, Edit2, ArrowUpDown, Trash2, Search, AlertCircle, Download, Upload,
  Filter, History, ArrowDownLeft, ArrowUpRight, Zap
} from 'lucide-react';
import { useSortableData, SortableHeader } from '../components/SortableTable';
import { usePromotionStore } from '../../store/promotionStore';

const InventoryTab: React.FC = () => {
  const { tenant, user, hasPermission } = useAuthStore();
  const { addProduct, updateProduct, deleteProduct, adjustStock, getCategories, getProductsByCategory, error: inventoryError } = useInventoryStore();
  const { addToast } = useToastStore();
  const { isFlashSale, getDiscountedPrice } = usePromotionStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'lowStock' | 'outOfStock' | 'expiry'>('all');

  const normalizeArabic = (str: string): string => {
    return str
      .replace(/[\u064B-\u065F]/g, "")
      .replace(/[أإآ]/g, "ا")
      .replace(/ة/g, "ه")
      .replace(/ى/g, "ي");
  };

  const isNearExpiry = (dateStr: string | null | undefined): boolean => {
    if (!dateStr) return false;
    const expiryDate = new Date(dateStr);
    if (isNaN(expiryDate.getTime())) return false;
    const now = new Date();
    const diffTime = expiryDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 30;
  };


  // Product Modals
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [prodName, setProdName] = useState('');
  const [prodBarcode, setProdBarcode] = useState('');
  const [prodPurchase, setProdPurchase] = useState('');
  const [prodSale, setProdSale] = useState('');
  const [prodQty, setProdQty] = useState('');
  const [prodCategory, setProdCategory] = useState('');
  const [prodUnit, setProdUnit] = useState('piece');
  const [prodMinStock, setProdMinStock] = useState('5');
  const [prodMaxStock, setProdMaxStock] = useState('100');
  const [prodExpiry, setProdExpiry] = useState('');

  // Stock Adjust Modal
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustTargetProduct, setAdjustTargetProduct] = useState<any | null>(null);
  const [adjustType, setAdjustType] = useState<'in' | 'out'>('in');
  const [adjustQty, setAdjustQty] = useState('');

  // Stock History Modal
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyTarget, setHistoryTarget] = useState<any | null>(null);
  const [historyData, setHistoryData] = useState<InventoryMovement[]>([]);

  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const categories = getCategories();

  const filteredProducts = getProductsByCategory(categoryFilter).filter(p => {
    if (searchQuery.trim() !== '') {
      const normalizedQuery = normalizeArabic(searchQuery.toLowerCase());
      const normalizedName = normalizeArabic(p.name.toLowerCase());
      const normalizedBarcode = normalizeArabic(p.barcode.toLowerCase());
      if (!normalizedName.includes(normalizedQuery) && !normalizedBarcode.includes(normalizedQuery)) {
        return false;
      }
    }
    if (statusFilter === 'lowStock') {
      const minStock = p.min_stock !== undefined ? p.min_stock : 5;
      return p.quantity > 0 && p.quantity <= minStock;
    }
    if (statusFilter === 'outOfStock') {
      return p.quantity <= 0;
    }
    if (statusFilter === 'expiry') {
      return isNearExpiry(p.expiry_date);
    }
    return true;
  });


  const { sortedItems, requestSort, sortKey, sortDirection } = useSortableData({ items: filteredProducts, defaultKey: 'name' });

  const openAddModal = () => {
    setEditingProduct(null);
    setProdName(''); setProdBarcode(''); setProdPurchase(''); setProdSale('');
    setProdQty(''); setProdCategory(''); setProdUnit('piece');
    setProdMinStock('5'); setProdMaxStock('100'); setProdExpiry('');
    setFormError(null);
    setShowAddEditModal(true);
  };

  const openEditModal = (p: any) => {
    setEditingProduct(p);
    setProdName(p.name); setProdBarcode(p.barcode);
    setProdPurchase(p.purchase_price.toString()); setProdSale(p.sale_price.toString());
    setProdQty(p.quantity.toString()); setProdCategory(p.category || '');
    setProdUnit(p.unit_of_measure || 'piece');
    setProdMinStock((p.min_stock || 5).toString());
    setProdMaxStock((p.max_stock || 100).toString());
    setProdExpiry(p.expiry_date ? p.expiry_date.split('T')[0] : '');
    setFormError(null);
    setShowAddEditModal(true);
  };

  const openAdjustModal = (p: any) => {
    setAdjustTargetProduct(p);
    setAdjustType('in'); setAdjustQty('');
    setFormError(null);
    setShowAdjustModal(true);
  };

  const openHistoryModal = async (p: any) => {
    if (!tenant) return;
    setHistoryTarget(p);
    const movements = await movementRepo.getByProduct(p.id, tenant.id);
    setHistoryData(movements);
    setShowHistoryModal(true);
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

    setIsSubmitting(true);
    let success = false;
    const productData = {
      name: prodName, barcode: prodBarcode, purchase_price: purchaseVal,
      sale_price: saleVal, quantity: qtyVal, currency: 'SAR' as const,
      category: prodCategory || undefined, unit_of_measure: prodUnit,
      min_stock: parseInt(prodMinStock) || 5, max_stock: parseInt(prodMaxStock) || 100,
      expiry_date: prodExpiry || undefined,
    };

    if (editingProduct) {
      success = await updateProduct(tenant!.id, { ...editingProduct, ...productData }, user!.username);
    } else {
      success = await addProduct(tenant!.id, productData, user!.username);
    }

    setIsSubmitting(false);
    if (success) setShowAddEditModal(false);
    else setFormError(inventoryError || 'حدث خطأ أثناء الحفظ');
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const qtyVal = parseInt(adjustQty, 10);
    if (isNaN(qtyVal) || qtyVal <= 0) {
      setFormError('الرجاء إدخال كمية صحيحة');
      return;
    }
    setIsSubmitting(true);
    const success = await adjustStock(tenant!.id, adjustTargetProduct.id, qtyVal, adjustType, user!.username);
    setIsSubmitting(false);
    if (success) setShowAdjustModal(false);
    else setFormError(inventoryError || 'فشل التسوية');
  };

  const handleDeleteProduct = async (p: any) => {
    if (window.confirm(`هل أنت متأكد من حذف "${p.name}" نهائياً؟`)) {
      const success = await deleteProduct(tenant!.id, p.id, user!.username);
      if (!success) addToast('error', inventoryError || 'فشل الحذف');
    }
  };

  // CSV Export
  const handleExportCSV = () => {
    const data = filteredProducts.map(p => ({
      الاسم: p.name, الباركود: p.barcode, سعر_الشراء: p.purchase_price,
      سعر_البيع: p.sale_price, الكمية: p.quantity, التصنيف: p.category || '',
      وحدة_القياس: p.unit_of_measure || 'piece', الحد_الأدنى: p.min_stock || 5,
      الحد_الأقصى: p.max_stock || 100, الصلاحية: p.expiry_date || '',
    }));

    const headers = Object.keys(data[0]);
    const csv = [headers.join(','), ...data.map(r => headers.map(h => `"${(r as any)[h]}"`).join(','))].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `products-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    addToast('success', `تم تصدير ${data.length} منتج بنجاح`);
  };

  // CSV Import
  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !tenant || !user) return;

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(l => l.trim());
      if (lines.length < 2) { addToast('error', 'الملف فارغ'); return; }

      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      let imported = 0;

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
        if (values.length < 4) continue;

        const nameIdx = headers.findIndex(h => h.includes('الاسم') || h.includes('name'));
        const barcodeIdx = headers.findIndex(h => h.includes('الباركود') || h.includes('barcode'));
        const buyIdx = headers.findIndex(h => h.includes('الشراء') || h.includes('buy') || h.includes('purchase'));
        const sellIdx = headers.findIndex(h => h.includes('البيع') || h.includes('sell') || h.includes('sale'));
        const qtyIdx = headers.findIndex(h => h.includes('الكمية') || h.includes('qty') || h.includes('quantity'));
        const catIdx = headers.findIndex(h => h.includes('التصنيف') || h.includes('category'));

        const name = values[nameIdx >= 0 ? nameIdx : 0];
        const barcode = values[barcodeIdx >= 0 ? barcodeIdx : 1];
        const buy = parseFloat(values[buyIdx >= 0 ? buyIdx : 2]) || 0;
        const sell = parseFloat(values[sellIdx >= 0 ? sellIdx : 3]) || 0;
        const qty = parseInt(values[qtyIdx >= 0 ? qtyIdx : 4]) || 0;
        const cat = catIdx >= 0 ? values[catIdx] : '';

        if (!name || !barcode) continue;

        const existing = await (await import('../../core/repositories/turso')).productRepo.getByBarcode(barcode, tenant.id);
        if (existing) continue;

        await addProduct(tenant.id, {
          name, barcode, purchase_price: buy, sale_price: sell,
          quantity: qty, currency: 'SAR', category: cat || undefined,
        }, user.username);
        imported++;
      }

      addToast('success', `تم استيراد ${imported} منتج جديد بنجاح`);
    } catch (err) {
      addToast('error', 'خطأ في قراءة الملف');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ color: 'var(--primary)' }}>{strings.inventory.title}</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{filteredProducts.length} منتج</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button onClick={handleExportCSV} className="btn btn-secondary" style={{ border: 'none' }}>
            <Download size={16} /> تصدير
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="btn btn-secondary" style={{ border: 'none' }}>
            <Upload size={16} /> استيراد
          </button>
          <input ref={fileInputRef} type="file" accept=".csv" onChange={handleImportCSV} style={{ display: 'none' }} />
          {hasPermission('inventory.add') && (
            <button onClick={openAddModal} className="btn btn-primary" style={{ border: 'none' }}>
              <Plus size={18} /> {strings.inventory.addProduct}
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
          <input type="text" className="input-field" placeholder="بحث بالاسم أو الباركود..." value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)} style={{ width: '100%', paddingRight: '2.5rem' }} />
          <Search size={18} style={{ position: 'absolute', right: '1.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Filter size={16} style={{ color: 'var(--text-muted)' }} />
          <select className="input-field" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} style={{ width: 'auto', padding: '0.5rem 1rem' }}>
            <option value="all">{strings.common.all} التصنيفات</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* Status Filter Chips */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        overflowX: 'auto',
        paddingBottom: '0.25rem',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
        WebkitOverflowScrolling: 'touch',
        flexWrap: 'wrap',
        marginTop: '0.5rem',
        marginBottom: '0.5rem'
      }} className="filter-chips-container">
        <button
          type="button"
          onClick={() => setStatusFilter('all')}
          style={{
            padding: '0.4rem 0.85rem',
            borderRadius: '99px',
            border: '1px solid ' + (statusFilter === 'all' ? 'var(--primary)' : 'var(--border)'),
            backgroundColor: statusFilter === 'all' ? 'var(--primary)' : 'var(--surface)',
            color: statusFilter === 'all' ? 'var(--text-light)' : 'var(--text)',
            fontSize: '0.8rem',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            transition: 'all 0.2s ease',
          }}
        >
          <span>الكل</span>
          <span style={{
            fontSize: '0.7rem',
            opacity: 0.8,
            backgroundColor: statusFilter === 'all' ? 'rgba(255,255,255,0.2)' : 'var(--border)',
            color: statusFilter === 'all' ? 'var(--text-light)' : 'var(--text-muted)',
            padding: '0.05rem 0.35rem',
            borderRadius: '99px'
          }}>
            {getProductsByCategory(categoryFilter).length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('lowStock')}
          style={{
            padding: '0.4rem 0.85rem',
            borderRadius: '99px',
            border: '1px solid ' + (statusFilter === 'lowStock' ? 'var(--warning)' : 'var(--border)'),
            backgroundColor: statusFilter === 'lowStock' ? 'var(--warning)' : 'var(--surface)',
            color: statusFilter === 'lowStock' ? 'var(--text-light)' : 'var(--text)',
            fontSize: '0.8rem',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            transition: 'all 0.2s ease',
          }}
        >
          <span>⚠️ منخفض المخزون</span>
          <span style={{
            fontSize: '0.7rem',
            opacity: 0.8,
            backgroundColor: statusFilter === 'lowStock' ? 'rgba(255,255,255,0.2)' : 'var(--border)',
            color: statusFilter === 'lowStock' ? 'var(--text-light)' : 'var(--text-muted)',
            padding: '0.05rem 0.35rem',
            borderRadius: '99px'
          }}>
            {getProductsByCategory(categoryFilter).filter(p => p.quantity > 0 && p.quantity <= (p.min_stock !== undefined ? p.min_stock : 5)).length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('outOfStock')}
          style={{
            padding: '0.4rem 0.85rem',
            borderRadius: '99px',
            border: '1px solid ' + (statusFilter === 'outOfStock' ? 'var(--danger)' : 'var(--border)'),
            backgroundColor: statusFilter === 'outOfStock' ? 'var(--danger)' : 'var(--surface)',
            color: statusFilter === 'outOfStock' ? 'var(--text-light)' : 'var(--text)',
            fontSize: '0.8rem',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            transition: 'all 0.2s ease',
          }}
        >
          <span>🚫 نفذ من المخزن</span>
          <span style={{
            fontSize: '0.7rem',
            opacity: 0.8,
            backgroundColor: statusFilter === 'outOfStock' ? 'rgba(255,255,255,0.2)' : 'var(--border)',
            color: statusFilter === 'outOfStock' ? 'var(--text-light)' : 'var(--text-muted)',
            padding: '0.05rem 0.35rem',
            borderRadius: '99px'
          }}>
            {getProductsByCategory(categoryFilter).filter(p => p.quantity <= 0).length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('expiry')}
          style={{
            padding: '0.4rem 0.85rem',
            borderRadius: '99px',
            border: '1px solid ' + (statusFilter === 'expiry' ? 'var(--secondary)' : 'var(--border)'),
            backgroundColor: statusFilter === 'expiry' ? 'var(--secondary)' : 'var(--surface)',
            color: statusFilter === 'expiry' ? 'var(--text-light)' : 'var(--text)',
            fontSize: '0.8rem',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            transition: 'all 0.2s ease',
          }}
        >
          <span>📅 قريب الانتهاء</span>
          <span style={{
            fontSize: '0.7rem',
            opacity: 0.8,
            backgroundColor: statusFilter === 'expiry' ? 'rgba(255,255,255,0.2)' : 'var(--border)',
            color: statusFilter === 'expiry' ? 'var(--text-light)' : 'var(--text-muted)',
            padding: '0.05rem 0.35rem',
            borderRadius: '99px'
          }}>
            {getProductsByCategory(categoryFilter).filter(p => isNearExpiry(p.expiry_date)).length}
          </span>
        </button>
      </div>

      {/* Products Table */}
      <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border)', backgroundColor: 'var(--surface-hover)' }}>
              <SortableHeader label={strings.inventory.barcode} sortKey="barcode" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={(k) => requestSort(k as any)} style={{ padding: '1rem' }} />
              <SortableHeader label={strings.inventory.productName} sortKey="name" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={(k) => requestSort(k as any)} style={{ padding: '1rem' }} />
              <SortableHeader label="التصنيف" sortKey="category" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={(k) => requestSort(k as any)} style={{ padding: '1rem' }} />
              <SortableHeader label={strings.inventory.purchasePrice} sortKey="purchase_price" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={(k) => requestSort(k as any)} style={{ padding: '1rem' }} />
              <SortableHeader label={strings.inventory.salePrice} sortKey="sale_price" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={(k) => requestSort(k as any)} style={{ padding: '1rem' }} />
              <SortableHeader label={strings.inventory.qty} sortKey="quantity" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={(k) => requestSort(k as any)} style={{ padding: '1rem' }} />
              <SortableHeader label="الصلاحية" sortKey="expiry_date" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={(k) => requestSort(k as any)} style={{ padding: '1rem' }} />
              <th style={{ padding: '1rem', textAlign: 'left' }}>{strings.common.actions}</th>
            </tr>
          </thead>
          <tbody>
            {sortedItems.map(p => (
              <tr key={p.id} style={{ borderBottom: '1px solid var(--border)' }} className="table-row-hover">
                <td style={{ padding: '1rem' }}><code style={{ fontWeight: 'bold' }}>{p.barcode}</code></td>
                <td style={{ padding: '1rem', fontWeight: '600' }}>
                  {p.name}
                  {p.quantity <= (p.min_stock || 5) && <span className="badge badge-danger" style={{ marginRight: '0.5rem', fontSize: '0.6rem' }}>منخفض</span>}
                </td>
                <td style={{ padding: '1rem' }}>
                  {p.category && <span className="badge badge-info" style={{ fontSize: '0.65rem' }}>{p.category}</span>}
                </td>
                <td style={{ padding: '1rem' }}>{p.purchase_price.toFixed(2)} ر.س</td>
                <td style={{ padding: '1rem', fontWeight: 'bold', color: 'var(--success)' }}>
                  {isFlashSale(p.id) ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Zap size={14} style={{ color: 'var(--warning)' }} />
                      <span style={{ textDecoration: 'line-through', color: 'var(--text-muted)', fontSize: '0.75rem' }}>{p.sale_price.toFixed(2)}</span>
                      <span>{getDiscountedPrice(p.sale_price, p.id).toFixed(2)} ر.س</span>
                    </span>
                  ) : (
                    <span>{p.sale_price.toFixed(2)} ر.س</span>
                  )}
                </td>
                <td style={{ padding: '1rem' }}>
                  <span style={{ fontWeight: 'bold', color: p.quantity <= (p.min_stock || 5) ? 'var(--danger)' : 'var(--text)' }}>
                    {p.quantity} {p.unit_of_measure === 'kg' ? 'كجم' : p.unit_of_measure === 'litre' ? 'لتر' : p.unit_of_measure === 'pack' ? 'علبة' : 'قطعة'}
                  </span>
                </td>
                <td style={{ padding: '1rem', fontSize: '0.8rem' }}>
                  {p.expiry_date ? (
                    new Date(p.expiry_date) < new Date()
                      ? <span className="badge badge-danger" style={{ fontSize: '0.6rem' }}>منتهية</span>
                      : new Date(p.expiry_date) < new Date(Date.now() + 30 * 86400000)
                        ? <span className="badge badge-warning" style={{ fontSize: '0.6rem' }}>{new Date(p.expiry_date).toLocaleDateString('ar-YE')}</span>
                        : <span>{new Date(p.expiry_date).toLocaleDateString('ar-YE')}</span>
                  ) : '-'}
                </td>
                <td style={{ padding: '1rem', textAlign: 'left' }}>
                  <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                    {hasPermission('inventory.edit') && (
                      <button onClick={() => openAdjustModal(p)} className="btn btn-secondary" style={{ padding: '0.35rem 0.5rem', fontSize: '0.7rem', borderRadius: '6px' }} title="تسوية">
                        <ArrowUpDown size={12} />
                      </button>
                    )}
                    <button onClick={() => openHistoryModal(p)} className="btn btn-secondary" style={{ padding: '0.35rem 0.5rem', fontSize: '0.7rem', borderRadius: '6px' }} title="التاريخ">
                      <History size={12} />
                    </button>
                    {hasPermission('inventory.edit') && (
                      <button onClick={() => openEditModal(p)} className="btn btn-secondary" style={{ padding: '0.35rem 0.5rem', fontSize: '0.7rem', borderRadius: '6px' }} title="تعديل">
                        <Edit2 size={12} />
                      </button>
                    )}
                    {hasPermission('inventory.delete') && (
                      <button onClick={() => handleDeleteProduct(p)} className="btn btn-danger" style={{ padding: '0.35rem 0.5rem', fontSize: '0.7rem', borderRadius: '6px', border: 'none' }} title="حذف">
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {sortedItems.length === 0 && (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>{strings.inventory.noProducts}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      {showAddEditModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '500px', padding: '1.75rem', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
              <h3>{editingProduct ? strings.inventory.editProduct : strings.inventory.addProduct}</h3>
              <button onClick={() => setShowAddEditModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: 'var(--text-muted)' }}>&times;</button>
            </div>
            {formError && (
              <div style={{ backgroundColor: 'hsl(0, 84%, 96%)', color: 'var(--danger)', padding: '0.5rem 0.75rem', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertCircle size={16} /> <span>{formError}</span>
              </div>
            )}
            <form onSubmit={handleAddEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="input-group">
                <label className="input-label">{strings.inventory.productName}</label>
                <input type="text" className="input-field" value={prodName} onChange={(e) => setProdName(e.target.value)} required />
              </div>
              <div className="input-group">
                <label className="input-label">{strings.inventory.barcode}</label>
                <input type="text" className="input-field" value={prodBarcode} onChange={(e) => setProdBarcode(e.target.value)} required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="input-group">
                  <label className="input-label">{strings.inventory.purchasePrice}</label>
                  <input type="number" step="0.01" className="input-field" value={prodPurchase} onChange={(e) => setProdPurchase(e.target.value)} required />
                </div>
                <div className="input-group">
                  <label className="input-label">{strings.inventory.salePrice}</label>
                  <input type="number" step="0.01" className="input-field" value={prodSale} onChange={(e) => setProdSale(e.target.value)} required />
                </div>
              </div>
              <div className="input-group">
                <label className="input-label">الكمية</label>
                <input type="number" className="input-field" value={prodQty} onChange={(e) => setProdQty(e.target.value)} disabled={!!editingProduct} required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="input-group">
                  <label className="input-label">التصنيف</label>
                  <select className="input-field" value={prodCategory} onChange={(e) => setProdCategory(e.target.value)}>
                    <option value="">بدون تصنيف</option>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    <option value="__new__">+ إضافة تصنيف جديد</option>
                  </select>
                  {prodCategory === '__new__' && (
                    <input type="text" className="input-field" placeholder="اسم التصنيف الجديد" value={prodCategory === '__new__' ? '' : prodCategory}
                      onChange={(e) => setProdCategory(e.target.value)} style={{ marginTop: '0.25rem' }} />
                  )}
                </div>
                <div className="input-group">
                  <label className="input-label">وحدة القياس</label>
                  <select className="input-field" value={prodUnit} onChange={(e) => setProdUnit(e.target.value)}>
                    <option value="piece">قطعة</option>
                    <option value="kg">كيلوجرام</option>
                    <option value="litre">لتر</option>
                    <option value="pack">علبة/حزمة</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="input-group">
                  <label className="input-label">الحد الأدنى</label>
                  <input type="number" className="input-field" value={prodMinStock} onChange={(e) => setProdMinStock(e.target.value)} />
                </div>
                <div className="input-group">
                  <label className="input-label">الحد الأقصى</label>
                  <input type="number" className="input-field" value={prodMaxStock} onChange={(e) => setProdMaxStock(e.target.value)} />
                </div>
              </div>
              <div className="input-group">
                <label className="input-label">تاريخ انتهاء الصلاحية</label>
                <input type="date" className="input-field" value={prodExpiry} onChange={(e) => setProdExpiry(e.target.value)} />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowAddEditModal(false)}>{strings.common.cancel}</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 2, border: 'none' }} disabled={isSubmitting}>
                  {isSubmitting ? strings.common.loading : strings.common.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Adjust Modal */}
      {showAdjustModal && adjustTargetProduct && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '400px', padding: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
              <h3>{strings.inventory.adjustStock}</h3>
              <button onClick={() => setShowAdjustModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: 'var(--text-muted)' }}>&times;</button>
            </div>
            {formError && (
              <div style={{ backgroundColor: 'hsl(0, 84%, 96%)', color: 'var(--danger)', padding: '0.5rem 0.75rem', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '1rem' }}>{formError}</div>
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
                    <input type="radio" name="adjustType" value="in" checked={adjustType === 'in'} onChange={() => setAdjustType('in')} />
                    <span>{strings.inventory.stockIn} (+)</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer', fontWeight: '600' }}>
                    <input type="radio" name="adjustType" value="out" checked={adjustType === 'out'} onChange={() => setAdjustType('out')} />
                    <span>{strings.inventory.stockOut} (-)</span>
                  </label>
                </div>
              </div>
              <div className="input-group">
                <label className="input-label">{strings.inventory.qtyToAdjust}</label>
                <input type="number" className="input-field" value={adjustQty} onChange={(e) => setAdjustQty(e.target.value)} required />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowAdjustModal(false)}>{strings.common.cancel}</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 2, border: 'none' }} disabled={isSubmitting}>تأكيد</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock History Modal */}
      {showHistoryModal && historyTarget && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '500px', padding: '1.75rem', maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><History size={18} /> حركات المخزون - {historyTarget.name}</h3>
              <button onClick={() => setShowHistoryModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: 'var(--text-muted)' }}>&times;</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {historyData.length === 0 && <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>لا توجد حركات مسجلة</p>}
              {historyData.map(m => (
                <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.65rem', backgroundColor: 'var(--background)', borderRadius: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ padding: '0.3rem', borderRadius: '50%', backgroundColor: m.type === 'in' ? 'hsl(142, 69%, 92%)' : 'hsl(0, 84%, 93%)', color: m.type === 'in' ? 'var(--success)' : 'var(--danger)' }}>
                      {m.type === 'in' ? <ArrowDownLeft size={14} /> : <ArrowUpRight size={14} />}
                    </div>
                    <div>
                      <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>{m.type === 'in' ? 'توريد' : 'سحب'}</span>
                      <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{new Date(m.created_at).toLocaleString('ar-YE')}</p>
                    </div>
                  </div>
                  <span style={{ fontWeight: '700', color: m.type === 'in' ? 'var(--success)' : 'var(--danger)', fontSize: '0.95rem' }}>
                    {m.type === 'in' ? '+' : '-'}{m.quantity}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryTab;
