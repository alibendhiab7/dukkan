// src/ui/screens/LoginScreen.tsx
import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { strings } from '../../i18n';
import { db } from '../../core/database/db';
import { Lock, Store, User, RefreshCw, Shield, ShoppingCart, UserCog } from 'lucide-react';

const LoginScreen: React.FC = () => {
  const { login, error, isLoading, clearError } = useAuthStore();

  const [storeCode, setStoreCode] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeCode || !username || !password) return;
    await login(storeCode, username, password);
  };

  const quickLogin = async (code: string, user: string, pass: string) => {
    clearError();
    await login(code, user, pass);
  };

  const accounts = [
    { label: 'مدير النظام', sublabel: 'System Admin', code: 'SYS', user: 'sysadmin', pass: 'sysadmin123', icon: Shield, color: '#7c3aed', bg: '#f3f0ff' },
    { label: 'مدير المتجر', sublabel: 'Store Manager', code: 'hadhramaut', user: 'admin', pass: 'admin123', icon: UserCog, color: '#111', bg: '#f5f5f5' },
    { label: 'موظف مبيعات', sublabel: 'Sales Employee', code: 'hadhramaut', user: 'salim', pass: 'salim123', icon: ShoppingCart, color: '#1E824C', bg: '#e6f7ef' },
    { label: 'مدير سيئون', sublabel: 'Seiyun Manager', code: 'seiyun', user: 'admin', pass: 'admin123', icon: UserCog, color: '#e67e22', bg: '#fef3e2' },
  ];

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      background: '#0b0f19',
      padding: '1.5rem 1rem',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background Glow Blobs */}
      <div style={{
        position: 'absolute', top: '10%', left: '15%',
        width: '350px', height: '350px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(16, 185, 129, 0.12) 0%, transparent 70%)',
        filter: 'blur(50px)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: '10%', right: '15%',
        width: '350px', height: '350px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(245, 158, 11, 0.08) 0%, transparent 70%)',
        filter: 'blur(60px)',
        pointerEvents: 'none',
      }} />

      <div style={{ width: '100%', maxWidth: '420px', position: 'relative', zIndex: 1 }}>
        {/* Logo / Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: '76px', height: '76px', borderRadius: '22px',
            background: 'linear-gradient(135deg, #1e1b4b 0%, #6366f1 100%)',
            boxShadow: '0 8px 32px rgba(99, 102, 241, 0.4)',
            marginBottom: '1.25rem',
            position: 'relative',
          }}>
            {/* Dukkan door/shelf icon */}
            <svg width="38" height="38" viewBox="0 0 38 38" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Storefront arch */}
              <rect x="5" y="13" width="28" height="20" rx="2" fill="rgba(255,255,255,0.15)" />
              <rect x="5" y="13" width="28" height="4" rx="2" fill="rgba(255,255,255,0.35)" />
              {/* Door */}
              <rect x="14" y="22" width="10" height="11" rx="2" fill="rgba(255,255,255,0.9)" />
              {/* Door knob */}
              <circle cx="21.5" cy="28" r="1" fill="#6366f1" />
              {/* Awning */}
              <path d="M3 13 Q19 6 35 13" stroke="rgba(255,255,255,0.6)" strokeWidth="2" fill="none" strokeLinecap="round"/>
              {/* Sign */}
              <rect x="9" y="17" width="20" height="3" rx="1" fill="rgba(255,255,255,0.5)" />
            </svg>
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: '900', color: '#fff', letterSpacing: '-0.025em', marginBottom: '0.2rem' }}>
            دكّان
          </h1>
          <p style={{ color: '#818cf8', fontSize: '0.78rem', fontWeight: '700', letterSpacing: '0.08em', marginBottom: '0.3rem' }}>DUKKAN</p>
          <p style={{ color: '#94a3b8', fontSize: '0.82rem', fontWeight: '500' }}>نظام سحابي متكامل لإدارة نقاط البيع والمخازن</p>
        </div>

        {/* Error Notification */}
        {error && (
          <div style={{
            backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)',
            color: '#f87171', padding: '0.85rem 1.25rem', borderRadius: 'var(--radius-md)',
            marginBottom: '1.5rem', fontSize: '0.85rem', fontWeight: '600',
            textAlign: 'center',
          }}>
            {error}
          </div>
        )}

        {/* Quick Login Cards */}
        <div style={{ marginBottom: '1.75rem' }}>
          <p style={{ textAlign: 'center', color: '#64748b', fontSize: '0.8rem', fontWeight: '700', marginBottom: '0.85rem' }}>
            دخول سريع - اختر حسابك
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
            {accounts.map((acc, i) => {
              const Icon = acc.icon;
              // Map old colors to premium glow theme
              const accentColor = i === 0 ? '#10b981' : i === 1 ? '#f59e0b' : i === 2 ? '#3b82f6' : '#8b5cf6';
              const glassBg = `rgba(${i === 0 ? '16,185,129' : i === 1 ? '245,158,11' : i === 2 ? '59,130,246' : '139,92,246'}, 0.08)`;
              const borderCol = `rgba(${i === 0 ? '16,185,129' : i === 1 ? '245,158,11' : i === 2 ? '59,130,246' : '139,92,246'}, 0.15)`;

              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => quickLogin(acc.code, acc.user, acc.pass)}
                  disabled={isLoading}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    gap: '0.5rem', padding: '1.25rem 0.85rem', border: `1px solid ${borderCol}`,
                    borderRadius: '16px', cursor: 'pointer',
                    backgroundColor: glassBg, backdropFilter: 'blur(8px)', transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                    opacity: isLoading ? 0.6 : 1,
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-3px)';
                    e.currentTarget.style.borderColor = accentColor;
                    e.currentTarget.style.boxShadow = `0 8px 24px ${accentColor}25`;
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.borderColor = borderCol;
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div style={{
                    width: '42px', height: '42px', borderRadius: '12px',
                    backgroundColor: accentColor, color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: `0 4px 12px ${accentColor}40`,
                  }}>
                    <Icon size={20} />
                  </div>
                  <span style={{ fontSize: '0.85rem', fontWeight: '800', color: '#f8fafc' }}>{acc.label}</span>
                  <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '600' }}>{acc.code} / {acc.user}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', margin: '1.75rem 0' }}>
          <div style={{ flex: 1, height: '1px', background: '#1e293b' }} />
          <span style={{ color: '#475569', fontSize: '0.75rem', fontWeight: '700' }}>أو سجّل يدوياً</span>
          <div style={{ flex: 1, height: '1px', background: '#1e293b' }} />
        </div>

        {/* Manual Form */}
        <form onSubmit={handleSubmit} style={{
          backgroundColor: 'rgba(30, 41, 59, 0.4)', border: '1px solid rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(16px)', borderRadius: '24px', padding: '1.75rem',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
        }}>
          <div className="input-group">
            <label className="input-label" style={{ color: '#94a3b8', fontSize: '0.75rem' }}>{strings.auth.tenantLabel}</label>
            <div style={{ position: 'relative' }}>
              <input type="text" className="input-field" placeholder="SYS / hadhramaut / seiyun"
                value={storeCode} onChange={(e) => { clearError(); setStoreCode(e.target.value); }}
                disabled={isLoading}
                style={{
                  width: '100%', paddingRight: '2.5rem',
                  backgroundColor: 'rgba(15, 23, 42, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#fff', borderRadius: '12px', outline: 'none'
                }} />
              <Store size={16} style={{ position: 'absolute', right: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#475569' }} />
            </div>
          </div>

          <div className="input-group">
            <label className="input-label" style={{ color: '#94a3b8', fontSize: '0.75rem' }}>{strings.auth.usernameLabel}</label>
            <div style={{ position: 'relative' }}>
              <input type="text" className="input-field" placeholder="admin / sysadmin"
                value={username} onChange={(e) => { clearError(); setUsername(e.target.value); }}
                disabled={isLoading}
                style={{
                  width: '100%', paddingRight: '2.5rem',
                  backgroundColor: 'rgba(15, 23, 42, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#fff', borderRadius: '12px', outline: 'none'
                }} />
              <User size={16} style={{ position: 'absolute', right: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#475569' }} />
            </div>
          </div>

          <div className="input-group" style={{ marginBottom: '1.5rem' }}>
            <label className="input-label" style={{ color: '#94a3b8', fontSize: '0.75rem' }}>{strings.auth.passwordLabel}</label>
            <div style={{ position: 'relative' }}>
              <input type="password" className="input-field" placeholder="••••••"
                value={password} onChange={(e) => { clearError(); setPassword(e.target.value); }}
                disabled={isLoading}
                style={{
                  width: '100%', paddingRight: '2.5rem',
                  backgroundColor: 'rgba(15, 23, 42, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#fff', borderRadius: '12px', outline: 'none'
                }} />
              <Lock size={16} style={{ position: 'absolute', right: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#475569' }} />
            </div>
          </div>

          <button type="submit" disabled={isLoading}
            style={{
              width: '100%', padding: '0.9rem', border: 'none', borderRadius: '12px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#fff', fontWeight: '800', fontSize: '0.95rem', cursor: 'pointer',
              boxShadow: '0 8px 24px rgba(16, 185, 129, 0.35)',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.opacity = '0.95'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            {isLoading ? strings.common.loading : strings.auth.loginButton}
          </button>
        </form>

        {/* Reset DB */}
        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <button type="button" onClick={async () => {
            if (window.confirm('هل تريد مسح البيانات وإعادة التهيئة؟')) {
              await db.clearDatabase();
              window.location.reload();
            }
          }} style={{
            background: 'none', border: 'none', color: '#475569', fontSize: '0.75rem',
            cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
            fontWeight: '600', transition: 'color 0.2s'
          }}
          onMouseEnter={e => e.currentTarget.style.color = '#94a3b8'}
          onMouseLeave={e => e.currentTarget.style.color = '#475569'}
          >
            <RefreshCw size={12} /> إعادة تهيئة قاعدة البيانات
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
