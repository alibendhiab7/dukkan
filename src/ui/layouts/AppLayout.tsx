// src/ui/layouts/AppLayout.tsx
import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useInventoryStore } from '../../store/inventoryStore';
import { useSalesStore } from '../../store/salesStore';
import { useCartStore } from '../../store/cartStore';
import { useThemeStore } from '../../store/themeStore';
import { setLanguage, getLanguage } from '../../i18n';
import { strings } from '../../i18n';
import {
  LayoutDashboard, ShoppingBag, Package, BarChart3, Users, TrendingUp,
  LogOut, Moon, Sun, Menu, X, RotateCcw, Printer,
  Settings, DollarSign, Gift, UserCircle
} from 'lucide-react';

const DashboardTab = React.lazy(() => import('../tabs/DashboardTab'));
const SalesTab = React.lazy(() => import('../tabs/SalesTab'));
const InventoryTab = React.lazy(() => import('../tabs/InventoryTab'));
const ReportsTab = React.lazy(() => import('../tabs/ReportsTab'));
const RatesTab = React.lazy(() => import('../tabs/RatesTab'));
const CustomersTab = React.lazy(() => import('../tabs/CustomersTab'));
const ReturnsTab = React.lazy(() => import('../tabs/ReturnsTab'));
const FinancialCostsTab = React.lazy(() => import('../tabs/FinancialCostsTab'));
const PromotionsTab = React.lazy(() => import('../tabs/PromotionsTab'));
const DebtsTab = React.lazy(() => import('../tabs/DebtsTab'));
import NotificationBell from '../components/NotificationBell';
import BackupRestore from '../components/BackupRestore';
import PrintSettingsPanel from '../components/PrintSettings';
import UserProfile from '../components/UserProfile';
import { useExpiryNotifications } from '../../store/useExpiryNotifications';
import { useKeyboardShortcuts } from '../../store/useKeyboardShortcuts';
import { useAutoLogout } from '../../store/useAutoLogout';
import { startHeartbeat } from '../../store/onlineStore';

type TabId = 'dashboard' | 'sales' | 'inventory' | 'reports' | 'rates' | 'customers' | 'debts' | 'returns' | 'costs' | 'backup' | 'printSettings' | 'profile' | 'promotions';


const AppLayout: React.FC = () => {
  const { user, tenant, logout, isModuleEnabled, hasPermission } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const [lang, setLang] = useState(getLanguage());
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const { loadProducts } = useInventoryStore();
  const { loadSales, loadExchangeRate } = useSalesStore();
  const { loadExchangeRate: loadCartRate } = useCartStore();

  useExpiryNotifications();
  useAutoLogout(15 * 60 * 1000);

  useEffect(() => {
    if (user && tenant) {
      const cleanup = startHeartbeat(user.id, user.username, tenant.id);
      return cleanup;
    }
  }, [user, tenant]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    if (tenant) {
      loadProducts(tenant.id);
      loadSales(tenant.id);
      loadExchangeRate(tenant.id);
      loadCartRate(tenant.id);
    }
  }, [tenant]);

  useKeyboardShortcuts({
    onNewSale: () => { if (isModuleEnabled('sales')) setActiveTab('sales'); },
    onAddProduct: () => { if (isModuleEnabled('inventory')) setActiveTab('inventory'); },
    onDashboard: () => setActiveTab('dashboard'),
    onInventory: () => { if (isModuleEnabled('inventory')) setActiveTab('inventory'); },
    onReports: () => { if (isModuleEnabled('reports') && hasPermission('admin')) setActiveTab('reports'); },
  });

  const handleLogout = async () => {
    if (window.confirm('هل تريد تسجيل الخروج؟')) await logout();
  };

  const navigateTo = (tab: TabId) => {
    setActiveTab(tab);
    setSidebarOpen(false);
  };

  const navSections = [
    {
      title: 'القائمة الرئيسية',
      items: [
        { id: 'dashboard' as TabId, label: 'الرئيسية', icon: LayoutDashboard, enabled: hasPermission('dashboard.read') },
        { id: 'sales' as TabId, label: 'نقطة البيع', icon: ShoppingBag, enabled: isModuleEnabled('sales') && hasPermission('sales.read') },
        { id: 'inventory' as TabId, label: 'المخزن', icon: Package, enabled: isModuleEnabled('inventory') && hasPermission('inventory.read') },
      ]
    },
    {
      title: 'إدارة المتجر',
      items: [
        { id: 'customers' as TabId, label: 'العملاء', icon: Users, enabled: isModuleEnabled('sales') && hasPermission('customers.read') },
        { id: 'debts' as TabId, label: 'المديونية', icon: DollarSign, enabled: isModuleEnabled('sales') && hasPermission('debts.read') },
        { id: 'promotions' as TabId, label: 'العروض', icon: Gift, enabled: isModuleEnabled('sales') && hasPermission('promotions.read') },
        { id: 'returns' as TabId, label: 'المرتجعات', icon: RotateCcw, enabled: isModuleEnabled('sales') && hasPermission('returns.read') },
      ]
    },
    {
      title: 'التقارير والإعدادات',
      items: [
        { id: 'reports' as TabId, label: 'التقارير', icon: BarChart3, enabled: isModuleEnabled('reports') && hasPermission('reports.read') },
        { id: 'costs' as TabId, label: 'التكاليف المالية', icon: DollarSign, enabled: isModuleEnabled('reports') && hasPermission('costs.read') },
        { id: 'rates' as TabId, label: 'أسعار الصرف', icon: TrendingUp, enabled: hasPermission('rates.read') },
        { id: 'printSettings' as TabId, label: 'إعدادات الطباعة', icon: Printer, enabled: hasPermission('printSettings.read') },
        { id: 'backup' as TabId, label: 'النسخ الاحتياطي', icon: Settings, enabled: hasPermission('backup.read') },
      ]
    }
  ];

  const allNavItems = navSections.flatMap(s => s.items).filter(i => i.enabled);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <DashboardTab setActiveTab={(tab) => { if (allNavItems.find(n => n.id === tab)) navigateTo(tab as TabId); }} />;
      case 'sales': return isModuleEnabled('sales') ? <SalesTab /> : <DisabledMsg msg="ميزة المبيعات معطلة" />;
      case 'inventory': return isModuleEnabled('inventory') ? <InventoryTab /> : <DisabledMsg msg="ميزة المخزون معطلة" />;
      case 'reports': return <ReportsTab />;
      case 'rates': return <RatesTab />;
      case 'customers': return <CustomersTab />;
      case 'debts': return <DebtsTab />;
      case 'returns': return <ReturnsTab />;
      case 'costs': return <FinancialCostsTab />;
      case 'promotions': return <PromotionsTab />;
      case 'backup': return <BackupWrap />;
      case 'printSettings': return <PrintSettingsPanel />;
      case 'profile': return <UserProfile />;
      default: return <DashboardTab setActiveTab={navigateTo} />;
    }
  };

  const activeNavItem = allNavItems.find(n => n.id === activeTab);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--background)' }}>
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)}
          className={`sidebar-overlay ${sidebarOpen ? 'active' : ''}`}
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 99 }}
        />
      )}

      {/* Sidebar */}
      <aside className={`app-sidebar ${sidebarOpen ? 'open' : ''}`}>
        {/* Sidebar Header */}
        <div className="sidebar-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px',
              background: 'linear-gradient(135deg, #1e1b4b, #6366f1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              boxShadow: '0 2px 8px rgba(99,102,241,0.35)',
            }}>
              <svg width="20" height="20" viewBox="0 0 38 38" fill="none">
                <rect x="5" y="13" width="28" height="20" rx="2" fill="rgba(255,255,255,0.15)" />
                <rect x="5" y="13" width="28" height="4" rx="2" fill="rgba(255,255,255,0.4)" />
                <rect x="14" y="22" width="10" height="11" rx="2" fill="rgba(255,255,255,0.9)" />
                <circle cx="21.5" cy="28" r="1" fill="#6366f1" />
                <path d="M3 13 Q19 6 35 13" stroke="rgba(255,255,255,0.6)" strokeWidth="2" fill="none" strokeLinecap="round"/>
                <rect x="9" y="17" width="20" height="3" rx="1" fill="rgba(255,255,255,0.5)" />
              </svg>
            </div>
            <div>
              <p style={{ fontSize: '0.95rem', fontWeight: '900', lineHeight: '1.2', color: 'var(--primary)' }}>دكّان</p>
              <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: '700', letterSpacing: '0.06em' }}>DUKKAN • {tenant?.store_name}</p>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="sidebar-close-btn">
            <X size={18} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {navSections.map((section, sIdx) => {
            const visibleItems = section.items.filter(i => i.enabled);
            if (visibleItems.length === 0) return null;
            return (
              <div key={sIdx} style={{ marginBottom: '0.5rem' }}>
                <p className="sidebar-section-title">{section.title}</p>
                {visibleItems.map(item => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button key={item.id} onClick={() => navigateTo(item.id)}
                      className={`sidebar-nav-item ${isActive ? 'active' : ''}`}>
                      <Icon size={17} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="sidebar-footer">
          <button onClick={() => navigateTo('profile')} className="sidebar-nav-item" style={{ marginBottom: '0.5rem' }}>
            <UserCircle size={17} />
            <span>{user?.username}</span>
          </button>
          <button onClick={handleLogout} className="sidebar-logout-btn">
            <LogOut size={16} />
            <span>{strings.auth.logout}</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top Bar */}
        <header className="top-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button onClick={() => setSidebarOpen(true)} className="hamburger-btn">
              <Menu size={20} />
            </button>
            <div>
              <h2 style={{ fontSize: '1rem', fontWeight: '700' }}>{activeNavItem?.label || 'الرئيسية'}</h2>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <NotificationBell />
            <button onClick={() => { const nl = lang === 'ar' ? 'en' : 'ar'; setLanguage(nl); setLang(nl); window.location.reload(); }}
              className="top-bar-icon-btn" title={lang === 'ar' ? 'English' : 'عربي'}>
              <span style={{ fontSize: '0.7rem', fontWeight: '800' }}>{lang === 'ar' ? 'EN' : 'عر'}</span>
            </button>
            <button onClick={toggleTheme} className="top-bar-icon-btn" title={theme === 'light' ? 'داكن' : 'فاتح'}>
              {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="page-content">
          <React.Suspense fallback={<LoadingFallback />}>
            {renderContent()}
          </React.Suspense>
        </main>
      </div>

    </div>
  );
};

const DisabledMsg: React.FC<{ msg: string }> = ({ msg }) => (
  <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>{msg}</div>
);

const LoadingFallback: React.FC = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
    <p style={{ color: 'var(--text-muted)', fontWeight: '600' }}>جاري التحميل...</p>
  </div>
);

const BackupWrap: React.FC = () => (
  <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
    <div>
      <h2 style={{ color: 'var(--primary)' }}>النسخ الاحتياطي والاستعادة</h2>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>نسخ البيانات احتياطياً أو استعادتها</p>
    </div>
    <BackupRestore />
  </div>
);

export default AppLayout;
