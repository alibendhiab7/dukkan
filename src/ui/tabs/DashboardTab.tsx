// src/ui/tabs/DashboardTab.tsx
import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useInventoryStore } from '../../store/inventoryStore';
import { useSalesStore } from '../../store/salesStore';
import { strings } from '../../i18n';
import {
  TrendingUp,
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  PlusCircle,
  ShoppingBag,
  DollarSign,
  Briefcase,
  RefreshCw,
  CheckCircle,
  Calculator,
  Database,
  Sparkles
} from 'lucide-react';
import UnsoldProductsAlert from '../components/UnsoldProductsAlert';
import { useOnlineStore } from '../../store/onlineStore';

interface DashboardTabProps {
  setActiveTab: (tab: any) => void;
}

const DashboardTab: React.FC<DashboardTabProps> = ({ setActiveTab }) => {
  const { user, tenant, isModuleEnabled } = useAuthStore();
  const { products, movements } = useInventoryStore();
  const { sales, exchangeRate, getAnalytics } = useSalesStore();

  const [stats, setStats] = useState({
    salesCount: 0,
    totalRevenueSar: 0,
    totalProfitSar: 0,
    inventoryValuationSar: 0
  });

  // Time-based dynamic Arabic greeting helper
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'صباح الخير والبركة ☀️';
    if (hour < 17) return 'أهلاً بك وطاب يومك ☀️';
    return 'مساء الخير والأنوار 🌙';
  };

  // SQLite Cloud Sync state
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success'>('idle');

  const { getOnlineByTenant } = useOnlineStore();
  const onlineUsers = tenant ? getOnlineByTenant(tenant.id) : [];

  // Mini Exchange Rate Calculator states
  const [sarInput, setSarInput] = useState<string>('');
  const [yerInput, setYerInput] = useState<string>('');

  const handleSync = () => {
    setSyncStatus('syncing');
    setTimeout(() => {
      setSyncStatus('success');
      import('canvas-confetti').then((confetti) => {
        confetti.default({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.8 }
        });
      });
      setTimeout(() => setSyncStatus('idle'), 4000);
    }, 1500);
  };

  const rateVal = exchangeRate?.sar_to_yer || 395;
  const handleSarChange = (val: string) => {
    setSarInput(val);
    if (val === '') {
      setYerInput('');
    } else {
      const num = parseFloat(val);
      if (!isNaN(num)) {
        setYerInput((num * rateVal).toFixed(0));
      }
    }
  };
  const handleYerChange = (val: string) => {
    setYerInput(val);
    if (val === '') {
      setSarInput('');
    } else {
      const num = parseFloat(val);
      if (!isNaN(num)) {
        setSarInput((num / rateVal).toFixed(2));
      }
    }
  };

  useEffect(() => {
    if (tenant) {
      getAnalytics(tenant.id).then(res => {
        setStats({
          salesCount: res.salesCount,
          totalRevenueSar: res.totalRevenueSar,
          totalProfitSar: res.totalProfitSar,
          inventoryValuationSar: res.inventoryValuationSar
        });
      });
    }
  }, [tenant, sales, products, getAnalytics]);  // Find products that are low in stock (qty < 5)
  const lowStockProducts = products.filter(p => p.quantity < 5);
  // Get recent movements (limit 5)
  const recentMovements = movements.slice(0, 5);

  const getExpiryDaysLeft = () => {
    if (!tenant) return 999;
    const expiry = new Date(tenant.subscription_expires_at).getTime();
    const now = new Date().getTime();
    return Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
  };
  const daysLeft = getExpiryDaysLeft();
  const showExpiryWarning = daysLeft <= 7 && daysLeft >= 0;



  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Expiry Warning Banner */}
      {showExpiryWarning && (
        <div style={{
          backgroundColor: 'var(--secondary-light)',
          borderRight: '5px solid var(--warning)',
          padding: '1rem 1.25rem',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          fontSize: '0.9rem',
          color: 'var(--text-dark)',
          fontWeight: 'bold',
          boxShadow: 'var(--shadow-sm)',
          animation: 'pulseSoft 2s infinite ease-in-out'
        }}>
          <AlertTriangle size={20} style={{ color: 'var(--warning)', flexShrink: 0 }} />
          <span>
            تنبيه ترخيص المتجر: سينتهي ترخيص متجركم خلال {daysLeft} أيام (تاريخ الانتهاء: {new Date(tenant!.subscription_expires_at).toLocaleDateString('ar-YE')}). يرجى تجديد الاشتراك لتفادي توقف الخدمة.
          </span>
        </div>
      )}

      {/* Welcome Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ color: 'var(--primary)', fontWeight: '800', fontSize: '1.6rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>{getGreeting()}</span>
            <span style={{ color: 'var(--secondary-dark)' }}>{user?.username}</span>
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            هذه نظرة سريعة على أداء متجر <span style={{ fontWeight: 'bold', color: 'var(--text)' }}>({tenant?.store_name})</span> اليوم.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.35rem 0.65rem', backgroundColor: 'hsl(142, 69%, 92%)', borderRadius: '99px', fontSize: '0.75rem' }}>
            <span className="sync-dot" style={{ width: '6px', height: '6px' }} />
            <span style={{ fontWeight: '700', color: 'var(--success)' }}>{onlineUsers.length} متصل</span>
          </div>
          <span className="badge badge-info" style={{ fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
            <Sparkles size={12} style={{ color: 'var(--secondary-dark)' }} />
            <span>{user?.role === 'admin' ? 'مدير عام المتجر' : 'صلاحية موظف مبيعات'}</span>
          </span>
        </div>
      </div>

      {/* Stats Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1.25rem'
      }}>
        {/* Sales Count */}
        {isModuleEnabled('sales') && (
          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ padding: '0.75rem', backgroundColor: 'var(--primary-lighter)', color: 'var(--primary)', borderRadius: '12px' }}>
              <ShoppingBag size={24} />
            </div>
            <div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{strings.dashboard.salesCount}</p>
              <h3 style={{ fontSize: '1.5rem', color: 'var(--text)' }}>
                {stats.salesCount.toLocaleString('ar-YE')} فاتورة
              </h3>
            </div>
          </div>
        )}

        {/* Revenue */}
        {isModuleEnabled('sales') && (
          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ padding: '0.75rem', backgroundColor: 'var(--primary-lighter)', color: 'var(--primary)', borderRadius: '12px' }}>
              <TrendingUp size={24} />
            </div>
            <div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{strings.dashboard.totalRevenue}</p>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ fontSize: '1.5rem', color: 'var(--success)', fontWeight: '800' }}>
                  {Math.round(stats.totalRevenueSar * rateVal).toLocaleString()} <span style={{ fontSize: '0.85rem', fontWeight: '500' }}>ر.ي</span>
                </h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{stats.totalRevenueSar.toFixed(2)} ر.س</span>
              </div>
            </div>
          </div>
        )}

        {/* Profit */}
        {isModuleEnabled('sales') && isModuleEnabled('reports') && user?.role === 'admin' && (
          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ padding: '0.75rem', backgroundColor: 'hsl(38, 92%, 92%)', color: 'var(--secondary)', borderRadius: '12px' }}>
              <DollarSign size={24} />
            </div>
            <div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{strings.dashboard.totalProfit}</p>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ fontSize: '1.5rem', color: 'var(--primary)', fontWeight: '800' }}>
                  {Math.round(stats.totalProfitSar * rateVal).toLocaleString()} <span style={{ fontSize: '0.85rem', fontWeight: '500' }}>ر.ي</span>
                </h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{stats.totalProfitSar.toFixed(2)} ر.س</span>
              </div>
            </div>
          </div>
        )}

        {/* Inventory Valuation */}
        {isModuleEnabled('inventory') && user?.role === 'admin' && (
          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ padding: '0.75rem', backgroundColor: 'var(--primary-lighter)', color: 'var(--primary)', borderRadius: '12px' }}>
              <Briefcase size={24} />
            </div>
            <div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{strings.dashboard.inventoryValuation}</p>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ fontSize: '1.5rem', color: 'var(--text)', fontWeight: '800' }}>
                  {Math.round(stats.inventoryValuationSar * rateVal).toLocaleString()} <span style={{ fontSize: '0.85rem', fontWeight: '500' }}>ر.ي</span>
                </h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{stats.inventoryValuationSar.toFixed(2)} ر.س</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Premium Multi-Widget Dashboard Grid */}
      <div className="grid-2">
        {/* Card 2: Interactive SQLite Cloud Sync */}
        <div className="sync-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--text-dark)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <Database size={16} style={{ color: 'var(--primary-light)' }} />
              <span>قاعدة بيانات SQLite المحلية</span>
            </span>
            <div className="sync-status-indicator">
              <span className="sync-dot" />
              <span>متاح أوفلاين</span>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
              يتم تخزين العمليات محلياً ومزامنتها سحابياً بشكل تلقائي ومؤمن.
            </p>
            <button
              onClick={handleSync}
              className="btn btn-secondary"
              disabled={syncStatus === 'syncing'}
              style={{
                width: '100%',
                padding: '0.45rem',
                fontSize: '0.8rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.35rem',
                border: 'none',
                borderRadius: '6px'
              }}
            >
              <RefreshCw size={14} className={syncStatus === 'syncing' ? 'animate-spin' : ''} />
              <span>
                {syncStatus === 'idle' && 'تأكيد مزامنة البيانات سحابياً'}
                {syncStatus === 'syncing' && 'جاري الاتصال والمزامنة...'}
                {syncStatus === 'success' && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                    <CheckCircle size={14} style={{ color: 'var(--success)' }} />
                    <span>تمت المزامنة بنجاح!</span>
                  </span>
                )}
              </span>
            </button>
          </div>
        </div>

        {/* Card 3: Live Exchange Calculator Widget */}
        <div className="calc-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--text-dark)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <Calculator size={16} style={{ color: 'var(--secondary-dark)' }} />
              <span>حاسبة الصرف السريعة</span>
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--secondary-dark)', fontWeight: 'bold' }}>
              الصرف: 1 ↔ {rateVal.toFixed(0)} ر.ي
            </span>
          </div>
          <div className="calc-grid">
            <div className="calc-input-wrapper">
              <input
                type="number"
                placeholder="سعودي"
                value={sarInput}
                onChange={(e) => handleSarChange(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.4rem 0.5rem 0.4rem 1.6rem',
                  fontSize: '0.8rem',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  outline: 'none',
                  textAlign: 'right'
                }}
              />
              <span className="calc-input-unit">سعودي</span>
            </div>
            <div className="calc-input-wrapper">
              <input
                type="number"
                placeholder="يمني"
                value={yerInput}
                onChange={(e) => handleYerChange(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.4rem 0.5rem 0.4rem 1.6rem',
                  fontSize: '0.8rem',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  outline: 'none',
                  textAlign: 'right'
                }}
              />
              <span className="calc-input-unit">يمني</span>
            </div>
          </div>
          <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.4rem', margin: 0, textAlign: 'left' }}>
            * حاسبة فورية لتسهيل البيع للزبائن.
          </p>
        </div>
      </div>

      {/* Layout Grid: Left Alert/Actions, Right Movements */}
      <div className="dashboard-grid">
        
        {/* Left Side: Quick Actions & Low Stock Alerts */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Quick Actions */}
          <div className="card">
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
              {strings.dashboard.quickActions}
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
              {isModuleEnabled('sales') && (
                <button onClick={() => setActiveTab('sales')} className="btn btn-primary" style={{ padding: '0.75rem 0.5rem', fontSize: '0.85rem', border: 'none' }}>
                  <PlusCircle size={16} />
                  <span>فاتورة جديدة</span>
                </button>
              )}
              {isModuleEnabled('inventory') && (
                <button onClick={() => setActiveTab('inventory')} className="btn btn-secondary" style={{ padding: '0.75rem 0.5rem', fontSize: '0.85rem' }}>
                  <span>إضافة منتج</span>
                </button>
              )}
              {user?.role === 'admin' && (
                <button onClick={() => setActiveTab('rates')} className="btn btn-secondary" style={{ padding: '0.75rem 0.5rem', fontSize: '0.85rem' }}>
                  <span>تعديل الصرف</span>
                </button>
              )}
              {user?.role === 'admin' && isModuleEnabled('employees') && (
                <button onClick={() => setActiveTab('employees')} className="btn btn-secondary" style={{ padding: '0.75rem 0.5rem', fontSize: '0.85rem' }}>
                  <span>إضافة موظف</span>
                </button>
              )}
            </div>
          </div>

        {/* Low Stock Alerts */}
        {isModuleEnabled('inventory') && (
          <div className="card" style={{ flex: 1 }}>
            <h3 style={{
              fontSize: '1.1rem',
              color: 'var(--danger)',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              borderBottom: '1px solid var(--border)',
              paddingBottom: '0.5rem'
            }}>
              <AlertTriangle size={18} />
              <span>{strings.dashboard.lowStockAlerts} ({lowStockProducts.length})</span>
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '180px', overflowY: 'auto' }}>
              {lowStockProducts.map(p => (
                <div key={p.id} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.5rem 0.75rem',
                  backgroundColor: 'hsl(0, 84%, 97%)',
                  borderRadius: '6px',
                  fontSize: '0.85rem'
                }}>
                  <span style={{ fontWeight: '600', color: 'var(--text)' }}>{p.name}</span>
                  <span className="badge badge-danger" style={{ animation: 'fadeIn 0.5s infinite alternate' }}>
                    {p.quantity} قطع متبقية
                  </span>
                </div>
              ))}

              {lowStockProducts.length === 0 && (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', padding: '1rem 0' }}>
                  جميع المنتجات متوفرة بمخزون كافٍ.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Unsold Products Alert */}
        {isModuleEnabled('inventory') && <UnsoldProductsAlert />}
      </div>

        {/* Right Side: Recent Movements Log */}
        {isModuleEnabled('inventory') && (
          <div className="card">
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
              {strings.dashboard.latestMovements}
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '315px', overflowY: 'auto' }}>
              {recentMovements.map(m => (
                <div key={m.id} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.75rem',
                  backgroundColor: 'var(--surface-hover)',
                  borderRadius: '8px',
                  fontSize: '0.85rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{
                      padding: '0.35rem',
                      borderRadius: '50%',
                      backgroundColor: m.type === 'in' ? 'hsl(142, 69%, 92%)' : 'hsl(0, 84%, 93%)',
                      color: m.type === 'in' ? 'var(--success)' : 'var(--danger)',
                      display: 'flex'
                    }}>
                      {m.type === 'in' ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                    </div>
                    <div>
                      <p style={{ fontWeight: '600', color: 'var(--text)' }}>{m.product_name}</p>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {new Date(m.created_at).toLocaleTimeString('ar-YE')}
                      </span>
                    </div>
                  </div>

                  <span style={{
                    fontWeight: '700',
                    color: m.type === 'in' ? 'var(--success)' : 'var(--danger)'
                  }}>
                    {m.type === 'in' ? '+' : '-'}{m.quantity}
                  </span>
                </div>
              ))}

              {recentMovements.length === 0 && (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem 0' }}>
                  لا توجد حركات مخزون مسجلة بعد.
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default DashboardTab;
