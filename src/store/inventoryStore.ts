// src/store/inventoryStore.ts
import { create } from 'zustand';
import type { Product, InventoryMovement } from '../core/repositories/interfaces';
import { productRepo, movementRepo, auditRepo } from '../core/repositories/sqlite';

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

      // Log movement
      const movementId = 'mov_' + crypto.randomUUID().replace(/-/g, '').slice(0, 12);
      await movementRepo.create({
        id: movementId,
        tenant_id: tenantId,
        product_id: productId,
        type,
        quantity: qty,
        created_at: new Date().toISOString()
      });

      // Audit log
      await auditRepo.create({
        tenant_id: tenantId,
        action: `تسوية كمية مخزون للمنتج (${p.name}): ${type === 'in' ? 'إدخال' : 'إخراج'} كمية قدرها ${qty}`,
        performed_by: username
      });

      await get().loadProducts(tenantId);
      await get().loadMovements(tenantId);
      return true;
    } catch (err) {
      console.error(err);
      set({ error: 'فشل تعديل كمية المخزون', isLoading: false });
      return false;
    }
  }
}));
