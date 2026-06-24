import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';
import { costRepo } from '../../core/repositories/sqlite';
import type { FinancialCost } from '../../core/repositories/interfaces';
import { strings } from '../../i18n';
import { Plus, Edit2, Trash2, DollarSign, Filter } from 'lucide-react';

const costCategories = [
  { value: 'rent', label: 'إيجار' },
  { value: 'salary', label: 'رواتب' },
  { value: 'utilities', label: 'مرافق (كهرباء/ماء)' },
  { value: 'transport', label: 'نقل وشحن' },
  { value: 'marketing', label: 'تسويق' },
  { value: 'maintenance', label: 'صيانة' },
  { value: 'supplies', label: 'مستلزمات' },
  { value: 'other', label: 'أخرى' },
];

const FinancialCostsTab: React.FC = () => {
  const { tenant, user, hasPermission } = useAuthStore();
  const { addToast } = useToastStore();
  const [costs, setCosts] = useState<FinancialCost[]>([]);
  const [filteredCosts, setFilteredCosts] = useState<FinancialCost[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingCost, setEditingCost] = useState<FinancialCost | null>(null);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [formData, setFormData] = useState({ category: 'rent', description: '', amount: '', cost_date: '' });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (tenant) loadCosts();
  }, [tenant]);

  useEffect(() => {
    if (categoryFilter === 'all') {
      setFilteredCosts(costs);
    } else {
      setFilteredCosts(costs.filter(c => c.category === categoryFilter));
    }
  }, [costs, categoryFilter]);

  const loadCosts = async () => {
    if (!tenant) return;
    const data = await costRepo.getAll(tenant.id);
    setCosts(data);
  };

  const openAddModal = () => {
    setEditingCost(null);
    setFormData({ category: 'rent', description: '', amount: '', cost_date: new Date().toISOString().split('T')[0] });
    setShowModal(true);
  };

  const openEditModal = (c: FinancialCost) => {
    setEditingCost(c);
    setFormData({ category: c.category, description: c.description, amount: c.amount.toString(), cost_date: c.cost_date });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant || !user || !formData.description || !formData.amount || !formData.cost_date) {
      addToast('error', 'الرجاء تعبئة كافة الحقول المطلوبة');
      return;
    }
    setIsLoading(true);
    try {
      const costData = {
        category: formData.category,
        description: formData.description,
        amount: parseFloat(formData.amount),
        currency: 'SAR',
        cost_date: formData.cost_date,
        created_by: user.username,
      };

      if (editingCost) {
        await costRepo.update({ ...editingCost, ...costData });
        addToast('success', 'تم تعديل التكلفة بنجاح');
      } else {
        const id = 'cost_' + crypto.randomUUID().replace(/-/g, '').slice(0, 12);
        await costRepo.create({
          id,
          tenant_id: tenant.id,
          created_at: new Date().toISOString(),
          ...costData,
        });
        addToast('success', 'تم إضافة التكلفة بنجاح');
      }
      setShowModal(false);
      await loadCosts();
    } catch (err) {
      addToast('error', 'حدث خطأ أثناء حفظ التكلفة');
    }
    setIsLoading(false);
  };

  const handleDelete = async (c: FinancialCost) => {
    if (!tenant || !window.confirm('هل أنت متأكد من حذف هذه التكلفة؟')) return;
    await costRepo.delete(c.id, tenant.id);
    addToast('success', 'تم حذف التكلفة بنجاح');
    await loadCosts();
  };

  const totalCosts = filteredCosts.reduce((sum, c) => sum + c.amount, 0);

  const getCategoryLabel = (cat: string) => costCategories.find(c => c.value === cat)?.label || cat;

  const categoryTotals = costCategories.map(c => ({
    ...c,
    total: costs.filter(cost => cost.category === c.value).reduce((sum, cost) => sum + cost.amount, 0),
  })).filter(c => c.total > 0).sort((a, b) => b.total - a.total);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ color: 'var(--primary)' }}>{strings.reports.financialCosts}</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>تسجيل ومتابعة التكاليف التشغيلية للمتجر</p>
        </div>
        {hasPermission('costs.add') && (
          <button onClick={openAddModal} className="btn btn-primary" style={{ border: 'none' }}>
            <Plus size={18} />
            <span>{strings.reports.addCost}</span>
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
        <div className="card" style={{ borderRight: '4px solid var(--primary)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>{strings.reports.totalCosts}</span>
            <DollarSign size={20} style={{ color: 'var(--primary)' }} />
          </div>
          <h3 style={{ fontSize: '1.4rem', color: 'var(--primary)' }}>{totalCosts.toFixed(2)} <span style={{ fontSize: '0.8rem' }}>ر.س</span></h3>
        </div>
        {categoryTotals.slice(0, 4).map(c => (
          <div key={c.value} className="card">
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '700' }}>{c.label}</span>
            <h3 style={{ fontSize: '1.2rem', marginTop: '0.25rem' }}>{c.total.toFixed(2)} <span style={{ fontSize: '0.7rem' }}>ر.س</span></h3>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        <Filter size={16} style={{ color: 'var(--text-muted)' }} />
        <select
          className="input-field"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          style={{ width: 'auto', padding: '0.5rem 1rem' }}
        >
          <option value="all">{strings.common.all}</option>
          {costCategories.map(c => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </div>

      <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border)', backgroundColor: 'var(--surface-hover)' }}>
              <th style={{ padding: '1rem' }}>الفئة</th>
              <th style={{ padding: '1rem' }}>الوصف</th>
              <th style={{ padding: '1rem' }}>المبلغ</th>
              <th style={{ padding: '1rem' }}>التاريخ</th>
              <th style={{ padding: '1rem' }}>بواسطة</th>
              <th style={{ padding: '1rem', textAlign: 'left' }}>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {filteredCosts.map(c => (
              <tr key={c.id} className="table-row-hover" style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '1rem' }}>
                  <span className="badge badge-info">{getCategoryLabel(c.category)}</span>
                </td>
                <td style={{ padding: '1rem' }}>{c.description}</td>
                <td style={{ padding: '1rem', fontWeight: 'bold', color: 'var(--danger)' }}>{c.amount.toFixed(2)} ر.س</td>
                <td style={{ padding: '1rem' }}>{new Date(c.cost_date).toLocaleDateString('ar-YE')}</td>
                <td style={{ padding: '1rem' }}>{c.created_by}</td>
                <td style={{ padding: '1rem', textAlign: 'left' }}>
                  <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                    {hasPermission('costs.edit') && (
                      <button onClick={() => openEditModal(c)} className="btn btn-secondary" style={{ padding: '0.35rem 0.5rem', fontSize: '0.75rem', borderRadius: '6px' }}>
                        <Edit2 size={14} />
                      </button>
                    )}
                    {hasPermission('costs.delete') && (
                      <button onClick={() => handleDelete(c)} className="btn btn-danger" style={{ padding: '0.35rem 0.5rem', fontSize: '0.75rem', borderRadius: '6px', border: 'none' }}>
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filteredCosts.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>{strings.common.noData}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '440px', padding: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
              <h3>{editingCost ? 'تعديل التكلفة' : strings.reports.addCost}</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: 'var(--text-muted)' }}>&times;</button>
            </div>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="input-group">
                <label className="input-label">{strings.reports.costCategory}</label>
                <select className="input-field" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}>
                  {costCategories.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div className="input-group">
                <label className="input-label">{strings.reports.costDescription}</label>
                <input type="text" className="input-field" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="input-group">
                  <label className="input-label">{strings.reports.costAmount} (ر.س)</label>
                  <input type="number" step="0.01" className="input-field" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} required />
                </div>
                <div className="input-group">
                  <label className="input-label">{strings.reports.costDate}</label>
                  <input type="date" className="input-field" value={formData.cost_date} onChange={(e) => setFormData({ ...formData, cost_date: e.target.value })} required />
                </div>
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
    </div>
  );
};

export default FinancialCostsTab;
