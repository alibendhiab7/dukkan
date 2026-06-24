// src/ui/tabs/SalesTab.tsx
import React, { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useInventoryStore } from '../../store/inventoryStore';
import { useCartStore } from '../../store/cartStore';
import { useToastStore } from '../../store/toastStore';
import { usePromotionStore } from '../../store/promotionStore';
import { customerRepo, salesRepo } from '../../core/repositories/sqlite';
import type { Customer } from '../../core/repositories/interfaces';
import { strings } from '../../i18n';
import {
  ShoppingBag, Search, Plus, Minus, Trash2, Printer, CheckCircle2, AlertCircle,
  Percent, DollarSign, User, StickyNote, Bookmark, BookmarkCheck, X, Ban,
  Star
} from 'lucide-react';

const SalesTab: React.FC = () => {
  const { user, tenant, hasPermission } = useAuthStore();
  const { products, loadProducts } = useInventoryStore();
  const { addToast } = useToastStore();
  const {
    items: cartItems, sarToYerRate, error: cartError, isLoading: isCheckingOut,
    discount, discountType, customerName, notes, heldCarts,
    splitPayment, splitSar, splitYer,
    addToCart, addToCartByBarcode, updateQty, removeFromCart, clearCart,
    checkout, getTotals, setDiscount, clearDiscount, setCustomer, setNotes,
    holdCurrentCart, recallHeldCart, deleteHeldCart,
    setSplitPayment, setSplitSar, setSplitYer
  } = useCartStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [lastPrintedInvoice, setLastPrintedInvoice] = useState<any | null>(null);

  // Discount modal
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [discountInput, setDiscountInput] = useState('');
  const [discountTypeInput, setDiscountTypeInput] = useState<'percentage' | 'fixed'>('percentage');

  // Customer search
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [showHeldCarts, setShowHeldCarts] = useState(false);

  // Invoice preview
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // Void sale
  const [showVoidModal, setShowVoidModal] = useState(false);
  const [salesList, setSalesList] = useState<any[]>([]);
  const [voidSearch, setVoidSearch] = useState('');

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Mobile layout state
  const [mobileView, setMobileView] = useState<'catalog' | 'cart'>('catalog');

  // Search & Filter States
  const [statusFilter, setStatusFilter] = useState<'all' | 'favorites' | 'lowStock' | 'outOfStock' | 'onSale'>('all');
  const [pinnedProductIds, setPinnedProductIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(`grocery_pinned_${tenant?.id || 'default'}`) || '[]');
    } catch {
      return [];
    }
  });

  const { isFlashSale } = usePromotionStore();

  const normalizeArabic = (str: string): string => {
    return str
      .replace(/[\u064B-\u065F]/g, "")
      .replace(/[أإآ]/g, "ا")
      .replace(/ة/g, "ه")
      .replace(/ى/g, "ي");
  };

  const toggleFavorite = (productId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPinnedProductIds(prev => {
      const updated = prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId];
      localStorage.setItem(`grocery_pinned_${tenant?.id || 'default'}`, JSON.stringify(updated));
      return updated;
    });
  };

  useEffect(() => {
    barcodeInputRef.current?.focus();
    if (tenant) loadCustomers();
  }, [tenant]);

  const loadCustomers = async () => {
    if (!tenant) return;
    const data = await customerRepo.getAll(tenant.id);
    setCustomers(data);
  };

  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput) return;
    const added = addToCartByBarcode(barcodeInput, products);
    if (added) setBarcodeInput('');
    barcodeInputRef.current?.focus();
  };

  const handleCheckout = async () => {
    if (cartItems.length === 0) return;
    const { sarTotal, finalTotal, finalYer } = getTotals();
    const invoiceItems = [...cartItems];

    const success = await checkout(tenant!.id, user!.username);
    if (success) {
      setLastPrintedInvoice({
        id: 'INV_' + Math.floor(Math.random() * 1000000),
        items: invoiceItems,
        sarTotal, finalTotal, finalYer,
        rate: sarToYerRate,
        discount, discountType, discountAmount,
        date: new Date().toLocaleString('ar-YE'),
        cashier: user!.username,
        customer: customerName,
        splitPayment, splitSar, splitYer,
      });
      setShowReceiptModal(true);
      if (tenant) loadProducts(tenant.id);
    }
  };

  const handleApplyDiscount = () => {
    const val = parseFloat(discountInput);
    if (isNaN(val) || val < 0) {
      addToast('error', 'الرجاء إدخال قيمة صحيحة');
      return;
    }
    if (discountTypeInput === 'percentage' && val > 100) {
      addToast('error', 'النسبة لا يمكن أن تتجاوز 100%');
      return;
    }
    setDiscount(val, discountTypeInput);
    setShowDiscountModal(false);
    addToast('success', `تم تطبيق خصم ${discountTypeInput === 'percentage' ? val + '%' : val + ' ر.س'}`);
  };

  const handleSelectCustomer = (c: Customer) => {
    setCustomer(c.id, c.name);
    setShowCustomerSearch(false);
    setCustomerSearchQuery('');
    addToast('success', `تم ربط العميل "${c.name}" بالفاتورة`);
  };

  const filteredProducts = products.filter(p => {
    if (searchQuery.trim() !== '') {
      const normalizedQuery = normalizeArabic(searchQuery.toLowerCase());
      const normalizedName = normalizeArabic(p.name.toLowerCase());
      const normalizedBarcode = normalizeArabic(p.barcode.toLowerCase());
      if (!normalizedName.includes(normalizedQuery) && !normalizedBarcode.includes(normalizedQuery)) {
        return false;
      }
    }
    if (statusFilter === 'favorites') {
      return pinnedProductIds.includes(p.id);
    }
    if (statusFilter === 'lowStock') {
      return p.quantity > 0 && p.quantity < 5;
    }
    if (statusFilter === 'outOfStock') {
      return p.quantity <= 0;
    }
    if (statusFilter === 'onSale') {
      return isFlashSale(p.id);
    }
    return true;
  });


  const filteredCustomers = customers.filter(c =>
    c.name.includes(customerSearchQuery) || c.phone.includes(customerSearchQuery)
  );

  const { sarTotal, discountAmount, finalTotal, finalYer } = getTotals();

  // Void sale handlers
  const openVoidModal = async () => {
    if (!tenant) return;
    const sales = await salesRepo.getAll(tenant.id);
    setSalesList(sales.slice(0, 50));
    setShowVoidModal(true);
  };

  const handleVoidSale = async (saleId: string) => {
    if (!tenant || !user) return;
    if (!window.confirm('هل أنت متأكد من إلغاء هذه الفاتورة؟ سيتم إعادة المخزون تلقائياً.')) return;

    try {
      await salesRepo.voidSale(saleId, tenant.id, user.username);
      addToast('success', 'تم إلغاء الفاتورة بنجاح وإعادة المخزون');
      setShowVoidModal(false);
      loadProducts(tenant.id);
    } catch (err) {
      addToast('error', 'فشل إلغاء الفاتورة');
    }
  };

  const filteredSales = salesList.filter(s =>
    s.id.includes(voidSearch) || s.created_by.includes(voidSearch)
  );

  return (
    <div className="pos-layout-wrapper animate-fade-in">
      {/* Mobile Tab Selector */}
      <div style={{
        display: 'none',
        gridTemplateColumns: '1fr 1fr',
        gap: '0.5rem',
        marginBottom: '1rem',
      }} className="mobile-pos-tabs">
        <button
          type="button"
          onClick={() => setMobileView('catalog')}
          style={{
            padding: '0.75rem',
            borderRadius: 'var(--radius-md)',
            border: 'none',
            fontWeight: 'bold',
            fontSize: '0.9rem',
            cursor: 'pointer',
            backgroundColor: mobileView === 'catalog' ? 'var(--primary)' : 'var(--surface)',
            color: mobileView === 'catalog' ? 'var(--text-light)' : 'var(--text-muted)',
            boxShadow: 'var(--shadow-sm)',
            transition: 'all 0.2s',
          }}
        >
          معرض المنتجات
        </button>
        <button
          type="button"
          onClick={() => setMobileView('cart')}
          style={{
            padding: '0.75rem',
            borderRadius: 'var(--radius-md)',
            border: 'none',
            fontWeight: 'bold',
            fontSize: '0.9rem',
            cursor: 'pointer',
            backgroundColor: mobileView === 'cart' ? 'var(--primary)' : 'var(--surface)',
            color: mobileView === 'cart' ? 'var(--text-light)' : 'var(--text-muted)',
            boxShadow: 'var(--shadow-sm)',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.35rem',
          }}
        >
          <span>سلة المشتريات</span>
          <span style={{
            backgroundColor: mobileView === 'cart' ? 'var(--text-light)' : 'var(--primary)',
            color: mobileView === 'cart' ? 'var(--primary)' : 'var(--text-light)',
            padding: '0.1rem 0.4rem',
            borderRadius: '99px',
            fontSize: '0.75rem',
          }}>
            {cartItems.length}
          </span>
        </button>
      </div>

      <div className="pos-layout">
        {/* Right Column: Catalog */}
        <div className={`pos-catalog-column ${mobileView === 'catalog' ? 'active' : ''}`} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto', paddingRight: '0.25rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <form onSubmit={handleBarcodeSubmit} style={{ flex: 1, minWidth: '220px' }}>
            <div className="input-group" style={{ marginBottom: 0 }}>
              <input
                ref={barcodeInputRef}
                type="text"
                className="input-field"
                placeholder="محاكاة قارئ الباركود (اكتب الباركود واضغط Enter)"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                style={{ width: '100%', borderColor: 'var(--primary-light)' }}
              />
            </div>
          </form>
          <div style={{ flex: 1, minWidth: '220px', position: 'relative' }}>
            <input
              type="text"
              className="input-field"
              placeholder="البحث عن منتج بالاسم أو الباركود..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', paddingRight: '2.5rem' }}
            />
            <Search size={18} style={{ position: 'absolute', right: '0.9rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          </div>
        </div>

        {/* Filter Chips */}
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          overflowX: 'auto',
          paddingBottom: '0.25rem',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch',
          flexWrap: 'wrap',
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
              {products.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('favorites')}
            style={{
              padding: '0.4rem 0.85rem',
              borderRadius: '99px',
              border: '1px solid ' + (statusFilter === 'favorites' ? 'var(--secondary)' : 'var(--border)'),
              backgroundColor: statusFilter === 'favorites' ? 'var(--secondary)' : 'var(--surface)',
              color: statusFilter === 'favorites' ? 'var(--text-light)' : 'var(--text)',
              fontSize: '0.8rem',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              transition: 'all 0.2s ease',
            }}
          >
            <Star size={12} fill={statusFilter === 'favorites' ? 'currentColor' : 'none'} />
            <span>المفضلة</span>
            <span style={{
              fontSize: '0.7rem',
              opacity: 0.8,
              backgroundColor: statusFilter === 'favorites' ? 'rgba(255,255,255,0.2)' : 'var(--border)',
              color: statusFilter === 'favorites' ? 'var(--text-light)' : 'var(--text-muted)',
              padding: '0.05rem 0.35rem',
              borderRadius: '99px'
            }}>
              {pinnedProductIds.length}
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
              transition: 'all 0.2s ease'
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
              {products.filter(p => p.quantity > 0 && p.quantity < 5).length}
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
              transition: 'all 0.2s ease'
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
              {products.filter(p => p.quantity <= 0).length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('onSale')}
            style={{
              padding: '0.4rem 0.85rem',
              borderRadius: '99px',
              border: '1px solid ' + (statusFilter === 'onSale' ? 'var(--success)' : 'var(--border)'),
              backgroundColor: statusFilter === 'onSale' ? 'var(--success)' : 'var(--surface)',
              color: statusFilter === 'onSale' ? 'var(--text-light)' : 'var(--text)',
              fontSize: '0.8rem',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              transition: 'all 0.2s ease'
            }}
          >
            <span>🏷️ التخفيضات</span>
            <span style={{
              fontSize: '0.7rem',
              opacity: 0.8,
              backgroundColor: statusFilter === 'onSale' ? 'rgba(255,255,255,0.2)' : 'var(--border)',
              color: statusFilter === 'onSale' ? 'var(--text-light)' : 'var(--text-muted)',
              padding: '0.05rem 0.35rem',
              borderRadius: '99px'
            }}>
              {products.filter(p => isFlashSale(p.id)).length}
            </span>
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem' }}>
          {filteredProducts.map(p => {
            const isOutOfStock = p.quantity <= 0;
            const inCart = cartItems.find(item => item.product.id === p.id);
            const cartQty = inCart ? inCart.qty : 0;
            const availableQty = p.quantity - cartQty;
            const isPinned = pinnedProductIds.includes(p.id);

            return (
              <div
                key={p.id}
                className="card"
                onClick={() => !isOutOfStock && availableQty > 0 && addToCart(p)}
                style={{
                  display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                  cursor: isOutOfStock || availableQty <= 0 ? 'not-allowed' : 'pointer',
                  opacity: isOutOfStock || availableQty <= 0 ? 0.6 : 1,
                  border: cartQty > 0 ? '2px solid var(--primary)' : '1px solid var(--border)',
                  position: 'relative',
                  padding: '1rem',
                  transition: 'all 0.2s ease',
                }}
              >
                {/* Pin/Favorite Star Button */}
                <button
                  type="button"
                  onClick={(e) => toggleFavorite(p.id, e)}
                  style={{
                    position: 'absolute',
                    top: '0.5rem',
                    right: '0.5rem',
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: '50%',
                    width: '28px',
                    height: '28px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: 'var(--shadow-sm)',
                    transition: 'all 0.2s ease',
                    zIndex: 10
                  }}
                  className="favorite-btn"
                  title={isPinned ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}
                >
                  <Star
                    size={14}
                    fill={isPinned ? 'var(--secondary)' : 'none'}
                    color={isPinned ? 'var(--secondary)' : 'var(--text-muted)'}
                  />
                </button>

                {cartQty > 0 && (
                  <span className="badge badge-info" style={{
                    position: 'absolute', top: '0.5rem', left: '0.5rem', borderRadius: '50%',
                    width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold'
                  }}>{cartQty}</span>
                )}
                <div>
                  <h4 style={{ fontSize: '0.95rem', marginBottom: '0.5rem' }}>{p.name}</h4>
                  <code style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{p.barcode}</code>
                  {p.category && (
                    <span className="badge badge-info" style={{ marginRight: '0.35rem', fontSize: '0.6rem' }}>{p.category}</span>
                  )}
                </div>
                <div style={{ marginTop: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--success)' }}>
                      {p.sale_price.toLocaleString()} <span style={{ fontSize: '0.75rem' }}>ر.ي</span>
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {(p.sale_price / sarToYerRate).toFixed(2)} ر.س
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.75rem' }}>
                    <span style={{ color: p.quantity < 5 ? 'var(--danger)' : 'var(--text-muted)' }}>
                      المخزون: {p.quantity} قطع
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
          {filteredProducts.length === 0 && (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              لا توجد منتجات مطابقة للبحث.
            </div>
          )}
        </div>
      </div>

      {/* Left Column: Cart */}
      <div className={`card pos-cart-column ${mobileView === 'cart' ? 'active' : ''}`} style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '1.25rem 1rem' }}>
        {/* Mobile back to catalog button */}
        <button
          type="button"
          onClick={() => setMobileView('catalog')}
          className="btn btn-secondary mobile-only-btn"
          style={{
            display: 'none',
            width: '100%',
            marginBottom: '1rem',
            fontSize: '0.85rem',
            padding: '0.5rem 1rem',
          }}
        >
          ← العودة لمعرض المنتجات
        </button>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
          <ShoppingBag size={20} />
          <span>{strings.sales.cart} ({cartItems.length})</span>
        </h3>

        {cartError && (
          <div style={{ backgroundColor: 'hsl(0, 84%, 96%)', color: 'var(--danger)', padding: '0.5rem 0.75rem', borderRadius: '6px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <AlertCircle size={14} />
            <span>{cartError}</span>
          </div>
        )}

        {/* Quick actions bar */}
        <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
          <button onClick={holdCurrentCart} className="btn btn-secondary" style={{ padding: '0.35rem 0.6rem', fontSize: '0.7rem', border: 'none' }} disabled={cartItems.length === 0}>
            <Bookmark size={12} /> حفظ
          </button>
          {heldCarts.length > 0 && (
            <button onClick={() => setShowHeldCarts(!showHeldCarts)} className="btn btn-secondary" style={{ padding: '0.35rem 0.6rem', fontSize: '0.7rem', border: 'none' }}>
              <BookmarkCheck size={12} /> ({heldCarts.length})
            </button>
          )}
          <button onClick={() => setShowCustomerSearch(true)} className="btn btn-secondary" style={{ padding: '0.35rem 0.6rem', fontSize: '0.7rem', border: 'none', flex: 1 }}>
            <User size={12} /> {customerName || 'عميل'}
          </button>
          <button onClick={() => setShowDiscountModal(true)} className="btn btn-secondary" style={{ padding: '0.35rem 0.6rem', fontSize: '0.7rem', border: 'none' }}>
            <Percent size={12} /> خصم
          </button>
          {hasPermission('sales.delete') && (
            <button onClick={openVoidModal} className="btn btn-danger" style={{ padding: '0.35rem 0.6rem', fontSize: '0.7rem', border: 'none' }}>
              <Ban size={12} /> إلغاء
            </button>
          )}
        </div>

        {/* Held carts dropdown */}
        {showHeldCarts && heldCarts.length > 0 && (
          <div style={{ marginBottom: '0.75rem', padding: '0.5rem', backgroundColor: 'var(--secondary-light)', borderRadius: '6px' }}>
            <p style={{ fontSize: '0.75rem', fontWeight: '700', marginBottom: '0.35rem' }}>السلات المحفوظة:</p>
            {heldCarts.map(h => (
              <div key={h.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.35rem 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: '0.75rem' }}>{h.items.length} منتج - {new Date(h.savedAt).toLocaleTimeString('ar-YE')}</span>
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  <button onClick={() => { recallHeldCart(h.id); setShowHeldCarts(false); }} className="btn btn-primary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.65rem', border: 'none' }}>استعادة</button>
                  <button onClick={() => deleteHeldCart(h.id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}><X size={12} /></button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Customer badge */}
        {customerName && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.45rem 0.65rem', backgroundColor: 'var(--primary-lighter)', borderRadius: '6px', marginBottom: '0.5rem', fontSize: '0.8rem' }}>
            <User size={14} />
            <span style={{ fontWeight: '700' }}>{customerName}</span>
            <button onClick={() => setCustomer(null, null)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', marginRight: 'auto' }}><X size={14} /></button>
          </div>
        )}

        {/* Cart Items */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {cartItems.map(item => (
            <div key={item.product.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', borderBottom: '1px solid var(--border)' }}>
              <div style={{ flex: 1, minWidth: 0, paddingLeft: '0.5rem' }}>
                <p style={{ fontSize: '0.85rem', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={item.product.name}>
                  {item.product.name}
                </p>
                <span style={{ fontSize: '0.8rem', color: 'var(--success)', fontWeight: 'bold' }}>{item.product.sale_price.toLocaleString()} ر.ي</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <button onClick={() => updateQty(item.product.id, item.qty - 1)} style={{ background: 'var(--border)', border: 'none', borderRadius: '4px', padding: '0.2rem', cursor: 'pointer' }}><Minus size={12} /></button>
                <span style={{ fontSize: '0.85rem', fontWeight: 'bold', width: '20px', textAlign: 'center' }}>{item.qty}</span>
                <button onClick={() => updateQty(item.product.id, item.qty + 1)} style={{ background: 'var(--border)', border: 'none', borderRadius: '4px', padding: '0.2rem', cursor: 'pointer' }}><Plus size={12} /></button>
                <button onClick={() => removeFromCart(item.product.id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', padding: '0.2rem', cursor: 'pointer', marginRight: '0.25rem' }}><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
          {cartItems.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem 0', fontSize: '0.85rem' }}>
              {strings.sales.emptyCart}
            </div>
          )}
        </div>

        {/* Notes */}
        <div style={{ marginTop: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.25rem' }}>
            <StickyNote size={12} />
            <span style={{ fontSize: '0.7rem', fontWeight: '700', color: 'var(--text-muted)' }}>ملاحظات الفاتورة</span>
          </div>
          <input
            type="text"
            className="input-field"
            placeholder="ملاحظات اختيارية..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            style={{ width: '100%', padding: '0.45rem 0.65rem', fontSize: '0.8rem' }}
          />
        </div>

        {/* Totals */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>المجموع:</span>
            <span style={{ fontSize: '1rem', fontWeight: '700' }}>{sarTotal.toLocaleString()} ر.ي</span>
          </div>

          {discount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem', padding: '0.35rem 0.5rem', backgroundColor: 'hsl(142, 69%, 95%)', borderRadius: '4px' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--success)' }}>
                الخصم ({discountType === 'percentage' ? discount + '%' : discount + ' ر.ي'}):
              </span>
              <span style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--success)' }}>-{discountAmount.toLocaleString()} ر.ي</span>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', backgroundColor: 'var(--primary-lighter)', padding: '0.5rem 0.75rem', borderRadius: '8px' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--primary)' }}>الإجمالي النهائي باليمني:</span>
            <span style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--success)' }}>{finalTotal.toLocaleString()} ر.ي</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', backgroundColor: 'var(--primary-lighter)', padding: '0.5rem 0.75rem', borderRadius: '8px' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--primary)' }}>الإجمالي بالسعودي:</span>
            <span style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--primary)' }}>{finalYer.toFixed(2)} ر.س</span>
          </div>

          {/* Split Payment Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', padding: '0.5rem', backgroundColor: splitPayment ? 'hsl(210, 100%, 95%)' : 'var(--surface-hover)', borderRadius: '6px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600' }}>
              <input type="checkbox" checked={splitPayment} onChange={(e) => setSplitPayment(e.target.checked)} />
              دفع موزع (يمني + سعودي)
            </label>
          </div>

          {splitPayment && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label" style={{ fontSize: '0.7rem' }}>المبلغ باليمني (ر.ي)</label>
                <input type="number" step="1" className="input-field" value={splitYer || ''} onChange={(e) => {
                  const yer = parseFloat(e.target.value) || 0;
                  setSplitYer(yer);
                  setSplitSar(Math.max((finalTotal - yer) / sarToYerRate, 0));
                }} placeholder="0" style={{ padding: '0.45rem 0.65rem', fontSize: '0.8rem' }} />
              </div>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label" style={{ fontSize: '0.7rem' }}>المبلغ بالسعودي (ر.س)</label>
                <input type="number" step="0.01" className="input-field" value={splitSar || ''} onChange={(e) => {
                  const sar = parseFloat(e.target.value) || 0;
                  setSplitSar(sar);
                  setSplitYer(Math.max(finalTotal - sar * sarToYerRate, 0));
                }} placeholder="0.00" style={{ padding: '0.45rem 0.65rem', fontSize: '0.8rem' }} />
              </div>
              <div style={{ gridColumn: '1/-1', display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0.5rem', backgroundColor: 'hsl(142, 69%, 95%)', borderRadius: '4px', fontSize: '0.75rem' }}>
                <span>المتبقي:</span>
                <span style={{ fontWeight: '700', color: (finalTotal - splitSar * sarToYerRate - splitYer) < -0.01 ? 'var(--danger)' : 'var(--success)' }}>
                  {Math.abs(finalTotal - splitSar * sarToYerRate - splitYer).toFixed(0)} ر.ي
                  {(finalTotal - splitSar * sarToYerRate - splitYer) < -0.01 ? ' (المبلغ المدفوع أكبر!)' : ''}
                </span>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={clearCart} className="btn btn-secondary" style={{ flex: 1, padding: '0.65rem' }} disabled={cartItems.length === 0}>مسح</button>
            <button onClick={() => setShowPreviewModal(true)} className="btn btn-secondary" style={{ padding: '0.65rem' }} disabled={cartItems.length === 0}>معاينة</button>
            <button
              onClick={handleCheckout}
              className="btn btn-primary"
              style={{ flex: 2, padding: '0.65rem', border: 'none' }}
              disabled={cartItems.length === 0 || isCheckingOut || !hasPermission('sales.create')}
            >
              {isCheckingOut ? 'جاري الحفظ...' : 'دفع وطباعة'}
            </button>
          </div>
        </div>
      </div>

      {/* Receipt Modal */}
      {showReceiptModal && lastPrintedInvoice && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card animate-fade-in" style={{ width: '360px', padding: '1.5rem', backgroundColor: '#fff', color: '#000' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #ddd', paddingBottom: '0.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', color: '#000', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <CheckCircle2 size={18} style={{ color: 'var(--success)' }} />
                <span>تمت العملية بنجاح!</span>
              </h3>
              <button onClick={() => setShowReceiptModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#888' }}>&times;</button>
            </div>

            <div className="receipt-container" style={{ margin: '0 auto', border: '1px dashed #333' }}>
              <div className="receipt-header">
                <h4 style={{ color: '#000', fontSize: '1.1rem', fontWeight: 'bold' }}>{tenant?.store_name}</h4>
                <p style={{ fontSize: '0.75rem', color: '#555' }}>فاتورة مبيعات نقدية</p>
              </div>
              <div style={{ fontSize: '0.75rem', marginBottom: '0.5rem', borderBottom: '1px dashed #000', paddingBottom: '0.35rem' }}>
                <div>رقم الفاتورة: {lastPrintedInvoice.id}</div>
                <div>التاريخ: {lastPrintedInvoice.date}</div>
                <div>الكاشير: {lastPrintedInvoice.cashier}</div>
                {lastPrintedInvoice.customer && <div>العميل: {lastPrintedInvoice.customer}</div>}
              </div>
              <div style={{ borderBottom: '1px dashed #000', paddingBottom: '0.35rem', marginBottom: '0.5rem' }}>
                {lastPrintedInvoice.items.map((item: any) => (
                  <div key={item.product.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginTop: '0.2rem' }}>
                    <span style={{ width: '50%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.product.name}</span>
                    <span style={{ width: '15%', textAlign: 'center' }}>{item.qty}</span>
                    <span style={{ width: '35%', textAlign: 'left' }}>{(item.qty * item.product.sale_price).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              {lastPrintedInvoice.discount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#0a0' }}>
                  <span>الخصم:</span>
                  <span>-{lastPrintedInvoice.discountAmount.toFixed(0)} ر.ي</span>
                </div>
              )}
              <div className="receipt-total" style={{ fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>الإجمالي باليمني:</span>
                  <span>{lastPrintedInvoice.finalTotal.toFixed(0)} ر.ي</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem' }}>
                  <span>الإجمالي بالسعودي:</span>
                  <span>{lastPrintedInvoice.finalYer.toFixed(2)} ر.س</span>
                </div>
              </div>
            </div>
            <button onClick={() => window.print()} className="btn btn-primary" style={{ width: '100%', marginTop: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', border: 'none' }}>
              <Printer size={16} /> <span>طباعة الفاتورة</span>
            </button>
          </div>
        </div>
      )}

      {/* Discount Modal */}
      {showDiscountModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card animate-fade-in" style={{ width: '380px', padding: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
              <h3>تطبيق خصم</h3>
              <button onClick={() => setShowDiscountModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: 'var(--text-muted)' }}>&times;</button>
            </div>
            <div className="input-group">
              <label className="input-label">نوع الخصم</label>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer', fontWeight: '600' }}>
                  <input type="radio" name="discountType" value="percentage" checked={discountTypeInput === 'percentage'} onChange={() => setDiscountTypeInput('percentage')} />
                  <Percent size={14} /> نسبة (%)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer', fontWeight: '600' }}>
                  <input type="radio" name="discountType" value="fixed" checked={discountTypeInput === 'fixed'} onChange={() => setDiscountTypeInput('fixed')} />
                  <DollarSign size={14} /> مبلغ ثابت
                </label>
              </div>
            </div>
            <div className="input-group">
              <label className="input-label">قيمة الخصم</label>
              <input type="number" step="0.01" className="input-field" value={discountInput} onChange={(e) => setDiscountInput(e.target.value)} placeholder={discountTypeInput === 'percentage' ? '10' : '5.00'} />
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => { clearDiscount(); setShowDiscountModal(false); }}>إزالة الخصم</button>
              <button className="btn btn-primary" style={{ flex: 1, border: 'none' }} onClick={handleApplyDiscount}>تطبيق</button>
            </div>
          </div>
        </div>
      )}

      {/* Customer Search Modal */}
      {showCustomerSearch && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card animate-fade-in" style={{ width: '400px', padding: '1.75rem', maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
              <h3>اختر العميل</h3>
              <button onClick={() => setShowCustomerSearch(false)} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: 'var(--text-muted)' }}>&times;</button>
            </div>
            <div className="input-group">
              <input type="text" className="input-field" placeholder="بحث بالاسم أو الهاتف..." value={customerSearchQuery} onChange={(e) => setCustomerSearchQuery(e.target.value)} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <button onClick={() => { setCustomer(null, null); setShowCustomerSearch(false); }} className="btn btn-secondary" style={{ width: '100%', justifyContent: 'flex-start', padding: '0.65rem' }}>
                <User size={14} /> بدون عميل
              </button>
              {filteredCustomers.map(c => (
                <button key={c.id} onClick={() => handleSelectCustomer(c)} className="btn btn-secondary" style={{ width: '100%', justifyContent: 'flex-start', padding: '0.65rem' }}>
                  <User size={14} /> {c.name} - {c.phone}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Invoice Preview Modal */}
      {showPreviewModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card animate-fade-in" style={{ width: '360px', padding: '1.5rem', backgroundColor: '#fff', color: '#000' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #ddd', paddingBottom: '0.5rem' }}>
              <h3 style={{ fontSize: '1rem', color: '#000' }}>معاينة الفاتورة</h3>
              <button onClick={() => setShowPreviewModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#888' }}>&times;</button>
            </div>
            <div className="receipt-container" style={{ margin: '0 auto', border: '1px dashed #333' }}>
              <div className="receipt-header">
                <h4 style={{ color: '#000', fontSize: '1.1rem', fontWeight: 'bold' }}>{tenant?.store_name}</h4>
                <p style={{ fontSize: '0.75rem', color: '#555' }}>فاتورة مبيعات نقدية</p>
              </div>
              <div style={{ fontSize: '0.75rem', marginBottom: '0.5rem', borderBottom: '1px dashed #000', paddingBottom: '0.35rem' }}>
                <div>التاريخ: {new Date().toLocaleString('ar-YE')}</div>
                <div>الكاشير: {user?.username}</div>
                {customerName && <div>العميل: {customerName}</div>}
              </div>
              <div style={{ borderBottom: '1px dashed #000', paddingBottom: '0.35rem', marginBottom: '0.5rem' }}>
                {cartItems.map(item => (
                  <div key={item.product.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginTop: '0.2rem' }}>
                    <span style={{ width: '50%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.product.name}</span>
                    <span style={{ width: '15%', textAlign: 'center' }}>{item.qty}</span>
                    <span style={{ width: '35%', textAlign: 'left' }}>{(item.qty * item.product.sale_price).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              {discount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#0a0' }}>
                  <span>الخصم:</span>
                  <span>-{discountAmount.toFixed(0)} ر.ي</span>
                </div>
              )}
              <div className="receipt-total" style={{ fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>الإجمالي باليمني:</span>
                  <span>{finalTotal.toFixed(0)} ر.ي</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem' }}>
                  <span>الإجمالي بالسعودي:</span>
                  <span>{finalYer.toFixed(2)} ر.س</span>
                </div>
                {splitPayment && (
                  <div style={{ marginTop: '0.5rem', padding: '0.35rem', backgroundColor: '#f0f0f0', borderRadius: '4px', fontSize: '0.7rem' }}>
                    <div>الدفع باليمني: {splitYer.toFixed(0)} ر.ي</div>
                    <div>الدفع بالسعودي: {splitSar.toFixed(2)} ر.س</div>
                  </div>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.25rem' }}>
              <button onClick={() => setShowPreviewModal(false)} className="btn btn-secondary" style={{ flex: 1 }}>إغلاق</button>
              <button onClick={() => { setShowPreviewModal(false); handleCheckout(); }} className="btn btn-primary" style={{ flex: 2, border: 'none' }} disabled={!hasPermission('sales.create')}>تأكيد ودفع</button>
            </div>
          </div>
        </div>
      )}

      {/* Void Sale Modal */}
      {showVoidModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card animate-fade-in" style={{ width: '500px', padding: '1.75rem', maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Ban size={18} /> إلغاء فاتورة</h3>
              <button onClick={() => setShowVoidModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: 'var(--text-muted)' }}>&times;</button>
            </div>
            <div className="input-group">
              <input type="text" className="input-field" placeholder="بحث برقم الفاتورة أو الكاشير..." value={voidSearch} onChange={(e) => setVoidSearch(e.target.value)} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '350px', overflowY: 'auto' }}>
              {filteredSales.slice(0, 20).map(s => (
                <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.65rem', backgroundColor: 'var(--surface-hover)', borderRadius: '6px' }}>
                  <div>
                    <code style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>{s.id.toUpperCase()}</code>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginRight: '0.5rem' }}>{s.total.toFixed(2)} ر.س - {s.created_by}</span>
                  </div>
                  <button onClick={() => handleVoidSale(s.id)} className="btn btn-danger" style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem', border: 'none' }}>
                    <Ban size={12} /> إلغاء
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      </div>

      {/* Mobile Floating Cart Summary Button */}
      {mobileView === 'catalog' && cartItems.length > 0 && (
        <div
          onClick={() => setMobileView('cart')}
          className="mobile-floating-cart"
          style={{
            display: 'none',
            position: 'fixed',
            bottom: '1.5rem',
            left: '1.5rem',
            right: '1.5rem',
            zIndex: 40,
            background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%)',
            color: 'var(--text-light)',
            padding: '0.85rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 8px 24px rgba(16, 185, 129, 0.3)',
            justifyContent: 'space-between',
            alignItems: 'center',
            cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShoppingBag size={18} />
            <span style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>
              عرض السلة ({cartItems.length})
            </span>
          </div>
          <span style={{ fontWeight: '800', fontSize: '1.05rem' }}>
            {finalTotal.toFixed(2)} ر.س
          </span>
        </div>
      )}
    </div>
  );
};

export default SalesTab;
