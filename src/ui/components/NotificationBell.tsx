import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useNotificationStore } from '../../store/notificationStore';
import { Bell, Check, Trash2, X } from 'lucide-react';

const NotificationBell: React.FC = () => {
  const { tenant } = useAuthStore();
  const { notifications, unreadCount, loadNotifications, markAsRead, markAllAsRead, deleteNotification } = useNotificationStore();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (tenant) {
      loadNotifications(tenant.id);
    }
  }, [tenant, loadNotifications]);

  const typeColors: Record<string, string> = {
    success: 'var(--success)',
    warning: 'var(--warning)',
    info: 'var(--primary)',
    danger: 'var(--danger)',
  };

  const typeBg: Record<string, string> = {
    success: 'hsl(142, 69%, 92%)',
    warning: 'hsl(38, 92%, 92%)',
    info: 'hsl(210, 100%, 95%)',
    danger: 'hsl(0, 84%, 95%)',
  };

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--text-light)',
          cursor: 'pointer',
          position: 'relative',
          padding: '0.4rem',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute',
            top: '0',
            right: '0',
            backgroundColor: 'var(--danger)',
            color: 'white',
            fontSize: '0.6rem',
            fontWeight: '800',
            width: '18px',
            height: '18px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'pulseSoft 2s infinite',
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 998,
            }}
            onClick={() => setIsOpen(false)}
          />
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            width: '360px',
            maxHeight: '480px',
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-lg)',
            zIndex: 999,
            overflow: 'hidden',
            animation: 'fadeIn 0.2s ease',
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0.85rem 1rem',
              borderBottom: '1px solid var(--border)',
              backgroundColor: 'var(--background)',
            }}>
              <span style={{ fontWeight: '800', fontSize: '0.9rem', color: 'var(--text-dark)' }}>
                الإشعارات {unreadCount > 0 && `(${unreadCount})`}
              </span>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {unreadCount > 0 && (
                  <button
                    onClick={() => tenant && markAllAsRead(tenant.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--primary)',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      fontWeight: '700',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                    }}
                  >
                    <Check size={14} />
                    <span>تعيين الكل كمقروء</span>
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: '0.2rem',
                  }}
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div style={{ maxHeight: '380px', overflowY: 'auto' }}>
              {notifications.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  لا توجد إشعارات
                </div>
              ) : (
                notifications.map(n => (
                  <div
                    key={n.id}
                    onClick={() => !n.is_read && tenant && markAsRead(n.id, tenant.id)}
                    style={{
                      display: 'flex',
                      gap: '0.75rem',
                      padding: '0.85rem 1rem',
                      borderBottom: '1px solid var(--border)',
                      cursor: n.is_read ? 'default' : 'pointer',
                      backgroundColor: n.is_read ? 'transparent' : typeBg[n.type] || 'transparent',
                      transition: 'background 0.2s',
                    }}
                  >
                    <div style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: n.is_read ? 'var(--border)' : typeColors[n.type] || 'var(--primary)',
                      flexShrink: 0,
                      marginTop: '0.35rem',
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        fontSize: '0.8rem',
                        fontWeight: n.is_read ? '600' : '800',
                        color: 'var(--text-dark)',
                        marginBottom: '0.2rem',
                      }}>
                        {n.title}
                      </p>
                      <p style={{
                        fontSize: '0.75rem',
                        color: 'var(--text-muted)',
                        lineHeight: '1.4',
                      }}>
                        {n.message}
                      </p>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                        {new Date(n.created_at).toLocaleString('ar-YE', { dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        tenant && deleteNotification(n.id, tenant.id);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        padding: '0.2rem',
                        flexShrink: 0,
                        opacity: 0.5,
                      }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationBell;
