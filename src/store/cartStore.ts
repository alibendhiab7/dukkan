// src/store/cartStore.ts
import { create } from 'zustand';
import type { Product, Sale, SaleItem } from '../core/repositories/interfaces';
import { salesRepo, rateRepo } from '../core/repositories/sqlite';
import confetti from 'canvas-confetti';

interface CartItem {
  product: Product;
  qty: number;
}

interface CartState {
  items: CartItem[];
  sarToYerRate: number;
  isLoading: boolean;
  error: string | null;

  loadExchangeRate: (tenantId: string) => Promise<void>;
  addToCart: (product: Product) => void;
  addToCartByBarcode: (barcode: string, products: Product[]) => boolean;
  removeFromCart: (productId: string) => void;
  updateQty: (productId: string, qty: number) => void;
  clearCart: () => void;
  checkout: (tenantId: string, username: string) => Promise<boolean>;
  getTotals: () => { sarTotal: number; yerTotal: number };
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  sarToYerRate: 395, // Default fallback Hadhramaut rate
  isLoading: false,
  error: null,

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
      set({ error: `عذراً، الحد الأقصى المتوفر في المخزون هو ${item.product.quantity} قطع` });
      return;
    }

    const updated = items.map(i => 
      i.product.id === productId ? { ...i, qty } : i
    );
    set({ items: updated, error: null });
  },

  clearCart: () => {
    set({ items: [], error: null });
  },

  getTotals: () => {
    const { items, sarToYerRate } = get();
    const sarTotal = items.reduce((sum, item) => sum + (item.product.sale_price * item.qty), 0);
    const yerTotal = sarTotal * sarToYerRate;
    return { sarTotal, yerTotal };
  },

  checkout: async (tenantId: string, username: string): Promise<boolean> => {
    const { items } = get();
    if (items.length === 0) {
      set({ error: 'السلة فارغة' });
      return false;
    }

    set({ isLoading: true, error: null });

    try {
      const saleId = 'sale_' + crypto.randomUUID().replace(/-/g, '').slice(0, 12);
      const { sarTotal } = get().getTotals();

      const newSale: Sale = {
        id: saleId,
        tenant_id: tenantId,
        total: sarTotal,
        created_by: username,
        created_at: new Date().toISOString()
      };

      const saleItems: SaleItem[] = items.map(item => ({
        id: 'sitem_' + crypto.randomUUID().replace(/-/g, '').slice(0, 12),
        sale_id: saleId,
        product_id: item.product.id,
        qty: item.qty,
        price: item.product.sale_price
      }));

      // Persist sales invoice (updates inventory inside transaction)
      await salesRepo.create(newSale, saleItems);

      // Trigger Confetti!
      try {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch (e) {
        // Safe to ignore if confetti library fails
      }

      set({ items: [], isLoading: false, error: null });
      return true;
    } catch (err) {
      console.error(err);
      set({ error: 'حدث خطأ غير متوقع أثناء إتمام عملية البيع', isLoading: false });
      return false;
    }
  }
}));
