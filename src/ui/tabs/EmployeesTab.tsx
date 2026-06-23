// src/ui/tabs/EmployeesTab.tsx
import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useSalesStore } from '../../store/salesStore';
import { strings } from '../../i18n';
import { Users, Plus, Trash2, Key, AlertCircle } from 'lucide-react';

const EmployeesTab: React.FC = () => {
  const { tenant, user: currentUser } = useAuthStore();
  const { employees, addEmployee, deleteEmployee, error: employeeError } = useSalesStore();

  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [roleInput, setRoleInput] = useState<'admin' | 'employee'>('employee');
  
  const [formError, setFormError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccessMsg(null);

    const cleanUser = usernameInput.toLowerCase().trim();
    if (!cleanUser || !passwordInput) {
      setFormError('الرجاء تعبئة كافة الحقول المطلوبة');
      return;
    }

    if (passwordInput.length < 4) {
      setFormError('يجب أن تكون كلمة المرور مكونة من 4 خانات على الأقل');
      return;
    }

    setIsSubmitting(true);
    const success = await addEmployee(
      tenant!.id,
      cleanUser,
      passwordInput,
      roleInput,
      currentUser!.username
    );
    setIsSubmitting(false);

    if (success) {
      setSuccessMsg(`تم بنجاح إضافة الموظف الجديد: ${cleanUser}`);
      setUsernameInput('');
      setPasswordInput('');
      setRoleInput('employee');
    } else {
      setFormError(employeeError || 'فشل تسجيل الموظف الجديد');
    }
  };

  const handleDeleteEmployee = async (emp: any) => {
    if (window.confirm(`هل أنت متأكد من حذف حساب الموظف "${emp.username}" نهائياً من هذا المتجر؟`)) {
      setFormError(null);
      setSuccessMsg(null);
      
      const success = await deleteEmployee(tenant!.id, emp.id, emp.username, currentUser!.username);
      if (success) {
        setSuccessMsg(`تم حذف الحساب بنجاح`);
      } else {
        setFormError(employeeError || 'فشل حذف الموظف');
      }
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '1.5rem' }}>
      
      {/* Right side: Add Employee Form */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div className="card">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <Plus size={18} />
            <span>{strings.employees.addEmployee}</span>
          </h3>

          {formError && (
            <div style={{
              backgroundColor: 'hsl(0, 84%, 96%)', color: 'var(--danger)', padding: '0.5rem 0.75rem', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem'
            }}>
              <AlertCircle size={16} />
              <span>{formError}</span>
            </div>
          )}

          {successMsg && (
            <div style={{
              backgroundColor: 'hsl(142, 69%, 95%)', color: 'var(--success)', padding: '0.5rem 0.75rem', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '1rem'
            }}>{successMsg}</div>
          )}

          <form onSubmit={handleAddEmployee} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="input-group">
              <label className="input-label">{strings.employees.empUsername}</label>
              <input
                type="text"
                className="input-field"
                placeholder="مثال: khaled"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                required
              />
            </div>

            <div className="input-group">
              <label className="input-label">{strings.employees.empPassword}</label>
              <input
                type="password"
                className="input-field"
                placeholder="اكتب كلمة مرور آمنة"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                required
              />
            </div>

            <div className="input-group">
              <label className="input-label">{strings.employees.empRole}</label>
              <select
                className="input-field"
                value={roleInput}
                onChange={(e) => setRoleInput(e.target.value as any)}
                style={{ cursor: 'pointer' }}
              >
                <option value="employee">{strings.employees.roleEmployee}</option>
                <option value="admin">{strings.employees.roleAdmin}</option>
              </select>
            </div>

            <button type="submit" className="btn btn-primary" style={{ border: 'none', marginTop: '0.5rem' }} disabled={isSubmitting}>
              <span>{strings.common.add}</span>
            </button>
          </form>
        </div>
      </div>

      {/* Left side: Employees List */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', marginBottom: '1.25rem' }}>
          <Users size={18} />
          <span>المستخدمون النشطون في المتجر ({employees.length})</span>
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto', flex: 1 }}>
          {employees.map((emp) => {
            const isSelf = emp.username === currentUser?.username;
            return (
              <div key={emp.id} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.75rem 1rem',
                backgroundColor: 'var(--background)',
                borderRadius: '8px',
                border: '1px solid var(--border)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{
                    padding: '0.45rem',
                    backgroundColor: emp.role === 'admin' ? 'hsl(38, 92%, 90%)' : 'var(--primary-lighter)',
                    color: emp.role === 'admin' ? 'var(--warning)' : 'var(--primary)',
                    borderRadius: '50%',
                    display: 'flex'
                  }}>
                    <Key size={18} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontWeight: '700', color: 'var(--text)' }}>{emp.username}</span>
                      {isSelf && (
                        <span className="badge badge-info" style={{ fontSize: '0.65rem' }}>حسابك الحالي</span>
                      )}
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      الصلاحية: {emp.role === 'admin' ? strings.employees.roleAdmin : strings.employees.roleEmployee}
                    </span>
                  </div>
                </div>

                {!isSelf && (
                  <button
                    onClick={() => handleDeleteEmployee(emp)}
                    className="btn"
                    style={{
                      padding: '0.35rem',
                      background: 'none',
                      border: 'none',
                      color: 'var(--danger)',
                      cursor: 'pointer'
                    }}
                    title="حذف حساب الموظف"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            );
          })}

          {employees.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem 0' }}>
              {strings.employees.noEmployees}
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

export default EmployeesTab;
