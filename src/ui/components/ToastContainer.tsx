import React from 'react';
import { useToastStore } from '../../store/toastStore';
import { CheckCircle, AlertTriangle, XCircle, Info, X } from 'lucide-react';

const toastConfig = {
  success: { icon: CheckCircle, bgColor: 'hsl(142, 69%, 92%)', borderColor: 'var(--success)', color: 'var(--success)' },
  error: { icon: XCircle, bgColor: 'hsl(0, 84%, 95%)', borderColor: 'var(--danger)', color: 'var(--danger)' },
  warning: { icon: AlertTriangle, bgColor: 'hsl(38, 92%, 92%)', borderColor: 'var(--warning)', color: 'var(--warning)' },
  info: { icon: Info, bgColor: 'hsl(210, 100%, 95%)', borderColor: 'var(--primary)', color: 'var(--primary)' },
};

const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      top: '1rem',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: '0.5rem',
      minWidth: '320px',
      maxWidth: '480px',
    }}>
      {toasts.map((toast) => {
        const config = toastConfig[toast.type];
        const Icon = config.icon;
        return (
          <div
            key={toast.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.85rem 1rem',
              backgroundColor: config.bgColor,
              borderRight: `4px solid ${config.borderColor}`,
              borderRadius: '10px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
              animation: 'toastSlideIn 0.35s cubic-bezier(0.21, 1.02, 0.73, 1)',
              cursor: 'pointer',
            }}
            onClick={() => removeToast(toast.id)}
          >
            <Icon size={20} style={{ color: config.color, flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-dark)' }}>
              {toast.message}
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); removeToast(toast.id); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.15rem', display: 'flex', color: 'var(--text-muted)' }}
            >
              <X size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default ToastContainer;
