import React from 'react';
import { AlertTriangle, Info, CheckCircle, XCircle } from 'lucide-react';

type ConfirmType = 'danger' | 'warning' | 'info' | 'success';

interface ConfirmDialogProps {
  isOpen: boolean;
  type?: ConfirmType;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const typeConfig: Record<ConfirmType, { icon: React.FC<any>; bgColor: string; iconColor: string; btnClass: string }> = {
  danger: { icon: XCircle, bgColor: 'hsl(0, 84%, 95%)', iconColor: 'var(--danger)', btnClass: 'btn-danger' },
  warning: { icon: AlertTriangle, bgColor: 'hsl(38, 92%, 92%)', iconColor: 'var(--warning)', btnClass: 'btn-primary' },
  info: { icon: Info, bgColor: 'hsl(210, 100%, 95%)', iconColor: 'var(--primary)', btnClass: 'btn-primary' },
  success: { icon: CheckCircle, bgColor: 'hsl(142, 69%, 92%)', iconColor: 'var(--success)', btnClass: 'btn-primary' },
};

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen, type = 'danger', title, message,
  confirmText = 'تأكيد', cancelText = 'إلغاء',
  onConfirm, onCancel
}) => {
  if (!isOpen) return null;

  const config = typeConfig[type];
  const Icon = config.icon;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1001,
      animation: 'fadeIn 0.2s ease',
    }}>
      <div className="card animate-fade-in" style={{
        width: '100%', maxWidth: '400px', padding: '1.75rem',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem',
        textAlign: 'center',
      }}>
        <div style={{
          padding: '1rem', borderRadius: '50%',
          backgroundColor: config.bgColor,
          display: 'flex',
        }}>
          <Icon size={32} style={{ color: config.iconColor }} />
        </div>
        <h3 style={{ fontSize: '1.1rem', fontWeight: '800' }}>{title}</h3>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>{message}</p>
        <div style={{ display: 'flex', gap: '0.75rem', width: '100%', marginTop: '0.5rem' }}>
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onCancel}>{cancelText}</button>
          <button className={`btn ${config.btnClass}`} style={{ flex: 1, border: type === 'danger' ? 'none' : undefined }} onClick={onConfirm}>{confirmText}</button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;

// Hook for using confirm dialog
import { useState, useCallback } from 'react';

export function useConfirm() {
  const [config, setConfig] = useState<{
    isOpen: boolean;
    type: ConfirmType;
    title: string;
    message: string;
    confirmText: string;
    onConfirm: () => void;
  }>({ isOpen: false, type: 'danger', title: '', message: '', confirmText: 'تأكيد', onConfirm: () => {} });

  const confirm = useCallback((options: {
    type?: ConfirmType;
    title: string;
    message: string;
    confirmText?: string;
  }) => {
    return new Promise<boolean>((resolve) => {
      setConfig({
        isOpen: true,
        type: options.type || 'danger',
        title: options.title,
        message: options.message,
        confirmText: options.confirmText || 'تأكيد',
        onConfirm: () => { setConfig(prev => ({ ...prev, isOpen: false })); resolve(true); },
      });
    });
  }, []);

  const closeConfirm = useCallback(() => {
    setConfig(prev => ({ ...prev, isOpen: false }));
  }, []);

  return { config, confirm, closeConfirm };
}
