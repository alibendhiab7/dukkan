// src/store/cartStore.ts
import { create } from 'zustand';
import type { Product, Sale, SaleItem } from '../core/repositories/interfaces';
import { salesRepo, rateRepo, auditRepo } from '../core/repositories/sqlite';
import { useToastStore } from './toastStore';
import confetti from 'canvas-confetti';

interface CartItem {
  product: Product;
  qty: number;
}

interface HeldCart {
  id: string;
  items: CartItem[];
  customerId: string | null;
  discount: number;
  discountType: 'percentage' | 'fixed';
  notes: string;
  savedAt: string;
}

interface CartState {
  items: CartItem[];
  sarToYerRate: number;
  isLoading: boolean;
  error: string | null;

  // Discount
  discount: number;
  discountType: 'percentage' | 'fixed';
  setDiscount: (value: number, type: 'percentage' | 'fixed') => void;
  clearDiscount: () => void;

  // Customer
  customerId: string | null;
  customerName: string | null;
  setCustomer: (id: string | null, name: string | null) => void;

  // Notes
  notes: string;
  setNotes: (notes: string) => void;

  // Split payment
  splitPayment: boolean;
  splitSar: number;
  splitYer: number;
  setSplitPayment: (enabled: boolean) => void;
  setSplitSar: (amount: number) => void;
  setSplitYer: (amount: number) => void;

  // Hold cart
  heldCarts: HeldCart[];
  holdCurrentCart: () => void;
  recallHeldCart: (id: string) => void;
  deleteHeldCart: (id: string) => void;

  // Core actions
  loadExchangeRate: (tenantId: string) => Promise<void>;
  addToCart: (product: Product) => void;
  addToCartByBarcode: (barcode: string, products: Product[]) => boolean;
  removeFromCart: (productId: string) => void;
  updateQty: (productId: string, qty: number) => void;
  clearCart: () => void;
  checkout: (tenantId: string, username: string) => Promise<boolean>;
  getTotals: () => { sarTotal: number; yerTotal: number; discountAmount: number; finalTotal: number; finalYer: number };
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  sarToYerRate: 395,
  isLoading: false,
  error: null,

  // Discount
  discount: 0,
  discountType: 'percentage',
  setDiscount: (value: number, type: 'percentage' | 'fixed') => set({ discount: value, discountType: type }),
  clearDiscount: () => set({ discount: 0, discountType: 'percentage' }),

  // Customer
  customerId: null,
  customerName: null,
  setCustomer: (id, name) => set({ customerId: id, customerName: name }),

  // Notes
  notes: '',
  setNotes: (notes) => set({ notes }),

  // Split payment
  splitPayment: false,
  splitSar: 0,
  splitYer: 0,
  setSplitPayment: (enabled) => set({ splitPayment: enabled, splitSar: 0, splitYer: 0 }),
  setSplitSar: (amount) => set({ splitSar: amount }),
  setSplitYer: (amount) => set({ splitYer: amount }),

  // Hold cart
  heldCarts: [],
  holdCurrentCart: () => {
    const { items, customerId, discount, discountType, notes } = get();
    if (items.length === 0) return;

    const held: HeldCart = {
      id: 'hold_' + crypto.randomUUID().replace(/-/g, '').slice(0, 8),
      items: [...items],
      customerId,
      discount,
      discountType,
      notes,
      savedAt: new Date().toISOString(),
    };

    set({
      heldCarts: [...get().heldCarts, held],
      items: [],
      customerId: null,
      customerName: null,
      discount: 0,
      discountType: 'percentage',
      notes: '',
    });

    useToastStore.getState().addToast('success', 'تم حفظ السلة مؤقتاً');
  },

  recallHeldCart: (id: string) => {
    const { heldCarts } = get();
    const held = heldCarts.find(h => h.id === id);
    if (!held) return;

    set({
      items: held.items,
      customerId: held.customerId,
      discount: held.discount,
      discountType: held.discountType,
      notes: held.notes,
      heldCarts: heldCarts.filter(h => h.id !== id),
    });

    useToastStore.getState().addToast('success', 'تم استعادة السلة المحفوظة');
  },

  deleteHeldCart: (id: string) => {
    set({ heldCarts: get().heldCarts.filter(h => h.id !== id) });
  },

  loadExchangeRate: async (tenantId: string) => {
    try {
      const rate = await rateRepo.getLatest(tenantId);
      if (rate) {
        set({ sarToYerRate: rate.sar_to_yer });
      }
    } catch (err) {
      console.error('Failed to load exchange rate in cart', err);
    }
  },

  addToCart: (product: Product) => {
    const { items } = get();
    const existing = items.find(item => item.product.id === product.id);

    if (existing) {
      if (existing.qty >= product.quantity) {
        set({ error: `عذراً، لا يتوفر سوى ${product.quantity} قطع في المخزون` });
        return;
      }
      const updated = items.map(item =>
        item.product.id === product.id ? { ...item, qty: item.qty + 1 } : item
      );
      set({ items: updated, error: null });
    } else {
      if (product.quantity <= 0) {
        set({ error: 'عذراً، المنتج نفد من المخزون' });
        return;
      }
      set({ items: [...items, { product, qty: 1 }], error: null });
    }
  },

  addToCartByBarcode: (barcode: string, products: Product[]): boolean => {
    const cleanBarcode = barcode.trim();
    const product = products.find(p => p.barcode === cleanBarcode);
    if (!product) {
      set({ error: 'المنتج غير موجود بجدول الباركود هذا' });
      return false;
    }
    get().addToCart(product);
    return true;
  },

  removeFromCart: (productId: string) => {
    const { items } = get();
    set({ items: items.filter(item => item.product.id !== productId) });
  },

  updateQty: (productId: string, qty: number) => {
    const { items } = get();
    const item = items.find(i => i.product.id === productId);
    if (!item) return;

    if (qty <= 0) {
      get().removeFromCart(productId);
      return;
    }

    if (qty > item.product.quantity) {
      set({ error: `عذراً، الحد الأقصى المتوفر هو ${item.product.quantity} قطع` });
      return;
    }

    const updated = items.map(i =>
      i.product.id === productId ? { ...i, qty } : i
    );
    set({ items: updated, error: null });
  },

  clearCart: () => {
    set({ items: [], error: null, discount: 0, discountType: 'percentage', customerId: null, customerName: null, notes: '', splitPayment: false, splitSar: 0, splitYer: 0 });
  },

  getTotals: () => {
    const { items, sarToYerRate, discount, discountType } = get();
    const yerTotalAmount = items.reduce((sum, item) => sum + (item.product.sale_price * item.qty), 0);

    let discountAmount = 0;
    if (discountType === 'percentage') {
      discountAmount = yerTotalAmount * (discount / 100);
    } else {
      discountAmount = Math.min(discount, yerTotalAmount);
    }

    const finalYer = Math.max(yerTotalAmount - discountAmount, 0);
    const sarTotalAmount = yerTotalAmount / sarToYerRate;
    const finalSar = finalYer / sarToYerRate;

    return { 
      sarTotal: yerTotalAmount,     // YER base total (stored in sarTotal property name to match type definition)
      yerTotal: sarTotalAmount,     // SAR base total (stored in yerTotal property name)
      discountAmount,               // YER discount amount
      finalTotal: finalYer,         // YER final total
      finalYer: finalSar            // SAR final total
    };
  },

  checkout: async (tenantId: string, username: string): Promise<boolean> => {
    const { items, customerId, discount, discountType, notes } = get();
    if (items.length === 0) {
      set({ error: 'السلة فارغة' });
      return false;
    }

    set({ isLoading: true, error: null });

    try {
      const saleId = 'sale_' + crypto.randomUUID().replace(/-/g, '').slice(0, 12);
      const { sarTotal, finalTotal } = get().getTotals();

      const newSale: Sale = {
        id: saleId,
        tenant_id: tenantId,
        total: sarTotal,
        discount: discount || undefined,
        discount_type: discountType,
        final_total: finalTotal,
        created_by: username,
        created_at: new Date().toISOString(),
        customer_id: customerId || undefined,
        notes: notes || undefined,
      };

      const saleItems: SaleItem[] = items.map(item => ({
        id: 'sitem_' + crypto.randomUUID().replace(/-/g, '').slice(0, 12),
        sale_id: saleId,
        product_id: item.product.id,
        qty: item.qty,
        price: item.product.sale_price
      }));

      await salesRepo.create(newSale, saleItems);

      // Audit log
      await auditRepo.create({
        tenant_id: tenantId,
        action: `تسجيل فاتورة بيع رقم ${saleId} بقيمة ${finalTotal.toFixed(0)} ر.ي${customerId ? ' (عميل مرتبط)' : ''}${discount > 0 ? ` (خصم: ${discountType === 'percentage' ? discount + '%' : discount + ' ر.ي'})` : ''}`,
        performed_by: username
      });

      try {
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      } catch (e) {}

      set({ items: [], isLoading: false, error: null, discount: 0, discountType: 'percentage', customerId: null, customerName: null, notes: '', splitPayment: false, splitSar: 0, splitYer: 0 });
      return true;
    } catch (err) {
      console.error(err);
      set({ error: 'حدث خطأ أثناء إتمام عملية البيع', isLoading: false });
      return false;
    }
  }
}));
