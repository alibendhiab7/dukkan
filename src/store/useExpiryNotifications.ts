import { useEffect } from 'react';
import { useAuthStore } from './authStore';
import { useToastStore } from './toastStore';
import { productRepo } from '../core/repositories/sqlite';

export function useExpiryNotifications() {
  const { tenant } = useAuthStore();
  const { addToast } = useToastStore();

  useEffect(() => {
    if (!tenant) return;

    const checkExpiry = async () => {
      const products = await productRepo.getAll(tenant.id);
      const now = new Date();
      const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      const expiredProducts = products.filter(p => p.expiry_date && new Date(p.expiry_date) < now);
      const soonExpiringProducts = products.filter(p => {
        if (!p.expiry_date) return false;
        const expDate = new Date(p.expiry_date);
        return expDate >= now && expDate <= thirtyDays;
      });

      if (expiredProducts.length > 0) {
        addToast('error', `تنبيه: ${expiredProducts.length} منتج منتهي الصلاحية!`);
      }

      if (soonExpiringProducts.length > 0) {
        const names = soonExpiringProducts.slice(0, 3).map(p => p.name).join(', ');
        const more = soonExpiringProducts.length > 3 ? ` و${soonExpiringProducts.length - 3} آخرين` : '';
        addToast('warning', `صلاحية ${soonExpiringProducts.length} منتج ستنتهي قريباً: ${names}${more}`);
      }
    };

    checkExpiry();
    const interval = setInterval(checkExpiry, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [tenant, addToast]);
}
