// src/ui/screens/LoginScreen.tsx
import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { strings } from '../../i18n';
import { db } from '../../core/database/db';
import { Lock, Store, User, RefreshCw } from 'lucide-react';

const LoginScreen: React.FC = () => {
  const { login, error, isLoading, clearError } = useAuthStore();

  const [storeCode, setStoreCode] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showDemo, setShowDemo] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeCode || !username || !password) return;
    await login(storeCode, username, password);
  };

  const fillDemo = (code: string, user: string, pass: string) => {
    clearError();
    setStoreCode(code);
    setUsername(user);
    setPassword(pass);
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, var(--primary-dark) 0%, var(--primary) 100%)',
      padding: '1.5rem'
    }}>
      <div className="card animate-fade-in" style={{
        width: '100%',
        maxWidth: '420px',
        padding: '2.5rem 2rem',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-lg)',
        border: 'none',
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)'
      }}>
        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '64px',
            height: '64px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--primary)',
            color: 'white',
            marginBottom: '1rem',
            boxShadow: '0 4px 10px rgba(11, 46, 27, 0.3)'
          }}>
            <Store size={32} />
          </div>
          <h2 style={{ fontSize: '1.6rem', color: 'var(--primary)', marginBottom: '0.25rem' }}>
            {strings.common.appName}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            نظام سحابي متكامل لإدارة نقاط البيع والمخازن
          </p>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            backgroundColor: 'hsl(0, 84%, 96%)',
            color: 'var(--danger)',
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-sm)',
            marginBottom: '1.5rem',
            fontSize: '0.85rem',
            fontWeight: '600',
            borderRight: '4px solid var(--danger)',
            animation: 'fadeIn 0.2s ease'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Store Code */}
          <div className="input-group">
            <label className="input-label" htmlFor="storeCode">
              {strings.auth.tenantLabel}
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="storeCode"
                type="text"
                className="input-field"
                placeholder={strings.auth.tenantPlaceholder}
                value={storeCode}
                onChange={(e) => { clearError(); setStoreCode(e.target.value); }}
                disabled={isLoading}
                style={{ width: '100%', paddingRight: '2.5rem' }}
                required
              />
              <Store size={18} style={{
                position: 'absolute', right: '0.9rem', top: '50%',
                transform: 'translateY(-50%)', color: 'var(--text-muted)'
              }} />
            </div>
          </div>

          {/* Username */}
          <div className="input-group">
            <label className="input-label" htmlFor="username">
              {strings.auth.usernameLabel}
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="username"
                type="text"
                className="input-field"
                placeholder={strings.auth.usernamePlaceholder}
                value={username}
                onChange={(e) => { clearError(); setUsername(e.target.value); }}
                disabled={isLoading}
                style={{ width: '100%', paddingRight: '2.5rem' }}
                required
              />
              <User size={18} style={{
                position: 'absolute', right: '0.9rem', top: '50%',
                transform: 'translateY(-50%)', color: 'var(--text-muted)'
              }} />
            </div>
          </div>

          {/* Password */}
          <div className="input-group" style={{ marginBottom: '2rem' }}>
            <label className="input-label" htmlFor="password">
              {strings.auth.passwordLabel}
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="password"
                type="password"
                className="input-field"
                placeholder={strings.auth.passwordPlaceholder}
                value={password}
                onChange={(e) => { clearError(); setPassword(e.target.value); }}
                disabled={isLoading}
                style={{ width: '100%', paddingRight: '2.5rem' }}
                required
              />
              <Lock size={18} style={{
                position: 'absolute', right: '0.9rem', top: '50%',
                transform: 'translateY(-50%)', color: 'var(--text-muted)'
              }} />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={isLoading}
            style={{ width: '100%', padding: '0.9rem', fontSize: '1rem', border: 'none' }}
          >
            {isLoading ? strings.common.loading : strings.auth.loginButton}
          </button>
        </form>

        {/* Demo Accounts */}
        <div style={{ textAlign: 'center', marginTop: '1.5rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
          <button
            type="button"
            onClick={() => setShowDemo(!showDemo)}
            style={{
              background: 'none', border: 'none', color: 'var(--primary)',
              fontSize: '0.8rem', cursor: 'pointer', fontWeight: 'bold',
              textDecoration: 'underline'
            }}
          >
            {showDemo ? 'إخفاء الحسابات التجريبية' : '🔑 عرض الحسابات التجريبية'}
          </button>

          {showDemo && (
            <div style={{
              marginTop: '0.75rem',
              borderRadius: 'var(--radius-sm)',
              overflow: 'hidden',
              border: '1px solid var(--border)'
            }}>
              {[
                { label: 'مدير النظام', code: 'SYS', user: 'sysadmin', pass: 'sysadmin123', color: '#7c3aed' },
                { label: 'مدير المتجر', code: 'hadhramaut', user: 'admin', pass: 'admin123', color: 'var(--primary)' },
                { label: 'موظف', code: 'hadhramaut', user: 'salim', pass: 'salim123', color: 'var(--accent)' },
                { label: 'مدير سيئون', code: 'seiyun', user: 'admin', pass: 'admin123', color: '#e67e22' },
              ].map((acc, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => fillDemo(acc.code, acc.user, acc.pass)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    padding: '0.6rem 1rem',
                    border: 'none',
                    borderBottom: i < 3 ? '1px solid var(--border)' : 'none',
                    background: 'white',
                    cursor: 'pointer',
                    fontSize: '0.82rem',
                    transition: 'background 0.15s',
                    textAlign: 'right'
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#f8f9fa')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'white')}
                >
                  <span style={{
                    background: acc.color,
                    color: 'white',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '0.7rem',
                    fontWeight: 'bold'
                  }}>
                    {acc.label}
                  </span>
                  <span style={{ color: 'var(--text-secondary)' }}>
                    {acc.code} / {acc.user}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Reset */}
        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
          <button
            type="button"
            onClick={async () => {
              if (window.confirm('هل تريد مسح قاعدة البيانات المحلية وإعادة تهيئتها؟')) {
                await db.clearDatabase();
                window.location.reload();
              }
            }}
            style={{
              background: 'none', border: 'none', color: 'var(--text-muted)',
              fontSize: '0.72rem', cursor: 'pointer', fontWeight: 'bold',
              display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
              opacity: 0.6
            }}
          >
            <RefreshCw size={12} /> إعادة تهيئة قاعدة البيانات
          </button>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          بقالة حضرموت &copy; {new Date().getFullYear()} - جميع الحقوق محفوظة
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
