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
  Settings, DollarSign, Gift, UserCircle, FileText, CreditCard, LifeBuoy,
  ChevronDown, ShoppingCart, FileBarChart, Wrench
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
const InvoicesTab = React.lazy(() => import('../tabs/InvoicesTab'));
const StoreSubscriptionTab = React.lazy(() => import('../tabs/StoreSubscriptionTab'));
const StoreSupportTab = React.lazy(() => import('../tabs/StoreSupportTab'));
import NotificationBell from '../components/NotificationBell';
import BackupRestore from '../components/BackupRestore';
import PrintSettingsPanel from '../components/PrintSettings';
import UserProfile from '../components/UserProfile';
import { useExpiryNotifications } from '../../store/useExpiryNotifications';
import { useKeyboardShortcuts } from '../../store/useKeyboardShortcuts';
import { useAutoLogout } from '../../store/useAutoLogout';
import { startHeartbeat } from '../../store/onlineStore';
import { api } from '../../core/api/client';

type TabId = 'dashboard' | 'sales' | 'inventory' | 'reports' | 'rates' | 'customers' | 'debts' | 'returns' | 'costs' | 'backup' | 'printSettings' | 'profile' | 'promotions' | 'invoices' | 'subscription_billing' | 'support_tickets';


const AppLayout: React.FC = () => {
  const { user, tenant, logout, isModuleEnabled, hasPermission } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const [lang, setLang] = useState(getLanguage());
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);
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
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (tenant && tenant.id !== '0') {
      const checkStatus = () => {
        const isExpired = new Date() > new Date(tenant.subscription_expires_at);
        const isSuspended = tenant.status === 'suspended';
        if (isExpired || isSuspended) {
          alert(isSuspended ? 'حساب هذا المتجر موقوف حالياً!' : 'عذراً، لقد انتهت فترة اشتراك هذا المتجر. يرجى تجديد الاشتراك لتفادي توقف الخدمة.');
          logout();
        }
      };
      checkStatus();
      const interval = setInterval(checkStatus, 30000); // Check every 30 seconds
      return () => clearInterval(interval);
    }
  }, [tenant, logout]);

  useEffect(() => {
    if (tenant) {
      loadProducts(tenant.id);
      loadSales(tenant.id);
      loadExchangeRate(tenant.id);
      loadCartRate(tenant.id);
    }
  }, [tenant]);

  // Web Push registration & subscription
  useEffect(() => {
    if (user && tenant && tenant.id !== '0') {
      const initPush = async () => {
        if ('serviceWorker' in navigator && 'PushManager' in window) {
          try {
            const reg = await navigator.serviceWorker.ready;
            
            if (Notification.permission === 'default') {
              const permission = await Notification.requestPermission();
              if (permission !== 'granted') return;
            }

            if (Notification.permission === 'granted') {
              let sub = await reg.pushManager.getSubscription();
              if (!sub) {
                const vapidPublicKey = 'BEl62iWDhfUqq326KSTq86K1UF-ZRQS21B4r8y4tG4o60W50B2y8u4tG4o60W50B2y8u4tG4o60W50B2y8u4s';
                const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);
                sub = await reg.pushManager.subscribe({
                  userVisibleOnly: true,
                  applicationServerKey: convertedVapidKey
                });
              }
              
              if (sub) {
                const subJSON = sub.toJSON();
                if (subJSON.endpoint && subJSON.keys?.p256dh && subJSON.keys?.auth) {
                  await api.push.subscribe(tenant.id, user.id, {
                    endpoint: subJSON.endpoint,
                    keys: {
                      p256dh: subJSON.keys.p256dh,
                      auth: subJSON.keys.auth
                    }
                  });
                }
              }
            }
          } catch (e) {
            console.warn('Push subscription failed:', e);
          }
        }
      };
      initPush();
    }
  }, [user, tenant]);

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

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

  type NavItem = { id: TabId; label: string; icon: any; enabled: boolean };
  type NavSection = { title: string; icon: any; items: NavItem[]; isGroup: true };

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (key: string) => {
    setExpandedGroups(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const soloItems: NavItem[] = [
    { id: 'dashboard', label: 'الرئيسية', icon: LayoutDashboard, enabled: hasPermission('dashboard.read') },
    { id: 'sales', label: 'نقطة البيع', icon: ShoppingBag, enabled: isModuleEnabled('sales') && hasPermission('sales.read') },
    { id: 'inventory', label: 'المخزن', icon: Package, enabled: isModuleEnabled('inventory') && hasPermission('inventory.read') },
  ];

  const groupedSections: NavSection[] = [
    {
      title: 'المبيعات والعملاء', icon: ShoppingCart, isGroup: true,
      items: [
        { id: 'customers', label: 'العملاء', icon: Users, enabled: isModuleEnabled('sales') && hasPermission('customers.read') },
        { id: 'invoices', label: 'الفواتير', icon: FileText, enabled: isModuleEnabled('sales') && hasPermission('sales.read') },
        { id: 'debts', label: 'المديونية', icon: DollarSign, enabled: isModuleEnabled('sales') && hasPermission('debts.read') },
        { id: 'returns', label: 'المرتجعات', icon: RotateCcw, enabled: isModuleEnabled('sales') && hasPermission('returns.read') },
        { id: 'promotions', label: 'العروض', icon: Gift, enabled: isModuleEnabled('sales') && hasPermission('promotions.read') },
      ]
    },
    {
      title: 'التقارير', icon: FileBarChart, isGroup: true,
      items: [
        { id: 'reports', label: 'التقارير المالية', icon: BarChart3, enabled: isModuleEnabled('reports') && hasPermission('reports.read') },
        { id: 'costs', label: 'التكاليف', icon: DollarSign, enabled: isModuleEnabled('reports') && hasPermission('costs.read') },
        { id: 'rates', label: 'أسعار الصرف', icon: TrendingUp, enabled: hasPermission('rates.read') },
      ]
    },
    {
      title: 'الإعدادات', icon: Wrench, isGroup: true,
      items: [
        { id: 'printSettings', label: 'إعدادات الطباعة', icon: Printer, enabled: hasPermission('printSettings.read') },
        { id: 'backup', label: 'النسخ الاحتياطي', icon: Settings, enabled: hasPermission('backup.read') },
      ]
    },
    {
      title: 'حسابي', icon: CreditCard, isGroup: true,
      items: [
        { id: 'subscription_billing', label: 'الاشتراك والترخيص', icon: CreditCard, enabled: true },
        { id: 'support_tickets', label: 'الدعم الفني', icon: LifeBuoy, enabled: true },
      ]
    },
  ];

  const allNavItems = [
    ...soloItems.filter(i => i.enabled),
    ...groupedSections.flatMap(s => s.items.filter(i => i.enabled)),
  ];

  const activeNavItem = allNavItems.find(n => n.id === activeTab);

  const isGroupActive = (section: NavSection) => section.items.some(i => i.id === activeTab);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <DashboardTab setActiveTab={(tab) => { if (allNavItems.find(n => n.id === tab)) navigateTo(tab as TabId); }} />;
      case 'sales': return isModuleEnabled('sales') ? <SalesTab /> : <DisabledMsg msg="ميزة المبيعات معطلة" />;
      case 'inventory': return isModuleEnabled('inventory') ? <InventoryTab /> : <DisabledMsg msg="ميزة المخزون معطلة" />;
      case 'reports': return <ReportsTab />;
      case 'rates': return <RatesTab />;
      case 'customers': return <CustomersTab />;
      case 'invoices': return <InvoicesTab />;
      case 'debts': return <DebtsTab />;
      case 'returns': return <ReturnsTab />;
      case 'costs': return <FinancialCostsTab />;
      case 'promotions': return <PromotionsTab />;
      case 'backup': return <BackupWrap />;
      case 'printSettings': return <PrintSettingsPanel />;
      case 'profile': return <UserProfile />;
      case 'subscription_billing': return <StoreSubscriptionTab />;
      case 'support_tickets': return <StoreSupportTab />;
      default: return <DashboardTab setActiveTab={navigateTo} />;
    }
  };

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
              overflow: 'hidden', flexShrink: 0,
            }}>
              <img src="/favicon.svg" alt="دكّان" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
          {soloItems.filter(i => i.enabled).map(item => {
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

          <div style={{ height: '0.35rem' }} />

          {groupedSections.map((section) => {
            const visibleItems = section.items.filter(i => i.enabled);
            if (visibleItems.length === 0) return null;
            const isExpanded = expandedGroups[section.title] || isGroupActive(section);
            const SectionIcon = section.icon;
            return (
              <div key={section.title} style={{ marginBottom: '0.15rem' }}>
                <button
                  onClick={() => toggleGroup(section.title)}
                  className="sidebar-nav-item"
                  style={{
                    justifyContent: 'space-between',
                    fontWeight: isExpanded ? '700' : '500',
                    color: isGroupActive(section) ? 'var(--primary)' : 'var(--text-muted)',
                    backgroundColor: isExpanded ? 'var(--primary-lighter)' : 'transparent',
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <SectionIcon size={17} />
                    <span>{section.title}</span>
                  </span>
                  <ChevronDown
                    size={14}
                    style={{
                      transition: 'transform 0.2s',
                      transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                      opacity: 0.6,
                    }}
                  />
                </button>
                {isExpanded && (
                  <div style={{ marginTop: '0.1rem' }}>
                    {visibleItems.map(item => {
                      const Icon = item.icon;
                      const isActive = activeTab === item.id;
                      return (
                        <button key={item.id} onClick={() => navigateTo(item.id)}
                          className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                          style={{ paddingRight: '1.5rem', fontSize: isMobile ? '0.8rem' : '0.8rem' }}>
                          <Icon size={isMobile ? 15 : 15} />
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
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
        {localStorage.getItem('impersonator_original_session') !== null && (
          <div style={{
            background: 'linear-gradient(90deg, #1e3a8a 0%, #3b82f6 100%)',
            color: 'white',
            padding: '0.65rem 1rem',
            textAlign: 'center',
            fontSize: '0.85rem',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1rem',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
            zIndex: 100
          }}>
            <span>⚠️ أنت تتصفح حالياً متجر <strong>{tenant?.store_name}</strong> (رمز: {tenant?.client_code}) في وضع معاينة مسؤول المنصة.</span>
            <button
              onClick={async () => {
                await useAuthStore.getState().stopImpersonating();
              }}
              style={{
                background: 'white',
                color: '#1e3a8a',
                border: 'none',
                padding: '0.3rem 0.75rem',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '0.75rem',
                transition: 'all 0.2s',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
            >
              إنهاء المعاينة والعودة للإدارة
            </button>
          </div>
        )}
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
