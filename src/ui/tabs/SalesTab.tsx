// src/ui/tabs/SalesTab.tsx
import React, { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useInventoryStore } from '../../store/inventoryStore';
import { useCartStore } from '../../store/cartStore';
import { strings } from '../../i18n';
import { ShoppingBag, Search, Plus, Minus, Trash2, Printer, CheckCircle2, AlertCircle } from 'lucide-react';

const SalesTab: React.FC = () => {
  const { user, tenant } = useAuthStore();
  const { products } = useInventoryStore();
  const {
    items: cartItems,
    sarToYerRate,
    error: cartError,
    isLoading: isCheckingOut,
    addToCart,
    addToCartByBarcode,
    updateQty,
    removeFromCart,
    clearCart,
    checkout,
    getTotals
  } = useCartStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [lastPrintedInvoice, setLastPrintedInvoice] = useState<any | null>(null);

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus barcode input for scanning simulator
  useEffect(() => {
    barcodeInputRef.current?.focus();
  }, []);

  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput) return;
    
    const added = addToCartByBarcode(barcodeInput, products);
    if (added) {
      setBarcodeInput('');
    }
    barcodeInputRef.current?.focus();
  };

  const handleCheckout = async () => {
    if (cartItems.length === 0) return;
    
    const { sarTotal, yerTotal } = getTotals();
    const invoiceItems = [...cartItems];

    const success = await checkout(tenant!.id, user!.username);
    if (success) {
      // Save data for receipt preview before clearing
      setLastPrintedInvoice({
        id: 'INV_' + Math.floor(Math.random() * 1000000),
        items: invoiceItems,
        sarTotal,
        yerTotal,
        rate: sarToYerRate,
        date: new Date().toLocaleString('ar-YE'),
        cashier: user!.username
      });
      setShowReceiptModal(true);
    }
  };

  // Filter products based on search
  const filteredProducts = products.filter(p => 
    p.name.includes(searchQuery) || 
    p.barcode.includes(searchQuery)
  );

  const { sarTotal, yerTotal } = getTotals();

  return (
    <div className="pos-layout animate-fade-in">
      {/* Right Column: Catalog Grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto', paddingRight: '0.25rem' }}>
        
        {/* Search and Scan bar */}
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          {/* Barcode scanner simulator */}
          <form onSubmit={handleBarcodeSubmit} style={{ flex: 1, minWidth: '220px' }}>
            <div className="input-group" style={{ marginBottom: 0 }}>
              <div style={{ position: 'relative' }}>
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
            </div>
          </form>

          {/* Normal search */}
          <div style={{ flex: 1, minWidth: '220px', position: 'relative' }}>
            <input
              type="text"
              className="input-field"
              placeholder="البحث عن منتج بالاسم أو الباركود..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', paddingRight: '2.5rem' }}
            />
            <Search size={18} style={{
              position: 'absolute', right: '0.9rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)'
            }} />
          </div>
        </div>

        {/* Product Cards Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: '1rem'
        }}>
          {filteredProducts.map(p => {
            const isOutOfStock = p.quantity <= 0;
            const inCart = cartItems.find(item => item.product.id === p.id);
            const cartQty = inCart ? inCart.qty : 0;
            const availableQty = p.quantity - cartQty;

            return (
              <div
                key={p.id}
                className="card"
                onClick={() => !isOutOfStock && availableQty > 0 && addToCart(p)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  cursor: isOutOfStock || availableQty <= 0 ? 'not-allowed' : 'pointer',
                  opacity: isOutOfStock || availableQty <= 0 ? 0.6 : 1,
                  border: cartQty > 0 ? '2px solid var(--primary)' : '1px solid var(--border)',
                  position: 'relative'
                }}
              >
                {cartQty > 0 && (
                  <span className="badge badge-info" style={{
                    position: 'absolute', top: '0.5rem', left: '0.5rem', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold'
                  }}>
                    {cartQty}
                  </span>
                )}

                <div>
                  <h4 style={{ fontSize: '0.95rem', marginBottom: '0.5rem', color: 'var(--text)' }}>{p.name}</h4>
                  <code style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{p.barcode}</code>
                </div>

                <div style={{ marginTop: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--success)' }}>
                      {p.sale_price} <span style={{ fontSize: '0.75rem' }}>SAR</span>
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      الصرف: {(p.sale_price * sarToYerRate).toFixed(0)} ر.ي
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

      {/* Left Column: Cart Sidebar */}
      <div className="card" style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        padding: '1.25rem 1rem'
      }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
          <ShoppingBag size={20} />
          <span>{strings.sales.cart} ({cartItems.length})</span>
        </h3>

        {/* Cart Error Alerts */}
        {cartError && (
          <div style={{
            backgroundColor: 'hsl(0, 84%, 96%)', color: 'var(--danger)', padding: '0.5rem 0.75rem', borderRadius: '6px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem'
          }}>
            <AlertCircle size={14} />
            <span>{cartError}</span>
          </div>
        )}

        {/* Cart Items List */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {cartItems.map(item => (
            <div key={item.product.id} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', borderBottom: '1px solid var(--border)'
            }}>
              <div style={{ flex: 1, minWidth: 0, paddingLeft: '0.5rem' }}>
                <p style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={item.product.name}>
                  {item.product.name}
                </p>
                <span style={{ fontSize: '0.8rem', color: 'var(--success)', fontWeight: 'bold' }}>
                  {item.product.sale_price} SAR
                </span>
              </div>

              {/* Quantity selectors */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <button
                  onClick={() => updateQty(item.product.id, item.qty - 1)}
                  style={{ background: 'var(--border)', border: 'none', borderRadius: '4px', padding: '0.2rem', cursor: 'pointer' }}
                >
                  <Minus size={12} />
                </button>
                <span style={{ fontSize: '0.85rem', fontWeight: 'bold', width: '20px', textAlign: 'center' }}>
                  {item.qty}
                </span>
                <button
                  onClick={() => updateQty(item.product.id, item.qty + 1)}
                  style={{ background: 'var(--border)', border: 'none', borderRadius: '4px', padding: '0.2rem', cursor: 'pointer' }}
                >
                  <Plus size={12} />
                </button>
                <button
                  onClick={() => removeFromCart(item.product.id)}
                  style={{ background: 'none', border: 'none', color: 'var(--danger)', padding: '0.2rem', cursor: 'pointer', marginRight: '0.25rem' }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}

          {cartItems.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem 0', fontSize: '0.85rem' }}>
              {strings.sales.emptyCart}
            </div>
          )}
        </div>

        {/* Totals Summary */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>المجموع بالسعودي (SAR):</span>
            <span style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--success)' }}>
              {sarTotal.toFixed(2)} ر.س
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.25rem', backgroundColor: 'var(--primary-lighter)', padding: '0.5rem 0.75rem', borderRadius: '8px' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--primary)' }}>المجموع باليمني (YER):</span>
            <span style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--primary)' }}>
              {yerTotal.toFixed(0)} ر.ي
            </span>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={clearCart}
              className="btn btn-secondary"
              style={{ flex: 1, padding: '0.65rem' }}
              disabled={cartItems.length === 0}
            >
              مسح
            </button>
            <button
              onClick={handleCheckout}
              className="btn btn-primary"
              style={{ flex: 2, padding: '0.65rem', border: 'none' }}
              disabled={cartItems.length === 0 || isCheckingOut}
            >
              {isCheckingOut ? 'جاري الحفظ...' : 'دفع وطباعة'}
            </button>
          </div>
        </div>
      </div>

      {/* Thermal Receipt Print Preview Modal */}
      {showReceiptModal && lastPrintedInvoice && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="card animate-fade-in" style={{ width: '360px', padding: '1.5rem', backgroundColor: '#fff', color: '#000' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #ddd', paddingBottom: '0.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', color: '#000', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <CheckCircle2 size={18} style={{ color: 'var(--success)' }} />
                <span>تمت العملية بنجاح!</span>
              </h3>
              <button
                onClick={() => setShowReceiptModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#888' }}
              >
                &times;
              </button>
            </div>

            {/* Simulated thermal receipt */}
            <div className="receipt-container" style={{ margin: '0 auto', border: '1px dashed #333' }}>
              <div className="receipt-header">
                <h4 style={{ color: '#000', fontSize: '1.1rem', fontWeight: 'bold' }}>{tenant?.store_name}</h4>
                <p style={{ fontSize: '0.75rem', color: '#555' }}>فاتورة مبيعات نقدية مبسطة</p>
                <p style={{ fontSize: '0.7rem', color: '#555' }}>فرع حضرموت - المكلا</p>
              </div>

              <div style={{ fontSize: '0.75rem', marginBottom: '0.5rem', borderBottom: '1px dashed #000', paddingBottom: '0.35rem' }}>
                <div>رقم الفاتورة: {lastPrintedInvoice.id}</div>
                <div>التاريخ: {lastPrintedInvoice.date}</div>
                <div>الكاشير: {lastPrintedInvoice.cashier}</div>
              </div>

              {/* Items list */}
              <div style={{ borderBottom: '1px dashed #000', paddingBottom: '0.35rem', marginBottom: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '0.75rem' }}>
                  <span style={{ width: '50%' }}>المنتج</span>
                  <span style={{ width: '15%', textAlign: 'center' }}>ك</span>
                  <span style={{ width: '35%', textAlign: 'left' }}>الإجمالي</span>
                </div>
                {lastPrintedInvoice.items.map((item: any) => (
                  <div key={item.product.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginTop: '0.2rem' }}>
                    <span style={{ width: '50%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.product.name}</span>
                    <span style={{ width: '15%', textAlign: 'center' }}>{item.qty}</span>
                    <span style={{ width: '35%', textAlign: 'left' }}>{(item.qty * item.product.sale_price).toFixed(2)} SAR</span>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="receipt-total" style={{ fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>الإجمالي بالريال السعودي:</span>
                  <span>{lastPrintedInvoice.sarTotal.toFixed(2)} ر.س</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem', fontSize: '0.95rem' }}>
                  <span>الإجمالي بالريال اليمني:</span>
                  <span>{lastPrintedInvoice.yerTotal.toFixed(0)} ر.ي</span>
                </div>
                <div style={{ fontSize: '0.65rem', textAlign: 'center', marginTop: '0.5rem', fontWeight: 'normal', color: '#555' }}>
                  سعر الصرف المستخدم: 1 ر.س = {lastPrintedInvoice.rate} ر.ي
                </div>
              </div>

              <div style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.7rem', borderTop: '1px dashed #000', paddingTop: '0.5rem' }}>
                شكراً لزيارتكم!
              </div>
            </div>

            <button
              onClick={() => {
                window.print();
              }}
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', border: 'none' }}
            >
              <Printer size={16} />
              <span>طباعة الفاتورة</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesTab;
