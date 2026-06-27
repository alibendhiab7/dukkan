// src/ui/tabs/StoreSupportTab.tsx
import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../core/api/client';
import { LifeBuoy, Plus, Clock, MessageSquare, AlertCircle, RefreshCw, X } from 'lucide-react';

const StoreSupportTab: React.FC = () => {
  const { tenant } = useAuthStore();
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Create ticket states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newPriority, setNewPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [newMessage, setNewMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // View ticket details states
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);

  const fetchTickets = async () => {
    if (!tenant) return;
    setLoading(true);
    try {
      const list = await api.support.tickets.getAll(tenant.id);
      setTickets(list);
    } catch (e) {
      console.error('Error fetching support tickets:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [tenant]);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant || !newTitle || !newMessage) return;
    
    setIsSubmitting(true);
    try {
      const ticketId = 'tk_' + Date.now().toString().slice(-6);
      await api.support.tickets.create({
        id: ticketId,
        tenant_id: tenant.id,
        title: newTitle,
        priority: newPriority,
        description: newMessage,
        status: 'open',
        response: '',
        created_at: new Date().toISOString()
      });

      setShowCreateModal(false);
      setNewTitle('');
      setNewPriority('medium');
      setNewMessage('');
      
      await fetchTickets();
      alert('تم فتح تذكرة الدعم الفني بنجاح! سيقوم فريق الدعم بمراجعتها والرد في أقرب وقت.');
    } catch (e) {
      console.error(e);
      alert('فشل فتح التذكرة، يرجى المحاولة لاحقاً');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!tenant) return <div style={{ padding: '2rem', textAlign: 'center' }}>الرجاء تسجيل الدخول أولاً</div>;

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', direction: 'rtl' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ color: 'var(--primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <LifeBuoy size={24} />
            <span>تذاكر الدعم الفني والملاحظات</span>
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0.25rem 0 0' }}>
            تواصل مع إدارة المنصة مباشرة لحل المشاكل الفنية، رفع الملاحظات، أو طلب تعديلات
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            onClick={fetchTickets} 
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 0.85rem', borderRadius: '8px' }}
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            تحديث
          </button>
          
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary"
            style={{ border: 'none', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <Plus size={18} />
            تذكرة جديدة
          </button>
        </div>
      </div>

      {/* Stats Summary Widgets */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: 'var(--primary-lighter)', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
            <LifeBuoy size={22} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>إجمالي التذاكر</span>
            <p style={{ fontSize: '1.4rem', fontWeight: '900', margin: 0 }}>{tickets.length}</p>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', color: 'var(--danger)' }}>
            <AlertCircle size={22} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>قيد المراجعة / مفتوحة</span>
            <p style={{ fontSize: '1.4rem', fontWeight: '900', margin: 0, color: 'var(--danger)' }}>
              {tickets.filter(t => t.status === 'open' || t.status === 'in_progress').length}
            </p>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: 'rgba(5, 161, 127, 0.1)', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', color: 'var(--success)' }}>
            <MessageSquare size={22} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>تم حلها</span>
            <p style={{ fontSize: '1.4rem', fontWeight: '900', margin: 0, color: 'var(--success)' }}>
              {tickets.filter(t => t.status === 'resolved').length}
            </p>
          </div>
        </div>
      </div>

      {/* Tickets List */}
      <div className="card">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>جاري تحميل تذاكر الدعم...</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--surface-hover)', borderBottom: '2px solid var(--border)' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>رقم التذكرة</th>
                  <th style={{ padding: '0.75rem 1rem' }}>العنوان والمشكلة</th>
                  <th style={{ padding: '0.75rem 1rem' }}>الأولوية</th>
                  <th style={{ padding: '0.75rem 1rem' }}>تاريخ الفتح</th>
                  <th style={{ padding: '0.75rem 1rem' }}>الحالة</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((tk) => (
                  <tr key={tk.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace' }}>#{tk.id.replace('tk_', '')}</td>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 'bold' }}>{tk.title}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span className={`badge ${
                        tk.priority === 'high' ? 'badge-danger' :
                        tk.priority === 'medium' ? 'badge-warning' : 'badge-info'
                      }`} style={{ fontSize: '0.7rem' }}>
                        {tk.priority === 'high' ? 'عالية' :
                         tk.priority === 'medium' ? 'متوسطة' : 'منخفضة'}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>{new Date(tk.created_at || Date.now()).toLocaleDateString('ar-YE')}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span className={`badge ${
                        tk.status === 'resolved' ? 'badge-success' :
                        tk.status === 'open' ? 'badge-danger' : 'badge-secondary'
                      }`} style={{ fontSize: '0.7rem' }}>
                        {tk.status === 'resolved' ? 'تم الحل' :
                         tk.status === 'open' ? 'مفتوحة' : 'قيد المعالجة'}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>
                      <button
                        onClick={() => setSelectedTicket(tk)}
                        className="btn btn-secondary"
                        style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', borderRadius: '6px' }}
                      >
                        عرض التفاصيل والردود
                      </button>
                    </td>
                  </tr>
                ))}
                {tickets.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>لا توجد أي تذاكر دعم فني مرفوعة حالياً.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE TICKET MODAL */}
      {showCreateModal && (
        <div className="modal-backdrop" onClick={() => setShowCreateModal(false)} style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)'
        }}>
          <div className="card animate-scale-up" onClick={(e) => e.stopPropagation()} style={{
            width: '95%', maxWidth: '520px', padding: '1.75rem', gap: '1.25rem',
            borderRadius: '16px', boxShadow: 'var(--shadow-lg)', backgroundColor: 'var(--surface)', color: 'var(--text)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <LifeBuoy size={22} style={{ color: 'var(--primary)' }} />
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 'bold' }}>فتح تذكرة دعم فني جديدة</h3>
              </div>
              <button onClick={() => setShowCreateModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateTicket} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="input-group">
                <label className="input-label">عنوان المشكلة أو الملاحظة</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="اكتب عنواناً مختصراً للمشكلة..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div className="input-group">
                <label className="input-label">أهمية المشكلة ومدى تأثيرها</label>
                <select
                  className="input-field"
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value as any)}
                  disabled={isSubmitting}
                >
                  <option value="low">منخفضة (استفسار أو اقتراح عادي)</option>
                  <option value="medium">متوسطة (مشكلة في إحدى الميزات لا توقف العمل)</option>
                  <option value="high">عالية (عطل يعرقل العمليات أو المبيعات)</option>
                </select>
              </div>

              <div className="input-group">
                <label className="input-label">الشرح والتفاصيل الكاملة</label>
                <textarea
                  className="input-field"
                  placeholder="يرجى كتابة شرح وافٍ للمشكلة مع ذكر تفاصيل الخطوات للوصول لها..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  style={{ minHeight: '120px', resize: 'vertical' }}
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', fontWeight: 'bold', border: 'none' }}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'جاري فتح التذكرة...' : 'إرسال التذكرة للإدارة'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn btn-secondary"
                  style={{ padding: '0.75rem 1.25rem', borderRadius: '8px', border: '1px solid var(--border)' }}
                  disabled={isSubmitting}
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW TICKET DETAILS MODAL */}
      {selectedTicket && (
        <div className="modal-backdrop" onClick={() => setSelectedTicket(null)} style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)'
        }}>
          <div className="card animate-scale-up" onClick={(e) => e.stopPropagation()} style={{
            width: '95%', maxWidth: '600px', padding: '1.75rem', gap: '1.25rem',
            borderRadius: '16px', boxShadow: 'var(--shadow-lg)', backgroundColor: 'var(--surface)', color: 'var(--text)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <LifeBuoy size={22} style={{ color: 'var(--primary)' }} />
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 'bold' }}>تفاصيل تذكرة الدعم الفني</h3>
              </div>
              <button onClick={() => setSelectedTicket(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              {/* Ticket Meta */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', fontSize: '0.8rem', backgroundColor: 'var(--surface-hover)', padding: '0.75rem 1rem', borderRadius: '8px' }}>
                <div><strong>رقم التذكرة:</strong> <span style={{ fontFamily: 'monospace' }}>#{selectedTicket.id.replace('tk_', '')}</span></div>
                <div style={{ marginRight: 'auto' }}>
                  <span className={`badge ${
                    selectedTicket.priority === 'high' ? 'badge-danger' :
                    selectedTicket.priority === 'medium' ? 'badge-warning' : 'badge-info'
                  }`}>الأهمية: {selectedTicket.priority === 'high' ? 'عالية' : selectedTicket.priority === 'medium' ? 'متوسطة' : 'منخفضة'}</span>
                </div>
                <div>
                  <span className={`badge ${
                    selectedTicket.status === 'resolved' ? 'badge-success' :
                    selectedTicket.status === 'open' ? 'badge-danger' : 'badge-secondary'
                  }`}>الحالة: {selectedTicket.status === 'resolved' ? 'تم الحل' : selectedTicket.status === 'open' ? 'مفتوحة' : 'قيد المعالجة'}</span>
                </div>
              </div>

              {/* Title & Message */}
              <div>
                <h4 style={{ margin: '0 0 0.5rem 0', fontWeight: 'bold', fontSize: '1rem', color: 'var(--text)' }}>
                  {selectedTicket.title}
                </h4>
                <div style={{
                  backgroundColor: 'var(--background)',
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                  padding: '1rem',
                  fontSize: '0.85rem',
                  lineHeight: '1.6',
                  whiteSpace: 'pre-wrap',
                  color: 'var(--text-dark)'
                }}>
                  {selectedTicket.description}
                </div>
              </div>

              {/* Reply / Response Section */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                <h5 style={{ margin: '0 0 0.5rem 0', fontWeight: 'bold', fontSize: '0.9rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <MessageSquare size={16} />
                  <span>رد إدارة دكّان:</span>
                </h5>
                {selectedTicket.response ? (
                  <div style={{
                    backgroundColor: '#f0fdf4',
                    border: '1.5px solid #bbf7d0',
                    borderRadius: '10px',
                    padding: '1rem',
                    fontSize: '0.85rem',
                    lineHeight: '1.6',
                    whiteSpace: 'pre-wrap',
                    color: '#166534'
                  }}>
                    {selectedTicket.response}
                  </div>
                ) : (
                  <div style={{
                    textAlign: 'center',
                    padding: '1.5rem',
                    color: 'var(--text-muted)',
                    fontSize: '0.85rem',
                    backgroundColor: 'var(--surface-hover)',
                    borderRadius: '10px',
                    border: '1px dashed var(--border)'
                  }}>
                    لا يوجد رد من الإدارة حتى الآن. يرجى الانتظار، جاري مراجعة التذكرة من قبل فريق الدعم الفني.
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button
                  onClick={() => setSelectedTicket(null)}
                  className="btn btn-secondary"
                  style={{ padding: '0.6rem 1.5rem', borderRadius: '8px', fontWeight: 'bold' }}
                >
                  إغلاق النافذة
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default StoreSupportTab;
