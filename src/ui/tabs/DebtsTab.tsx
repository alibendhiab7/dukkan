// src/ui/tabs/DebtsTab.tsx
import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useDebtStore } from '../../store/debtStore';
import type { CustomerDebt } from '../../store/debtStore';
import { useToastStore } from '../../store/toastStore';
import { 
  Search, Plus, History, User, DollarSign, FileText, ArrowUpRight, ArrowDownLeft, X, CheckCircle2, MessageSquare
} from 'lucide-react';


const DebtsTab: React.FC = () => {
  const { tenant, user, hasPermission } = useAuthStore();
  const { debts, logs, loadDebts, addDebt, reduceDebt, setDebt } = useDebtStore();
  const { addToast } = useToastStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeSubTab, setActiveSubTab] = useState<'list' | 'audit'>('list');

  // New debtor state
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustAmount, setNewCustAmount] = useState('');
  const [newCustNotes, setNewCustNotes] = useState('');

  // Transaction Modal (Add/Reduce/Set)
  const [showTxModal, setShowTxModal] = useState(false);
  const [txTargetCustomer, setTxTargetCustomer] = useState<CustomerDebt | null>(null);
  const [txType, setTxType] = useState<'add' | 'reduce' | 'set'>('reduce'); // reduce is payment
  const [txAmount, setTxAmount] = useState('');
  const [txNotes, setTxNotes] = useState('');

  // Single customer log modal
  const [showSingleLogModal, setShowSingleLogModal] = useState(false);
  const [logTargetCustomer, setLogTargetCustomer] = useState<CustomerDebt | null>(null);

  useEffect(() => {
    if (tenant) {
      loadDebts(tenant.id);
    }
  }, [tenant]);

  const normalizeArabic = (str: string): string => {
    return str
      .replace(/[\u064B-\u065F]/g, "")
      .replace(/[أإآ]/g, "ا")
      .replace(/ة/g, "ه")
      .replace(/ى/g, "ي");
  };

  // WhatsApp Claim Handler
  const handleShareWhatsApp = (customer: CustomerDebt) => {
    let phone = customer.phone?.trim();
    
    // Prompt to confirm or edit the phone number
    const promptMessage = phone 
      ? `رقم هاتف العميل الحالي للمطالبة هو (${phone}). لتعديله، أدخل الرقم الجديد هنا. أو اضغط موافق للمتابعة بالرقم الحالي:`
      : `لم يتم تسجيل رقم هاتف للعميل. الرجاء إدخال رقم الهاتف للمطالبة بالدين عبر الواتساب (مثال: 777123456):`;
       
    const enteredPhone = prompt(promptMessage, phone || "");
    
    if (enteredPhone === null) {
      return; // Clicked Cancel
    }
    
    const finalPhone = enteredPhone.trim();
    if (!finalPhone && !phone) {
      addToast('error', 'يجب إدخال رقم هاتف صالح لإتمام المطالبة');
      return;
    }
    
    // Save if it's new or changed
    if (finalPhone !== phone) {
      phone = finalPhone;
      if (tenant && user) {
        setDebt(tenant.id, customer.customerName, customer.amountYer, 'تحديث رقم الهاتف للمطالبة بالدين عبر الواتساب', user.username, finalPhone);
      }
    }
    
    if (!phone) return;

    // Clean and format the phone number
    let cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.startsWith('00967')) {
      cleanPhone = cleanPhone.substring(5);
    }
    // If it starts with 967, keep it, else format it
    if (!cleanPhone.startsWith('967')) {
      if (cleanPhone.startsWith('0')) {
        cleanPhone = cleanPhone.substring(1);
      }
      if (cleanPhone.length === 9 && cleanPhone.startsWith('7')) {
        cleanPhone = '967' + cleanPhone;
      }
    }
    
    if (cleanPhone.length < 9) {
      addToast('error', 'رقم الهاتف غير صالح، يرجى التأكد من كتابة الرقم بشكل صحيح');
      return;
    }
    
    const message = `السلام عليكم ورحمة الله وبركاته، العميل العزيز *${customer.customerName}* 🌸\n\nنود تذكيركم بالمديونية المستحقة عليكم لبقالة/محل *${tenant?.store_name || ''}*، وتفاصيلها كالتالي:\n💵 المبلغ المستحق: *${customer.amountYer.toLocaleString()} ريال يمني*\n📅 تاريخ التحديث: ${new Date(customer.updatedAt).toLocaleDateString('ar-YE')}\n\nنشكر لكم حسن تعاملكم وتعاونكم الدائم معنا. نسعد بخدمتكم في أي وقت.`;
    
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  // Add new customer manually
  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant || !user) return;
    if (!newCustName.trim()) {
      addToast('error', 'الرجاء إدخال اسم العميل');
      return;
    }
    const amount = parseFloat(newCustAmount) || 0;
    if (amount < 0) {
      addToast('error', 'المبلغ لا يمكن أن يكون سالباً');
      return;
    }

    const phoneVal = newCustPhone.trim() || undefined;

    // Set or add initial debt
    if (amount > 0) {
      addDebt(tenant.id, newCustName, amount, newCustNotes || 'رصيد مديونية افتتاحي', user.username, phoneVal);
    } else {
      setDebt(tenant.id, newCustName, 0, newCustNotes || 'رصيد مديونية افتتاحي (صفر)', user.username, phoneVal);
    }

    addToast('success', `تم تسجيل العميل "${newCustName}" بنجاح`);
    setShowAddCustomerModal(false);
    setNewCustName('');
    setNewCustPhone('');
    setNewCustAmount('');
    setNewCustNotes('');
  };

  // Record Transaction (Debt increase, Payment decrease, Set balance)
  const handleRecordTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant || !user || !txTargetCustomer) return;
    const amount = parseFloat(txAmount);
    if (isNaN(amount) || amount <= 0) {
      addToast('error', 'الرجاء إدخال مبلغ صحيح أكبر من صفر');
      return;
    }

    if (txType === 'add') {
      addDebt(tenant.id, txTargetCustomer.customerName, amount, txNotes, user.username);
      addToast('success', `تمت إضافة دين بقيمة ${amount.toLocaleString()} ر.ي للعميل`);
    } else if (txType === 'reduce') {
      reduceDebt(tenant.id, txTargetCustomer.customerName, amount, txNotes, user.username);
      addToast('success', `تم تسجيل تسديد بقيمة ${amount.toLocaleString()} ر.ي من العميل`);
    } else {
      setDebt(tenant.id, txTargetCustomer.customerName, amount, txNotes, user.username);
      addToast('success', `تم تعديل مديونية العميل لتصبح ${amount.toLocaleString()} ر.ي`);
    }

    setShowTxModal(false);
    setTxTargetCustomer(null);
    setTxAmount('');
    setTxNotes('');
  };

  // Filtering Debts list
  const filteredDebts = debts.filter(d => {
    if (searchQuery.trim() !== '') {
      const q = normalizeArabic(searchQuery.toLowerCase());
      const name = normalizeArabic(d.customerName.toLowerCase());
      return name.includes(q);
    }
    return true;
  });

  // Filtering general logs
  const filteredLogs = logs.filter(l => {
    if (searchQuery.trim() !== '') {
      const q = normalizeArabic(searchQuery.toLowerCase());
      const name = normalizeArabic(l.customerName.toLowerCase());
      const createdBy = normalizeArabic(l.createdBy.toLowerCase());
      const notes = normalizeArabic((l.notes || '').toLowerCase());
      return name.includes(q) || createdBy.includes(q) || notes.includes(q);
    }
    return true;
  });

  // Calculate Statistics
  const totalDebts = debts.reduce((sum, d) => sum + d.amountYer, 0);
  const activeDebtorsCount = debts.filter(d => d.amountYer > 0).length;
  const lastPaymentLog = logs.find(l => l.type === 'reduce');

  return (
    <div className="pos-layout-wrapper animate-fade-in" style={{ padding: '0.25rem' }}>
      
      {/* Upper Widgets (Summary) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '1rem',
        marginBottom: '1.5rem'
      }}>
        {/* Total Debts Card */}
        <div className="card" style={{
          background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(239, 68, 68, 0.02) 100%)',
          border: '1px solid rgba(239, 68, 68, 0.15)',
          padding: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <div style={{
            backgroundColor: 'var(--danger)',
            color: 'white',
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(239, 68, 68, 0.2)'
          }}>
            <DollarSign size={22} />
          </div>
          <div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '600' }}>إجمالي المديونية المستحقة</p>
            <h3 style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--danger)', marginTop: '0.25rem' }}>
              {totalDebts.toLocaleString()} <span style={{ fontSize: '0.9rem', fontWeight: '500' }}>ر.ي</span>
            </h3>
          </div>
        </div>

        {/* Active Debtors Count Card */}
        <div className="card" style={{
          padding: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <div style={{
            backgroundColor: 'var(--primary)',
            color: 'white',
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(5, 150, 105, 0.2)'
          }}>
            <User size={22} />
          </div>
          <div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '600' }}>عدد العملاء المدينين</p>
            <h3 style={{ fontSize: '1.5rem', fontWeight: '800', marginTop: '0.25rem' }}>
              {activeDebtorsCount} <span style={{ fontSize: '0.9rem', fontWeight: '500', color: 'var(--text-muted)' }}>عميل نشط</span>
            </h3>
          </div>
        </div>

        {/* Last payment Card */}
        <div className="card" style={{
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(16, 185, 129, 0.02) 100%)',
          border: '1px solid rgba(16, 185, 129, 0.15)',
          padding: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <div style={{
            backgroundColor: 'var(--success)',
            color: 'white',
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)'
          }}>
            <CheckCircle2 size={22} />
          </div>
          <div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '600' }}>آخر دفعة تسديد مستلمة</p>
            {lastPaymentLog ? (
              <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--success)', marginTop: '0.25rem' }}>
                {lastPaymentLog.amountYer.toLocaleString()} ر.ي <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '500' }}>({lastPaymentLog.customerName})</span>
              </h3>
            ) : (
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '0.25rem', fontWeight: '600' }}>لا توجد دفعات مسجلة بعد</p>
            )}
          </div>
        </div>
      </div>

      {/* Main Tab Controls */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
        marginBottom: '1rem'
      }}>
        {/* Sub-tab selection */}
        <div style={{
          display: 'flex',
          backgroundColor: 'var(--surface-hover)',
          padding: '0.25rem',
          borderRadius: '99px',
          border: '1px solid var(--border)'
        }}>
          <button
            onClick={() => { setActiveSubTab('list'); setSearchQuery(''); }}
            style={{
              padding: '0.45rem 1.25rem',
              borderRadius: '99px',
              border: 'none',
              fontWeight: '700',
              fontSize: '0.85rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
              backgroundColor: activeSubTab === 'list' ? 'var(--surface)' : 'transparent',
              color: activeSubTab === 'list' ? 'var(--primary)' : 'var(--text-muted)',
              boxShadow: activeSubTab === 'list' ? 'var(--shadow-sm)' : 'none'
            }}
          >
            دفتر المديونية
          </button>
          <button
            onClick={() => { setActiveSubTab('audit'); setSearchQuery(''); }}
            style={{
              padding: '0.45rem 1.25rem',
              borderRadius: '99px',
              border: 'none',
              fontWeight: '700',
              fontSize: '0.85rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
              backgroundColor: activeSubTab === 'audit' ? 'var(--surface)' : 'transparent',
              color: activeSubTab === 'audit' ? 'var(--primary)' : 'var(--text-muted)',
              boxShadow: activeSubTab === 'audit' ? 'var(--shadow-sm)' : 'none'
            }}
          >
            سجل التدقيق العام
          </button>
        </div>

        {/* Action button */}
        {hasPermission('debts.add') && (
          <button
            onClick={() => setShowAddCustomerModal(true)}
            className="btn btn-primary animate-scale-up"
            style={{ border: 'none', borderRadius: '99px', padding: '0.5rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <Plus size={16} />
            <span>إضافة مديونية لعميل جديد</span>
          </button>
        )}
      </div>

      {/* Filter and Search Section */}
      <div className="card" style={{ marginBottom: '1rem', padding: '1rem' }}>
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            className="input-field"
            placeholder={activeSubTab === 'list' ? "بحث عن عميل في المديونية..." : "بحث باسم العميل، الكاشير أو الملاحظات..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: '100%', paddingRight: '2.5rem', marginBottom: 0 }}
          />
          <Search size={18} style={{ position: 'absolute', right: '0.9rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        </div>
      </div>

      {/* Tables Container */}
      {activeSubTab === 'list' ? (
        <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)', backgroundColor: 'var(--surface-hover)' }}>
                <th style={{ padding: '1rem' }}>اسم العميل</th>
                <th style={{ padding: '1rem' }}>المديونية بالريال اليمني</th>
                <th style={{ padding: '1rem' }}>تاريخ آخر حركة</th>
                <th style={{ padding: '1rem', textAlign: 'left' }}>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filteredDebts.map(d => (
                <tr key={d.id} style={{ borderBottom: '1px solid var(--border)' }} className="table-row-hover">
                  <td style={{ padding: '1rem', fontWeight: '700' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{
                        backgroundColor: 'var(--primary-lighter)',
                        color: 'var(--primary)',
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 'bold',
                        fontSize: '0.8rem'
                      }}>
                        {d.customerName.charAt(0)}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span>{d.customerName}</span>
                        {d.phone && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.15rem' }}>
                            <span>📱</span>
                            <span>{d.phone}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '1rem', fontWeight: '800', fontSize: '1rem', color: d.amountYer > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>
                    {d.amountYer.toLocaleString()} ر.ي
                  </td>
                  <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>
                    {new Date(d.updatedAt).toLocaleString('ar-YE')}
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'left' }}>
                    <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'flex-end' }}>
                      {hasPermission('debts.edit') && (
                        <button
                          onClick={() => {
                            setTxTargetCustomer(d);
                            setTxType('reduce');
                            setShowTxModal(true);
                          }}
                          style={{
                            padding: '0.35rem 0.85rem',
                            fontSize: '0.75rem',
                            borderRadius: '99px',
                            border: '1px solid rgba(16, 185, 129, 0.2)',
                            backgroundColor: 'rgba(16, 185, 129, 0.08)',
                            color: 'var(--success)',
                            fontWeight: '700',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          تسديد دفعة
                        </button>
                      )}
                      {hasPermission('debts.add') && (
                        <button
                          onClick={() => {
                            setTxTargetCustomer(d);
                            setTxType('add');
                            setShowTxModal(true);
                          }}
                          style={{
                            padding: '0.35rem 0.85rem',
                            fontSize: '0.75rem',
                            borderRadius: '99px',
                            border: '1px solid rgba(245, 158, 11, 0.2)',
                            backgroundColor: 'rgba(245, 158, 11, 0.08)',
                            color: 'var(--warning)',
                            fontWeight: '700',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          إضافة دين
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setLogTargetCustomer(d);
                          setShowSingleLogModal(true);
                        }}
                        style={{
                          padding: '0.35rem 0.85rem',
                          fontSize: '0.75rem',
                          borderRadius: '99px',
                          border: '1px solid var(--border)',
                          backgroundColor: 'var(--surface-hover)',
                          color: 'var(--text-muted)',
                          fontWeight: '700',
                          cursor: 'pointer',
                          gap: '0.25rem',
                          display: 'flex',
                          alignItems: 'center',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <History size={12} />
                        <span>كشف الحساب</span>
                      </button>

                      <button
                        onClick={() => handleShareWhatsApp(d)}
                        style={{
                          padding: '0.35rem 0.85rem',
                          fontSize: '0.75rem',
                          borderRadius: '99px',
                          border: '1px solid rgba(37, 211, 102, 0.2)',
                          backgroundColor: 'rgba(37, 211, 102, 0.08)',
                          color: '#25D366',
                          fontWeight: '700',
                          cursor: 'pointer',
                          gap: '0.25rem',
                          display: 'flex',
                          alignItems: 'center',
                          transition: 'all 0.2s ease'
                        }}
                        title="مطالبة وتذكير بالدين عبر الواتساب"
                      >
                        <MessageSquare size={12} />
                        <span>مطالبة واتساب</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredDebts.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    لا توجد مديونيات مطابقة للبحث.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        /* General Audit Log Table */
        <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)', backgroundColor: 'var(--surface-hover)' }}>
                <th style={{ padding: '1rem' }}>تاريخ الحركة</th>
                <th style={{ padding: '1rem' }}>اسم العميل</th>
                <th style={{ padding: '1rem' }}>نوع الحركة</th>
                <th style={{ padding: '1rem' }}>المبلغ المالي</th>
                <th style={{ padding: '1rem' }}>الرصيد بعد الحركة</th>
                <th style={{ padding: '1rem' }}>الكاشير</th>
                <th style={{ padding: '1rem' }}>الملاحظات</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map(l => {
                let badgeColor = 'var(--text-muted)';
                let badgeBg = 'var(--surface-hover)';
                let typeText = '';
                let icon = null;

                if (l.type === 'add') {
                  badgeColor = 'var(--danger)';
                  badgeBg = 'rgba(239, 68, 68, 0.1)';
                  typeText = 'زيادة دين';
                  icon = <ArrowUpRight size={12} style={{ marginLeft: '2px' }} />;
                } else if (l.type === 'reduce') {
                  badgeColor = 'var(--success)';
                  badgeBg = 'rgba(16, 185, 129, 0.1)';
                  typeText = 'تسديد دين';
                  icon = <ArrowDownLeft size={12} style={{ marginLeft: '2px' }} />;
                } else {
                  badgeColor = 'var(--primary)';
                  badgeBg = 'rgba(5, 150, 105, 0.1)';
                  typeText = 'تعديل رصيد';
                  icon = <FileText size={12} style={{ marginLeft: '2px' }} />;
                }

                return (
                  <tr key={l.id} style={{ borderBottom: '1px solid var(--border)' }} className="table-row-hover">
                    <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>
                      {new Date(l.createdAt).toLocaleString('ar-YE')}
                    </td>
                    <td style={{ padding: '1rem', fontWeight: '700' }}>
                      {l.customerName}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{
                        color: badgeColor,
                        backgroundColor: badgeBg,
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        fontWeight: '700',
                        fontSize: '0.75rem',
                        display: 'inline-flex',
                        alignItems: 'center'
                      }}>
                        {icon}
                        {typeText}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', fontWeight: '700', color: l.type === 'reduce' ? 'var(--success)' : 'var(--danger)' }}>
                      {l.amountYer.toLocaleString()} ر.ي
                    </td>
                    <td style={{ padding: '1rem', fontWeight: '700' }}>
                      {l.balanceAfterYer.toLocaleString()} ر.ي
                    </td>
                    <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>
                      {l.createdBy}
                    </td>
                    <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>
                      {l.notes}
                    </td>
                  </tr>
                );
              })}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    لا توجد حركات تدقيق مطابقة للبحث.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal 1: Add New Debtor Manually */}
      {showAddCustomerModal && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="card animate-scale-up" style={{ width: '100%', maxWidth: '460px', padding: '1.5rem', position: 'relative' }}>
            <button
              onClick={() => setShowAddCustomerModal(false)}
              style={{ position: 'absolute', left: '1rem', top: '1.25rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
            >
              <X size={18} />
            </button>
            <h3 style={{ marginBottom: '1.25rem', fontWeight: '800' }}>تسجيل دين لعميل جديد</h3>
            <form onSubmit={handleCreateCustomer}>
              <div className="input-group">
                <label className="input-label">اسم العميل (كتابة يدوية)</label>
                <input
                  type="text"
                  required
                  className="input-field"
                  placeholder="مثال: صالح محمد السنيداني"
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                />
              </div>
              <div className="input-group">
                <label className="input-label">رقم هاتف العميل (اختياري - للمطالبة بالواتساب)</label>
                <input
                  type="tel"
                  className="input-field"
                  placeholder="مثال: 777123456"
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                />
              </div>
              <div className="input-group">
                <label className="input-label">رصيد المديونية بالريال اليمني (YER)</label>
                <input
                  type="number"
                  className="input-field"
                  placeholder="0.00"
                  value={newCustAmount}
                  onChange={(e) => setNewCustAmount(e.target.value)}
                />
              </div>
              <div className="input-group">
                <label className="input-label">ملاحظات إضافية</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="مثال: فاتورة بقالة مواد غذائية..."
                  value={newCustNotes}
                  onChange={(e) => setNewCustNotes(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowAddCustomerModal(false)} className="btn btn-secondary">إلغاء</button>
                <button type="submit" className="btn btn-primary" style={{ border: 'none' }}>تأكيد وحفظ</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Record transaction (Add/Reduce/Set) */}
      {showTxModal && txTargetCustomer && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="card animate-scale-up" style={{ width: '100%', maxWidth: '460px', padding: '1.5rem', position: 'relative' }}>
            <button
              onClick={() => { setShowTxModal(false); setTxTargetCustomer(null); }}
              style={{ position: 'absolute', left: '1rem', top: '1.25rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
            >
              <X size={18} />
            </button>
            <h3 style={{ marginBottom: '1.25rem', fontWeight: '800' }}>تسجيل حركة مالية</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              العميل: <strong style={{ color: 'var(--text)' }}>{txTargetCustomer.customerName}</strong> | الرصيد الحالي: <strong style={{ color: 'var(--danger)' }}>{txTargetCustomer.amountYer.toLocaleString()} ر.ي</strong>
            </p>
            <form onSubmit={handleRecordTransaction}>
              <div className="input-group">
                <label className="input-label font-bold">نوع العملية</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setTxType('reduce')}
                    style={{
                      padding: '0.5rem',
                      borderRadius: '8px',
                      border: '1px solid ' + (txType === 'reduce' ? 'var(--success)' : 'var(--border)'),
                      backgroundColor: txType === 'reduce' ? 'var(--success)' : 'var(--surface)',
                      color: txType === 'reduce' ? 'white' : 'var(--text)',
                      fontWeight: '700',
                      cursor: 'pointer',
                      fontSize: '0.8rem'
                    }}
                  >
                    تسديد دين (-)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTxType('add')}
                    style={{
                      padding: '0.5rem',
                      borderRadius: '8px',
                      border: '1px solid ' + (txType === 'add' ? 'var(--danger)' : 'var(--border)'),
                      backgroundColor: txType === 'add' ? 'var(--danger)' : 'var(--surface)',
                      color: txType === 'add' ? 'white' : 'var(--text)',
                      fontWeight: '700',
                      cursor: 'pointer',
                      fontSize: '0.8rem'
                    }}
                  >
                    زيادة دين (+)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTxType('set')}
                    style={{
                      padding: '0.5rem',
                      borderRadius: '8px',
                      border: '1px solid ' + (txType === 'set' ? 'var(--primary)' : 'var(--border)'),
                      backgroundColor: txType === 'set' ? 'var(--primary)' : 'var(--surface)',
                      color: txType === 'set' ? 'white' : 'var(--text)',
                      fontWeight: '700',
                      cursor: 'pointer',
                      fontSize: '0.8rem'
                    }}
                  >
                    تعديل الرصيد (=)
                  </button>
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">قيمة المبلغ بالريال اليمني (YER)</label>
                <input
                  type="number"
                  required
                  className="input-field"
                  placeholder="أدخل قيمة المبلغ..."
                  value={txAmount}
                  onChange={(e) => setTxAmount(e.target.value)}
                />
              </div>

              <div className="input-group">
                <label className="input-label">ملاحظات وتفاصيل الحركة</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="مثال: تسديد نقدي للوردية المسائية..."
                  value={txNotes}
                  onChange={(e) => setTxNotes(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => { setShowTxModal(false); setTxTargetCustomer(null); }} className="btn btn-secondary">إلغاء</button>
                <button type="submit" className="btn btn-primary" style={{ border: 'none' }}>حفظ التعديل</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: View single customer logs (كشف حساب العميل) */}
      {showSingleLogModal && logTargetCustomer && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="card animate-scale-up" style={{ width: '100%', maxWidth: '780px', padding: '1.5rem', position: 'relative', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
            <button
              onClick={() => { setShowSingleLogModal(false); setLogTargetCustomer(null); }}
              style={{ position: 'absolute', left: '1rem', top: '1.25rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
            >
              <X size={18} />
            </button>
            <h3 style={{ marginBottom: '0.5rem', fontWeight: '800' }}>كشف حساب تفصيلي للعميل</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              الاسم: <strong style={{ color: 'var(--text)' }}>{logTargetCustomer.customerName}</strong> | الرصيد الحالي للمديونية: <strong style={{ color: 'var(--danger)' }}>{logTargetCustomer.amountYer.toLocaleString()} ر.ي</strong>
            </p>

            <div style={{ flex: 1, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '8px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)', backgroundColor: 'var(--surface-hover)', position: 'sticky', top: 0 }}>
                    <th style={{ padding: '0.75rem' }}>تاريخ الحركة</th>
                    <th style={{ padding: '0.75rem' }}>العملية</th>
                    <th style={{ padding: '0.75rem' }}>القيمة</th>
                    <th style={{ padding: '0.75rem' }}>الرصيد بعد العملية</th>
                    <th style={{ padding: '0.75rem' }}>المسؤول</th>
                    <th style={{ padding: '0.75rem' }}>الملاحظات</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.filter(l => l.debtId === logTargetCustomer.id).map(l => {
                    let typeText = '';
                    let color = 'var(--text)';
                    if (l.type === 'add') { typeText = 'زيادة دين'; color = 'var(--danger)'; }
                    else if (l.type === 'reduce') { typeText = 'تسديد دين'; color = 'var(--success)'; }
                    else { typeText = 'تعديل رصيد'; color = 'var(--primary)'; }

                    return (
                      <tr key={l.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>{new Date(l.createdAt).toLocaleString('ar-YE')}</td>
                        <td style={{ padding: '0.75rem', fontWeight: '700', color }}>{typeText}</td>
                        <td style={{ padding: '0.75rem', fontWeight: '700', color }}>{l.amountYer.toLocaleString()} ر.ي</td>
                        <td style={{ padding: '0.75rem', fontWeight: '700' }}>{l.balanceAfterYer.toLocaleString()} ر.ي</td>
                        <td style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>{l.createdBy}</td>
                        <td style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>{l.notes}</td>
                      </tr>
                    );
                  })}
                  {logs.filter(l => l.debtId === logTargetCustomer.id).length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>لا توجد حركات مسجلة لهذا العميل.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', marginTop: '1.25rem', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => { setShowSingleLogModal(false); setLogTargetCustomer(null); }} className="btn btn-secondary">إغلاق</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default DebtsTab;
