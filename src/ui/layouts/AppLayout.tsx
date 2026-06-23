// src/ui/layouts/AppLayout.tsx
import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useInventoryStore } from '../../store/inventoryStore';
import { useSalesStore } from '../../store/salesStore';
import { useCartStore } from '../../store/cartStore';
import { strings } from '../../i18n';
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  BarChart3,
  Users,
  TrendingUp,
  LogOut,
  Store
} from 'lucide-react';

// Lazy loading Tabs
const DashboardTab = React.lazy(() => import('../tabs/DashboardTab'));
const SalesTab = React.lazy(() => import('../tabs/SalesTab'));
const InventoryTab = React.lazy(() => import('../tabs/InventoryTab'));
const ReportsTab = React.lazy(() => import('../tabs/ReportsTab'));
const EmployeesTab = React.lazy(() => import('../tabs/EmployeesTab'));
const RatesTab = React.lazy(() => import('../tabs/RatesTab'));

const AppLayout: React.FC = () => {
  const { user, tenant, logout, isModuleEnabled, hasPermission } = useAuthStore();
  const { loadProducts } = useInventoryStore();
  const { loadSales, loadExchangeRate, loadEmployees } = useSalesStore();
  const { loadExchangeRate: loadCartRate } = useCartStore();

  const [activeTab, setActiveTab] = useState<'dashboard' | 'sales' | 'inventory' | 'reports' | 'employees' | 'rates'>('dashboard');

  // Load essential tenant data upon layout load
  useEffect(() => {
    if (tenant) {
      loadProducts(tenant.id);
      loadSales(tenant.id);
      loadExchangeRate(tenant.id);
      loadCartRate(tenant.id);
      if (hasPermission('admin')) {
        loadEmployees(tenant.id);
      }
    }
  }, [tenant, loadProducts, loadSales, loadExchangeRate, loadCartRate, loadEmployees, hasPermission]);

  const handleLogout = async () => {
    if (window.confirm('هل تريد بالتأكيد تسجيل الخروج؟')) {
      await logout();
    }
  };

  // Build navigation items based on active modules and permissions
  const navItems = [
    { id: 'dashboard', label: 'الرئيسية', icon: LayoutDashboard, enabled: true },
    { id: 'sales', label: 'المبيعات', icon: ShoppingBag, enabled: isModuleEnabled('sales') },
    { id: 'inventory', label: 'المخزن', icon: Package, enabled: isModuleEnabled('inventory') },
    { id: 'reports', label: 'التقارير', icon: BarChart3, enabled: isModuleEnabled('reports') && hasPermission('admin') },
    { id: 'employees', label: 'الموظفون', icon: Users, enabled: isModuleEnabled('employees') && hasPermission('admin') },
    { id: 'rates', label: 'الصرف', icon: TrendingUp, enabled: hasPermission('admin') } // Admin only manages rate
  ];

  const activeNavItems = navItems.filter(item => item.enabled);

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardTab setActiveTab={(tab) => {
          const item = navItems.find(t => t.id === tab);
          if (item?.enabled) setActiveTab(tab);
        }} />;
      case 'sales':
        return isModuleEnabled('sales') ? <SalesTab /> : <div style={{ padding: '2rem', textAlign: 'center' }}>عذراً، ميزة المبيعات معطلة لهذا المتجر.</div>;
      case 'inventory':
        return isModuleEnabled('inventory') ? <InventoryTab /> : <div style={{ padding: '2rem', textAlign: 'center' }}>عذراً، ميزة المخزون معطلة لهذا المتجر.</div>;
      case 'reports':
        return isModuleEnabled('reports') && hasPermission('admin') ? <ReportsTab /> : <div style={{ padding: '2rem', textAlign: 'center' }}>غير مصرح بالدخول للتقارير.</div>;
      case 'employees':
        return isModuleEnabled('employees') && hasPermission('admin') ? <EmployeesTab /> : <div style={{ padding: '2rem', textAlign: 'center' }}>غير مصرح بالدخول لإدارة الموظفين.</div>;
      case 'rates':
        return hasPermission('admin') ? <RatesTab /> : <div style={{ padding: '2rem', textAlign: 'center' }}>غير مصرح بالدخول لإدارة أسعار الصرف.</div>;
      default:
        return <DashboardTab setActiveTab={setActiveTab} />;
    }
  };

  return (
    <div className="app-container" style={{ minHeight: '100vh', background: 'var(--background)' }}>
      {/* Header */}
      <header className="app-header">
        <div className="logo-container">
          <Store size={22} />
          <span className="store-title">{tenant?.store_name}</span>
          <span className="badge badge-info hide-on-mobile" style={{ marginRight: '0.5rem', fontSize: '0.7rem' }}>
            {user?.role === 'admin' ? 'مدير المتجر' : 'موظف مبيعات'}
          </span>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '0.85rem', opacity: 0.9 }} className="hide-on-mobile">
            مرحباً، {user?.username}
          </span>
          <button
            onClick={handleLogout}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-light)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              padding: '0.25rem',
              opacity: 0.8
            }}
            title={strings.auth.logout}
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>

      {/* Main Grid Wrapper */}
      <div className="admin-layout-container">
        {/* Right Sidebar - Visible on Desktop/Tablets */}
        <aside className="sidebar-admin hide-on-mobile">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', width: '100%' }}>
            {activeNavItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  className="btn"
                  onClick={() => setActiveTab(item.id as any)}
                  style={{
                    justifyContent: 'flex-start',
                    backgroundColor: isActive ? 'var(--primary-lighter)' : 'transparent',
                    color: isActive ? 'var(--primary)' : 'var(--text)',
                    border: 'none',
                    padding: '0.75rem 1rem',
                    width: '100%',
                    fontWeight: isActive ? '800' : 'normal'
                  }}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* User profile footer inside client sidebar */}
          <div className="sidebar-profile" style={{ width: '100%' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
              <span style={{ fontWeight: '800', color: 'var(--text-dark)' }}>{user?.username}</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {user?.role === 'admin' ? 'مدير المتجر' : 'موظف مبيعات'}
              </span>
            </div>
            <button
              onClick={handleLogout}
              style={{
                background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', display: 'flex', padding: 0
              }}
              title={strings.auth.logout}
            >
              <LogOut size={16} />
            </button>
          </div>
        </aside>

        {/* Content Area */}
        <main className="main-content" style={{ overflowY: 'auto' }}>
          <React.Suspense fallback={
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
              <p style={{ fontWeight: '600', color: 'var(--primary)' }}>جاري تحميل الصفحة...</p>
            </div>
          }>
            {renderActiveTab()}
          </React.Suspense>
        </main>
      </div>

      {/* Bottom Mobile Tab Bar - Visible on Mobile Only */}
      <nav className="mobile-nav">
        {activeNavItems.map(item => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id as any)}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default AppLayout;
