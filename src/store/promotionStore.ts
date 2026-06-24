import { create } from 'zustand';

export interface Promotion {
  id: string;
  name: string;
  type: 'bogo' | 'bundle' | 'flash_sale';
  productId?: string;
  minQty: number;
  freeQty: number;
  discountPercent?: number;
  validFrom: string;
  validTo: string;
  isActive: boolean;
}

interface PromotionState {
  promotions: Promotion[];
  addPromotion: (promo: Omit<Promotion, 'id'>) => void;
  removePromotion: (id: string) => void;
  togglePromotion: (id: string) => void;
  getActivePromotions: () => Promotion[];
  getPromotionForProduct: (productId: string) => Promotion | undefined;
  getDiscountedPrice: (originalPrice: number, productId: string) => number;
  isFlashSale: (productId: string) => boolean;
}

const getStoredPromotions = (): Promotion[] => {
  try {
    const stored = localStorage.getItem('grocery_saas_promotions');
    return stored ? JSON.parse(stored) : [];
  } catch { return []; }
};

export const usePromotionStore = create<PromotionState>((set, get) => ({
  promotions: getStoredPromotions(),

  addPromotion: (promo) => {
    const newPromo: Promotion = {
      ...promo,
      id: 'promo_' + crypto.randomUUID().replace(/-/g, '').slice(0, 8),
    };
    const updated = [...get().promotions, newPromo];
    localStorage.setItem('grocery_saas_promotions', JSON.stringify(updated));
    set({ promotions: updated });
  },

  removePromotion: (id) => {
    const updated = get().promotions.filter(p => p.id !== id);
    localStorage.setItem('grocery_saas_promotions', JSON.stringify(updated));
    set({ promotions: updated });
  },

  togglePromotion: (id) => {
    const updated = get().promotions.map(p => p.id === id ? { ...p, isActive: !p.isActive } : p);
    localStorage.setItem('grocery_saas_promotions', JSON.stringify(updated));
    set({ promotions: updated });
  },

  getActivePromotions: () => {
    const now = new Date();
    return get().promotions.filter(p => {
      if (!p.isActive) return false;
      const from = new Date(p.validFrom);
      const to = new Date(p.validTo);
      return now >= from && now <= to;
    });
  },

  getPromotionForProduct: (productId) => {
    return get().getActivePromotions().find(p => p.productId === productId);
  },

  getDiscountedPrice: (originalPrice, productId) => {
    const promo = get().getPromotionForProduct(productId);
    if (!promo || promo.type !== 'flash_sale' || !promo.discountPercent) return originalPrice;
    return originalPrice * (1 - promo.discountPercent / 100);
  },

  isFlashSale: (productId) => {
    const promo = get().getPromotionForProduct(productId);
    return !!promo && promo.type === 'flash_sale';
  },
}));
