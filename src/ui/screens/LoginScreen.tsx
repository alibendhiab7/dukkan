// src/ui/screens/LoginScreen.tsx
import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { strings } from '../../i18n';
import { Lock, Store, User } from 'lucide-react';

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

  return (
    <div className="login-screen" style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      background: 'var(--background)',
      padding: '1.5rem 1rem',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <style>{`
        .login-screen {
          --login-bg: var(--background);
          --login-surface: var(--surface);
          --login-surface-glass: rgba(255, 255, 255, 0.08);
          --login-text: var(--text);
          --login-text-muted: var(--text-muted);
          --login-text-light: var(--text-light);
          --login-primary: var(--primary);
          --login-primary-light: var(--primary-light);
          --login-primary-lighter: var(--primary-lighter);
          --login-secondary: var(--secondary);
          --login-border: var(--border);
          --login-success: var(--success);
        }
        [data-theme="dark"] .login-screen {
          --login-bg: var(--background);
          --login-surface: var(--surface);
          --login-surface-glass: rgba(255, 255, 255, 0.05);
          --login-text: var(--text);
          --login-text-muted: var(--text-muted);
          --login-text-light: var(--text-light);
          --login-primary: var(--primary);
          --login-primary-light: var(--primary-light);
          --login-primary-lighter: var(--primary-lighter);
          --login-secondary: var(--secondary);
          --login-border: var(--border);
          --login-success: var(--success);
        }
        .login-screen .login-glow-green {
          background: radial-gradient(circle, rgba(var(--login-primary-rgb, 16, 185, 129), 0.12) 0%, transparent 70%);
        }
        .login-screen .login-glow-orange {
          background: radial-gradient(circle, rgba(var(--login-secondary-rgb, 245, 158, 11), 0.08) 0%, transparent 70%);
        }
        .login-screen .login-logo-icon {
          background: linear-gradient(135deg, var(--login-primary) 0%, var(--login-primary-light) 100%);
          box-shadow: 0 8px 32px rgba(var(--login-primary-rgb, 16, 185, 129), 0.4);
        }
        .login-screen .login-title {
          color: var(--login-text);
        }
        .login-screen .login-subtitle {
          color: var(--login-primary);
        }
        .login-screen .login-description {
          color: var(--login-text-muted);
        }
        .login-screen .login-form {
          background: var(--login-surface-glass);
          border: 1px solid var(--login-border);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
        }
        .login-screen .login-label {
          color: var(--login-text-muted);
        }
        .login-screen .login-input {
          background: var(--login-surface);
          border: 1px solid var(--login-border);
          color: var(--login-text);
        }
        .login-screen .login-input:focus {
          border-color: var(--login-primary);
          box-shadow: 0 0 0 3px var(--login-primary-lighter);
        }
        .login-screen .login-input::placeholder {
          color: var(--login-text-muted);
        }
        .login-screen .login-icon {
          color: var(--login-text-muted);
        }
        .login-screen .login-btn {
          background: linear-gradient(135deg, var(--login-primary) 0%, var(--login-primary-light) 100%);
          color: var(--login-text-light);
          box-shadow: 0 8px 24px rgba(var(--login-primary-rgb, 16, 185, 129), 0.35);
        }
        .login-screen .login-btn:hover {
          opacity: 0.95;
          transform: translateY(-1px);
        }
        .login-screen .login-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }
        .login-screen .login-error {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.25);
          color: var(--danger);
        }
      `}</style>

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
          <div className="login-logo-icon" style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: '120px', height: 'auto', borderRadius: '22px',
            marginBottom: '1.25rem',
            position: 'relative',
          }}>
            <img src="/favicon.svg" alt="دكّان" style={{ width: '100%', height: 'auto' }} />
          </div>
          <h1 className="login-title" style={{ fontSize: '2rem', fontWeight: '900', letterSpacing: '-0.025em', marginBottom: '0.2rem' }}>
            دكّان
          </h1>
          <p className="login-subtitle" style={{ fontSize: '0.78rem', fontWeight: '700', letterSpacing: '0.08em', marginBottom: '0.3rem' }}>DUKKAN</p>
          <p className="login-description" style={{ fontSize: '0.82rem', fontWeight: '500' }}>نظام سحابي متكامل لإدارة نقاط البيع والمخازن</p>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="login-error" style={{
            padding: '0.85rem 1.25rem', borderRadius: 'var(--radius-md)',
            marginBottom: '1.5rem', fontSize: '0.85rem', fontWeight: '600',
            textAlign: 'center',
          }}>
            {error}
          </div>
        )}

        {/* Manual Form */}
        <form onSubmit={handleSubmit} className="login-form" style={{
          borderRadius: '24px', padding: '1.75rem',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
        }}>
          <div className="input-group">
            <label className="login-label input-label" style={{ fontSize: '0.75rem' }}>{strings.auth.tenantLabel}</label>
            <div style={{ position: 'relative' }}>
              <input type="text" className="login-input input-field" placeholder={strings.auth.tenantPlaceholder}
                value={storeCode} onChange={(e) => { clearError(); setStoreCode(e.target.value); }}
                disabled={isLoading}
                style={{
                  width: '100%', paddingRight: '2.5rem',
                  borderRadius: '12px', outline: 'none'
                }} />
              <Store size={16} style={{ position: 'absolute', right: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            </div>
          </div>

          <div className="input-group">
            <label className="login-label input-label" style={{ fontSize: '0.75rem' }}>{strings.auth.usernameLabel}</label>
            <div style={{ position: 'relative' }}>
              <input type="text" className="login-input input-field" placeholder={strings.auth.usernamePlaceholder}
                value={username} onChange={(e) => { clearError(); setUsername(e.target.value); }}
                disabled={isLoading}
                style={{
                  width: '100%', paddingRight: '2.5rem',
                  borderRadius: '12px', outline: 'none'
                }} />
              <User size={16} style={{ position: 'absolute', right: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            </div>
          </div>

          <div className="input-group" style={{ marginBottom: '1.5rem' }}>
            <label className="login-label input-label" style={{ fontSize: '0.75rem' }}>{strings.auth.passwordLabel}</label>
            <div style={{ position: 'relative' }}>
              <input type="password" className="login-input input-field" placeholder="••••••"
                value={password} onChange={(e) => { clearError(); setPassword(e.target.value); }}
                disabled={isLoading}
                style={{
                  width: '100%', paddingRight: '2.5rem',
                  borderRadius: '12px', outline: 'none'
                }} />
              <Lock size={16} style={{ position: 'absolute', right: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            </div>
          </div>

          <button type="submit" disabled={isLoading} className="login-btn"
            style={{
              width: '100%', padding: '0.9rem', border: 'none', borderRadius: '12px',
              fontWeight: '800', fontSize: '0.95rem', cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {isLoading ? strings.common.loading : strings.auth.loginButton}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginScreen;
