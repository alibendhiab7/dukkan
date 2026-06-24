import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';
import { customerRepo, salesRepo } from '../../core/repositories/sqlite';
import type { Customer, Sale } from '../../core/repositories/interfaces';
import { strings } from '../../i18n';
import { Plus, Edit2, Trash2, Search, Phone, Mail, MapPin, History } from 'lucide-react';

const CustomersTab: React.FC = () => {
  const { tenant, hasPermission } = useAuthStore();
  const { addToast } = useToastStore();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState({ name: '', phone: '', email: '', address: '' });
  const [isLoading, setIsLoading] = useState(false);

  // Purchase history
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyTarget, setHistoryTarget] = useState<Customer | null>(null);
  const [purchaseHistory, setPurchaseHistory] = useState<Sale[]>([]);
  const [totalSpent, setTotalSpent] = useState(0);

  useEffect(() => {
    if (tenant) loadCustomers();
  }, [tenant]);

  const loadCustomers = async () => {
    if (!tenant) return;
    const data = await customerRepo.getAll(tenant.id);
    setCustomers(data);
  };

  const filteredCustomers = customers.filter(c =>
    c.name.includes(searchQuery) || c.phone.includes(searchQuery)
  );

  const openAddModal = () => {
    setEditingCustomer(null);
    setFormData({ name: '', phone: '', email: '', address: '' });
    setShowModal(true);
  };

  const openEditModal = (c: Customer) => {
    setEditingCustomer(c);
    setFormData({ name: c.name, phone: c.phone, email: c.email || '', address: c.address || '' });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant || !formData.name || !formData.phone) {
      addToast('error', 'الرجاء تعبئة الاسم ورقم الهاتف');
      return;
    }
    setIsLoading(true);
    try {
      if (editingCustomer) {
        await customerRepo.update({ ...editingCustomer, ...formData });
        addToast('success', `تم تعديل بيانات العميل "${formData.name}" بنجاح`);
      } else {
        const id = 'cust_' + crypto.randomUUID().replace(/-/g, '').slice(0, 12);
        await customerRepo.create({
          id,
          tenant_id: tenant.id,
          name: formData.name,
          phone: formData.phone,
          email: formData.email || undefined,
          address: formData.address || undefined,
          loyalty_points: 0,
          created_at: new Date().toISOString(),
        });
        addToast('success', `تم إضافة العميل "${formData.name}" بنجاح`);
      }
      setShowModal(false);
      await loadCustomers();
    } catch (err) {
      addToast('error', 'حدث خطأ أثناء حفظ بيانات العميل');
    }
    setIsLoading(false);
  };

  const handleDelete = async (c: Customer) => {
    if (!tenant || !window.confirm(`هل أنت متأكد من حذف العميل "${c.name}"؟`)) return;
    await customerRepo.delete(c.id, tenant.id);
    addToast('success', `تم حذف العميل "${c.name}" بنجاح`);
    await loadCustomers();
  };


  const openHistoryModal = async (c: Customer) => {
    if (!tenant) return;
    setHistoryTarget(c);
    const sales = await salesRepo.getAll(tenant.id);
    const customerSales = sales.filter(s => s.customer_id === c.id);
    setPurchaseHistory(customerSales);
    setTotalSpent(customerSales.reduce((sum, s) => sum + s.total, 0));
    setShowHistoryModal(true);
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ color: 'var(--primary)' }}>{strings.customers.title}</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>إدارة بيانات العملاء ونقاط الولاء</p>
        </div>
        {hasPermission('customers.add') && (
          <button onClick={openAddModal} className="btn btn-primary" style={{ border: 'none' }}>
            <Plus size={18} />
            <span>{strings.customers.addCustomer}</span>
          </button>
        )}
      </div>

      <div className="card" style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', position: 'relative' }}>
        <input
          type="text"
          className="input-field"
          placeholder={strings.customers.search}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ width: '100%', paddingRight: '2.5rem', border: '1px solid var(--border)' }}
        />
        <Search size={18} style={{ position: 'absolute', right: '1.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
        {filteredCustomers.map(c => (
          <div key={c.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h4 style={{ fontSize: '1rem', marginBottom: '0.25rem' }}>{c.name}</h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  <Phone size={12} />
                  <span>{c.phone}</span>
                </div>
                {c.email && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    <Mail size={12} />
                    <span>{c.email}</span>
                  </div>
                )}
                {c.address && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    <MapPin size={12} />
                    <span>{c.address}</span>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                <button onClick={() => openHistoryModal(c)} className="btn btn-secondary" style={{ padding: '0.35rem', fontSize: '0.75rem', borderRadius: '6px' }} title="سجل المشتريات">
                  <History size={14} />
                </button>
                {hasPermission('customers.edit') && (
                  <button onClick={() => openEditModal(c)} className="btn btn-secondary" style={{ padding: '0.35rem', fontSize: '0.75rem', borderRadius: '6px' }}>
                    <Edit2 size={14} />
                  </button>
                )}
                {hasPermission('customers.delete') && (
                  <button onClick={() => handleDelete(c)} className="btn btn-danger" style={{ padding: '0.35rem', fontSize: '0.75rem', borderRadius: '6px', border: 'none' }}>
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
        {filteredCustomers.length === 0 && (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            {strings.customers.noCustomers}
          </div>
        )}
      </div>

      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '440px', padding: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
              <h3>{editingCustomer ? strings.customers.editCustomer : strings.customers.addCustomer}</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: 'var(--text-muted)' }}>&times;</button>
            </div>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="input-group">
                <label className="input-label">{strings.customers.customerName}</label>
                <input type="text" className="input-field" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
              </div>
              <div className="input-group">
                <label className="input-label">{strings.customers.phone}</label>
                <input type="text" className="input-field" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} required />
              </div>
              <div className="input-group">
                <label className="input-label">{strings.customers.email}</label>
                <input type="email" className="input-field" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
              </div>
              <div className="input-group">
                <label className="input-label">{strings.customers.address}</label>
                <input type="text" className="input-field" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowModal(false)}>{strings.common.cancel}</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 2, border: 'none' }} disabled={isLoading}>
                  {isLoading ? strings.common.loading : strings.common.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Purchase History Modal */}
      {showHistoryModal && historyTarget && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '500px', padding: '1.75rem', maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <History size={18} /> سجل مشتريات - {historyTarget.name}
              </h3>
              <button onClick={() => setShowHistoryModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: 'var(--text-muted)' }}>&times;</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
              <div style={{ padding: '0.75rem', backgroundColor: 'var(--secondary-light)', borderRadius: '8px', textAlign: 'center' }}>
                <span style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--secondary-dark)' }}>{purchaseHistory.length}</span>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>فاتورة</p>
              </div>
              <div style={{ padding: '0.75rem', backgroundColor: 'hsl(142, 69%, 92%)', borderRadius: '8px', textAlign: 'center' }}>
                <span style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--success)' }}>{totalSpent.toFixed(0)}</span>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ر.س إجمالي</p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {purchaseHistory.length === 0 && (
                <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>لا توجد مشتريات مسجلة لهذا العميل</p>
              )}
              {purchaseHistory.map(s => (
                <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.65rem', backgroundColor: 'var(--background)', borderRadius: '6px' }}>
                  <div>
                    <code style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>{s.id.toUpperCase()}</code>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(s.created_at).toLocaleString('ar-YE')}</p>
                  </div>
                  <span style={{ fontWeight: '700', color: 'var(--success)' }}>{s.total.toFixed(2)} ر.س</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomersTab;
