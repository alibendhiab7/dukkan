import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { salesRepo, productRepo } from '../../core/repositories/sqlite';
import { TrendingDown } from 'lucide-react';

const UnsoldProductsAlert: React.FC = () => {
  const { tenant } = useAuthStore();
  const [unsoldProducts, setUnsoldProducts] = useState<{ name: string; barcode: string; lastSoldDate: string | null; daysSinceSold: number }[]>([]);
  const [daysThreshold, setDaysThreshold] = useState(30);

  useEffect(() => {
    if (tenant) checkUnsoldProducts();
  }, [tenant, daysThreshold]);

  const checkUnsoldProducts = async () => {
    if (!tenant) return;
    const products = await productRepo.getAll(tenant.id);
    const sales = await salesRepo.getAll(tenant.id);

    const productLastSold = new Map<string, string>();

    for (const sale of sales) {
      const items = await salesRepo.getItems(sale.id);
      for (const item of items) {
        const existing = productLastSold.get(item.product_id);
        if (!existing || new Date(sale.created_at) > new Date(existing)) {
          productLastSold.set(item.product_id, sale.created_at);
        }
      }
    }

    const now = new Date();
    const thresholdDate = new Date(now.getTime() - daysThreshold * 86400000);

    const unsold = products
      .filter(p => {
        const lastSold = productLastSold.get(p.id);
        if (!lastSold) return true;
        return new Date(lastSold) < thresholdDate;
      })
      .map(p => {
        const lastSold = productLastSold.get(p.id);
        return {
          name: p.name,
          barcode: p.barcode,
          lastSoldDate: lastSold || null,
          daysSinceSold: lastSold
            ? Math.floor((now.getTime() - new Date(lastSold).getTime()) / 86400000)
            : 999,
        };
      })
      .sort((a, b) => b.daysSinceSold - a.daysSinceSold)
      .slice(0, 20);

    setUnsoldProducts(unsold);
  };

  if (unsoldProducts.length === 0) return null;

  return (
    <div className="card" style={{ borderRight: '4px solid var(--warning)' }}>
      <h3 style={{ fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--warning)' }}>
        <TrendingDown size={18} /> منتجات لم تُبع منذ {daysThreshold} يوم ({unsoldProducts.length})
      </h3>
      <div style={{ marginBottom: '0.75rem' }}>
        <label className="input-label" style={{ fontSize: '0.75rem' }}>عتبة الأيام:</label>
        <select className="input-field" value={daysThreshold} onChange={(e) => setDaysThreshold(parseInt(e.target.value))} style={{ width: 'auto', padding: '0.35rem 0.65rem', fontSize: '0.8rem' }}>
          <option value={15}>15 يوم</option>
          <option value={30}>30 يوم</option>
          <option value={60}>60 يوم</option>
          <option value={90}>90 يوم</option>
        </select>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '250px', overflowY: 'auto' }}>
        {unsoldProducts.map((p, idx) => (
          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.65rem', backgroundColor: 'hsl(38, 92%, 95%)', borderRadius: '6px', fontSize: '0.8rem' }}>
            <div>
              <p style={{ fontWeight: '600' }}>{p.name}</p>
              <code style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{p.barcode}</code>
            </div>
            <span className="badge badge-warning" style={{ fontSize: '0.65rem' }}>
              {p.lastSoldDate ? `${p.daysSinceSold} يوم` : 'لم تُبع بعد'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default UnsoldProductsAlert;
