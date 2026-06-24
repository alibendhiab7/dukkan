// src/store/inventoryStore.ts
import { create } from 'zustand';
import type { Product, InventoryMovement } from '../core/repositories/interfaces';
import { productRepo, movementRepo, auditRepo } from '../core/repositories/turso';
import { useToastStore } from './toastStore';

interface InventoryState {
  products: Product[];
  movements: InventoryMovement[];
  isLoading: boolean;
  error: string | null;

  loadProducts: (tenantId: string) => Promise<void>;
  loadMovements: (tenantId: string) => Promise<void>;
  addProduct: (tenantId: string, product: Omit<Product, 'id' | 'tenant_id'>, username: string) => Promise<boolean>;
  updateProduct: (tenantId: string, product: Product, username: string) => Promise<boolean>;
  deleteProduct: (tenantId: string, productId: string, username: string) => Promise<boolean>;
  adjustStock: (tenantId: string, productId: string, qty: number, type: 'in' | 'out', username: string) => Promise<boolean>;
  getProductsByCategory: (category: string) => Product[];
  getLowStockProducts: () => Product[];
  getCategories: () => string[];
}

export const useInventoryStore = create<InventoryState>((set, get) => ({
  products: [],
  movements: [],
  isLoading: false,
  error: null,

  loadProducts: async (tenantId: string) => {
    set({ isLoading: true, error: null });
    try {
      const products = await productRepo.getAll(tenantId);
      set({ products, isLoading: false });
    } catch (err) {
      console.error(err);
      set({ error: 'فشل تحميل قائمة المنتجات', isLoading: false });
    }
  },

  loadMovements: async (tenantId: string) => {
    set({ isLoading: true });
    try {
      const movements = await movementRepo.getByTenant(tenantId);
      set({ movements, isLoading: false });
    } catch (err) {
      console.error(err);
      set({ error: 'فشل تحميل حركات المخزون', isLoading: false });
    }
  },

  addProduct: async (tenantId: string, productData: Omit<Product, 'id' | 'tenant_id'>, username: string): Promise<boolean> => {
    set({ isLoading: true, error: null });
    try {
      // Check barcode uniqueness
      const existing = await productRepo.getByBarcode(productData.barcode, tenantId);
      if (existing) {
        set({ error: 'الباركود مدخل مسبقاً لمنتج آخر', isLoading: false });
        return false;
      }

      const id = 'prod_' + crypto.randomUUID().replace(/-/g, '').slice(0, 12);
      const newProduct: Product = {
        ...productData,
        id,
        tenant_id: tenantId
      };

      await productRepo.create(newProduct);
      
      // Log initial movement
      const movementId = 'mov_' + crypto.randomUUID().replace(/-/g, '').slice(0, 12);
      await movementRepo.create({
        id: movementId,
        tenant_id: tenantId,
        product_id: id,
        type: 'in',
        quantity: productData.quantity,
        created_at: new Date().toISOString()
      });

      // Audit log
      await auditRepo.create({
        tenant_id: tenantId,
        action: `تمت إضافة منتج جديد: ${productData.name}، الكمية الابتدائية: ${productData.quantity}`,
        performed_by: username
      });

      await get().loadProducts(tenantId);
      await get().loadMovements(tenantId);

      useToastStore.getState().addToast('success', `تم إضافة المنتج "${productData.name}" بنجاح`);
      
      if (productData.quantity <= (productData.min_stock || 5)) {
        useToastStore.getState().addToast('warning', `تنبيه: كمية المنتج "${productData.name}" منخفضة (${productData.quantity} قطع فقط)`);
      }

      return true;
    } catch (err) {
      console.error(err);
      set({ error: 'فشل إضافة المنتج الجديد', isLoading: false });
      return false;
    }
  },

  updateProduct: async (tenantId: string, product: Product, username: string): Promise<boolean> => {
    set({ isLoading: true, error: null });
    try {
      const original = await productRepo.getById(product.id, tenantId);
      if (!original) {
        set({ error: 'المنتج غير موجود', isLoading: false });
        return false;
      }

      // Check barcode uniqueness if changed
      if (product.barcode !== original.barcode) {
        const existing = await productRepo.getByBarcode(product.barcode, tenantId);
        if (existing) {
          set({ error: 'الباركود مدخل مسبقاً لمنتج آخر', isLoading: false });
          return false;
        }
      }

      await productRepo.update(product);

      // Audit Log
      await auditRepo.create({
        tenant_id: tenantId,
        action: `تعديل بيانات المنتج: ${product.name} (السعر القديم: ${original.sale_price} SAR، السعر الجديد: ${product.sale_price} SAR)`,
        performed_by: username
      });

      await get().loadProducts(tenantId);
      
      useToastStore.getState().addToast('success', `تم تعديل المنتج "${product.name}" بنجاح`);
      
      if (product.quantity <= (product.min_stock || 5)) {
        useToastStore.getState().addToast('warning', `تنبيه: مخزون "${product.name}" منخفض (${product.quantity} قطع متبقية)`);
      }
      
      return true;
    } catch (err) {
      console.error(err);
      set({ error: 'فشل تعديل المنتج', isLoading: false });
      return false;
    }
  },

  deleteProduct: async (tenantId: string, productId: string, username: string): Promise<boolean> => {
    set({ isLoading: true, error: null });
    try {
      const p = await productRepo.getById(productId, tenantId);
      if (!p) {
        set({ error: 'المنتج غير موجود', isLoading: false });
        return false;
      }

      await productRepo.delete(productId, tenantId);

      // Audit
      await auditRepo.create({
        tenant_id: tenantId,
        action: `تم حذف المنتج نهائياً: ${p.name}`,
        performed_by: username
      });

      await get().loadProducts(tenantId);
      
      useToastStore.getState().addToast('success', `تم حذف المنتج "${p.name}" بنجاح`);
      
      return true;
    } catch (err) {
      console.error(err);
      set({ error: 'فشل حذف المنتج', isLoading: false });
      return false;
    }
  },

  adjustStock: async (tenantId: string, productId: string, qty: number, type: 'in' | 'out', username: string): Promise<boolean> => {
    set({ isLoading: true, error: null });
    try {
      const p = await productRepo.getById(productId, tenantId);
      if (!p) {
        set({ error: 'المنتج غير موجود', isLoading: false });
        return false;
      }

      const delta = type === 'in' ? qty : -qty;
      if (type === 'out' && p.quantity < qty) {
        set({ error: 'الكمية المراد سحبها أكبر من المخزون المتوفر', isLoading: false });
        return false;
      }

      await productRepo.updateStock(productId, tenantId, delta);

      const movementId = 'mov_' + crypto.randomUUID().replace(/-/g, '').slice(0, 12);
      await movementRepo.create({
        id: movementId,
        tenant_id: tenantId,
        product_id: productId,
        type,
        quantity: qty,
        created_at: new Date().toISOString()
      });

      await auditRepo.create({
        tenant_id: tenantId,
        action: `تسوية كمية مخزون للمنتج (${p.name}): ${type === 'in' ? 'إدخال' : 'إخراج'} كمية قدرها ${qty}`,
        performed_by: username
      });

      await get().loadProducts(tenantId);
      await get().loadMovements(tenantId);

      const newQty = type === 'in' ? p.quantity + qty : p.quantity - qty;
      const minStock = p.min_stock || 5;
      if (newQty <= minStock) {
        useToastStore.getState().addToast('warning', `تنبيه: مخزون "${p.name}" منخفض (${newQty} قطع متبقية)`);
      } else {
        useToastStore.getState().addToast('success', `تم ${type === 'in' ? 'إدخال' : 'إخراج'} ${qty} قطعة من "${p.name}" بنجاح`);
      }

      return true;
    } catch (err) {
      console.error(err);
      set({ error: 'فشل تعديل كمية المخزون', isLoading: false });
      useToastStore.getState().addToast('error', 'فشل تعديل كمية المخزون');
      return false;
    }
  },

  getProductsByCategory: (category: string): Product[] => {
    const { products } = get();
    if (!category || category === 'all') return products;
    return products.filter(p => p.category === category);
  },

  getLowStockProducts: (): Product[] => {
    const { products } = get();
    return products.filter(p => p.quantity <= (p.min_stock || 5));
  },

  getCategories: (): string[] => {
    const { products } = get();
    const cats = new Set(products.filter(p => p.category).map(p => p.category!));
    return Array.from(cats).sort();
  },
}));
