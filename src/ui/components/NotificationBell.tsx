import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuthStore } from '../../store/authStore';
import { useNotificationStore } from '../../store/notificationStore';
import { Bell, Check, Trash2, X } from 'lucide-react';

const NotificationBell: React.FC = () => {
  const { tenant } = useAuthStore();
  const { notifications, unreadCount, loadNotifications, markAsRead, markAllAsRead, deleteNotification } = useNotificationStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);
  const [btnRect, setBtnRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (tenant) loadNotifications(tenant.id);
  }, [tenant, loadNotifications]);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const handleToggle = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!isOpen) {
      setBtnRect(e.currentTarget.getBoundingClientRect());
    }
    setIsOpen(!isOpen);
  };

  const typeColors: Record<string, string> = {
    success: 'var(--success)',
    warning: 'var(--warning)',
    info: 'var(--primary)',
    danger: 'var(--danger)',
  };
  const typeBg: Record<string, string> = {
    success: 'rgba(5,161,127,0.08)',
    warning: 'rgba(245,158,11,0.08)',
    info: 'rgba(5,161,127,0.08)',
    danger: 'rgba(239,68,68,0.08)',
  };

  const dropdown = (
    <>
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 9998, backgroundColor: isMobile ? 'rgba(0,0,0,0.35)' : 'transparent' }}
        onClick={() => setIsOpen(false)}
      />
      <div style={isMobile ? {
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        width: '100%',
        maxHeight: '70vh',
        borderRadius: '20px 20px 0 0',
        border: 'none',
        borderTop: '1px solid var(--border)',
        zIndex: 9999,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--surface)',
        boxShadow: '0 -4px 24px rgba(0,0,0,0.15)',
      } : {
        position: 'fixed',
        top: btnRect ? btnRect.bottom + 8 : 60,
        right: btnRect ? window.innerWidth - btnRect.right : 100,
        width: '360px',
        maxHeight: '480px',
        borderRadius: '16px',
        border: '1px solid var(--border)',
        zIndex: 9999,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--surface)',
        boxShadow: 'var(--shadow-lg)',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: isMobile ? '1.25rem 1rem 0.75rem' : '0.85rem 1rem',
          borderBottom: '1px solid var(--border)',
          backgroundColor: 'var(--background)',
          flexShrink: 0,
        }}>
          {isMobile && (
            <div style={{
              position: 'absolute', top: '0.5rem', left: '50%', transform: 'translateX(-50%)',
              width: '36px', height: '4px', borderRadius: '2px', backgroundColor: 'var(--border)',
            }} />
          )}
          <span style={{ fontWeight: '800', fontSize: '0.9rem', color: 'var(--text-dark)' }}>
            الإشعارات {unreadCount > 0 && `(${unreadCount})`}
          </span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {unreadCount > 0 && (
              <button
                onClick={() => tenant && markAllAsRead(tenant.id)}
                style={{
                  background: 'none', border: 'none', color: 'var(--primary)',
                  cursor: 'pointer', fontSize: '0.75rem', fontWeight: '700',
                  display: 'flex', alignItems: 'center', gap: '0.25rem',
                }}
              >
                <Check size={14} />
                <span>تعيين الكل كمقروء</span>
              </button>
            )}
            <button
              onClick={() => setIsOpen(false)}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.2rem' }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* List */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {notifications.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              لا توجد إشعارات
            </div>
          ) : (
            notifications.map(n => (
              <div
                key={n.id}
                onClick={() => { if (!n.is_read && tenant) markAsRead(n.id, tenant.id); }}
                style={{
                  display: 'flex',
                  gap: '0.75rem',
                  padding: isMobile ? '1rem' : '0.85rem 1rem',
                  borderBottom: '1px solid var(--border)',
                  cursor: n.is_read ? 'default' : 'pointer',
                  backgroundColor: n.is_read ? 'transparent' : typeBg[n.type] || 'transparent',
                }}
              >
                <div style={{
                  width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0, marginTop: '0.4rem',
                  backgroundColor: n.is_read ? 'var(--border)' : typeColors[n.type] || 'var(--primary)',
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '0.85rem', fontWeight: n.is_read ? '600' : '800', color: 'var(--text-dark)', marginBottom: '0.2rem' }}>
                    {n.title}
                  </p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                    {n.message}
                  </p>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                    {new Date(n.created_at).toLocaleString('ar-YE', { dateStyle: 'short', timeStyle: 'short' })}
                  </span>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); tenant && deleteNotification(n.id, tenant.id); }}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.3rem', flexShrink: 0, opacity: 0.5 }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={handleToggle}
        style={{
          background: 'none', border: 'none', color: 'var(--text)',
          cursor: 'pointer', position: 'relative', padding: '0.4rem',
          borderRadius: '8px', display: 'flex', alignItems: 'center',
        }}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: '-2px', right: '-2px',
            backgroundColor: 'var(--danger)', color: '#fff',
            fontSize: '0.6rem', fontWeight: '800', width: '18px', height: '18px',
            borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid var(--surface)',
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
      {isOpen && createPortal(dropdown, document.body)}
    </div>
  );
};

export default NotificationBell;
