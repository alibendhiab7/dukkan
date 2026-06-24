// src/ui/tabs/EmployeesTab.tsx
import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useSalesStore } from '../../store/salesStore';
import { useToastStore } from '../../store/toastStore';
import { userRepo, salesRepo, auditRepo } from '../../core/repositories/sqlite';
import { hashPassword, comparePassword } from '../../core/utils/hash';
import type { User, AuditLog } from '../../core/repositories/interfaces';
import { strings } from '../../i18n';
import { Users, Plus, Trash2, Key, AlertCircle, Edit2, BarChart3, Shield, Eye, EyeOff, Ban, CheckCircle } from 'lucide-react';

const EmployeesTab: React.FC = () => {
  const { tenant, user: currentUser } = useAuthStore();
  const { employees, addEmployee, deleteEmployee, loadEmployees, error: employeeError } = useSalesStore();
  const { addToast } = useToastStore();

  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [roleInput, setRoleInput] = useState<'admin' | 'employee'>('employee');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Change password modal
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordTarget, setPasswordTarget] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Edit role modal
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [roleTarget, setRoleTarget] = useState<User | null>(null);
  const [newRole, setNewRole] = useState<'admin' | 'employee'>('employee');

  // Activity report modal
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [activityTarget, setActivityTarget] = useState<User | null>(null);
  const [activityData, setActivityData] = useState<{ sales: number; auditLogs: AuditLog[] }>({ sales: 0, auditLogs: [] });

  // Suspend account
  const [suspendedUsers, setSuspendedUsers] = useState<Set<string>>(() => {
    try { const s = localStorage.getItem('grocery_saas_suspended'); return s ? new Set(JSON.parse(s)) : new Set(); } catch { return new Set(); }
  });

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const cleanUser = usernameInput.toLowerCase().trim();
    if (!cleanUser || !passwordInput) {
      setFormError('الرجاء تعبئة كافة الحقول');
      return;
    }
    if (passwordInput.length < 4) {
      setFormError('كلمة المرور يجب أن تكون 4 خانات على الأقل');
      return;
    }
    setIsSubmitting(true);
    const success = await addEmployee(tenant!.id, cleanUser, passwordInput, roleInput, currentUser!.username);
    setIsSubmitting(false);
    if (success) {
      addToast('success', `تم إضافة الموظف "${cleanUser}" بنجاح`);
      setUsernameInput('');
      setPasswordInput('');
      setRoleInput('employee');
    } else {
      setFormError(employeeError || 'فشل إضافة الموظف');
    }
  };

  const handleDeleteEmployee = async (emp: User) => {
    if (!window.confirm(`هل أنت متأكد من حذف حساب "${emp.username}"؟`)) return;
    const success = await deleteEmployee(tenant!.id, emp.id, emp.username, currentUser!.username);
    if (success) {
      addToast('success', `تم حذف حساب "${emp.username}" بنجاح`);
    } else {
      addToast('error', employeeError || 'فشل حذف الموظف');
    }
  };

  // Change password
  const openPasswordModal = (emp: User) => {
    setPasswordTarget(emp);
    setNewPassword('');
    setConfirmPassword('');
    setCurrentPassword('');
    setShowPasswordModal(true);
  };

  const handleChangePassword = async () => {
    if (!tenant || !passwordTarget) return;
    if (!newPassword || newPassword.length < 4) {
      addToast('error', 'كلمة المرور يجب أن تكون 4 خانات على الأقل');
      return;
    }
    if (newPassword !== confirmPassword) {
      addToast('error', 'كلمتا المرور غير متطابقتين');
      return;
    }

    // If changing own password, verify current
    if (passwordTarget.id === currentUser?.id) {
      if (!currentPassword) {
        addToast('error', 'أدخل كلمة المرور الحالية');
        return;
      }
      const user = await userRepo.getByUsername(tenant.id, passwordTarget.username);
      if (user) {
        const valid = await comparePassword(currentPassword, user.password_hash);
        if (!valid) {
          addToast('error', 'كلمة المرور الحالية غير صحيحة');
          return;
        }
      }
    }

    const hash = await hashPassword(newPassword);
    await userRepo.update({ ...passwordTarget, password_hash: hash });

    await auditRepo.create({
      tenant_id: tenant.id,
      action: `تغيير كلمة المرور للمستخدم: ${passwordTarget.username}`,
      performed_by: currentUser!.username,
    });

    addToast('success', `تم تغيير كلمة المرور لـ "${passwordTarget.username}" بنجاح`);
    setShowPasswordModal(false);
  };

  // Edit role
  const openRoleModal = (emp: User) => {
    setRoleTarget(emp);
    setNewRole(emp.role as 'admin' | 'employee');
    setShowRoleModal(true);
  };

  const handleChangeRole = async () => {
    if (!tenant || !roleTarget) return;
    await userRepo.update({ ...roleTarget, role: newRole });

    await auditRepo.create({
      tenant_id: tenant.id,
      action: `تغيير دور المستخدم "${roleTarget.username}" من ${roleTarget.role} إلى ${newRole}`,
      performed_by: currentUser!.username,
    });

    addToast('success', `تم تغيير دور "${roleTarget.username}" إلى ${newRole === 'admin' ? 'مدير' : 'موظف'}`);
    setShowRoleModal(false);
    loadEmployees(tenant.id);
  };

  // Activity report
  const openActivityModal = async (emp: User) => {
    if (!tenant) return;
    setActivityTarget(emp);

    const sales = await salesRepo.getAll(tenant.id);
    const empSales = sales.filter(s => s.created_by === emp.username);

    const logs = await auditRepo.getAll(tenant.id);
    const empLogs = logs.filter(l => l.performed_by === emp.username).slice(0, 20);

    setActivityData({ sales: empSales.length, auditLogs: empLogs });
    setShowActivityModal(true);
  };

  const isSelf = (emp: User) => emp.username === currentUser?.username;
  const isSuspended = (emp: User) => suspendedUsers.has(emp.id);

  const handleSuspendToggle = async (emp: User) => {
    const newSuspended = new Set(suspendedUsers);
    if (newSuspended.has(emp.id)) {
      newSuspended.delete(emp.id);
      addToast('success', `تم تفعيل حساب "${emp.username}"`);
    } else {
      newSuspended.add(emp.id);
      addToast('warning', `تم تعطيل حساب "${emp.username}" مؤقتاً`);
    }
    setSuspendedUsers(newSuspended);
    localStorage.setItem('grocery_saas_suspended', JSON.stringify(Array.from(newSuspended)));

    await auditRepo.create({
      tenant_id: tenant!.id,
      action: `${newSuspended.has(emp.id) ? 'تعطيل' : 'تفعيل'} حساب المستخدم: ${emp.username}`,
      performed_by: currentUser!.username,
    });
  };

  return (
    <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '1.5rem' }}>
      {/* Add Employee Form */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div className="card">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <Plus size={18} /> <span>{strings.employees.addEmployee}</span>
          </h3>
          {formError && (
            <div style={{ backgroundColor: 'hsl(0, 84%, 96%)', color: 'var(--danger)', padding: '0.5rem 0.75rem', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertCircle size={16} /> <span>{formError}</span>
            </div>
          )}
          <form onSubmit={handleAddEmployee} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="input-group">
              <label className="input-label">{strings.employees.empUsername}</label>
              <input type="text" className="input-field" placeholder="مثال: khaled" value={usernameInput} onChange={(e) => setUsernameInput(e.target.value)} required />
            </div>
            <div className="input-group">
              <label className="input-label">{strings.employees.empPassword}</label>
              <input type="password" className="input-field" placeholder="4 خانات على الأقل" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} required />
            </div>
            <div className="input-group">
              <label className="input-label">{strings.employees.empRole}</label>
              <select className="input-field" value={roleInput} onChange={(e) => setRoleInput(e.target.value as any)}>
                <option value="employee">{strings.employees.roleEmployee}</option>
                <option value="admin">{strings.employees.roleAdmin}</option>
              </select>
            </div>
            <button type="submit" className="btn btn-primary" style={{ border: 'none', marginTop: '0.5rem' }} disabled={isSubmitting}>
              {strings.common.add}
            </button>
          </form>
        </div>
      </div>

      {/* Employees List */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', marginBottom: '1.25rem' }}>
          <Users size={18} /> <span>المستخدمون ({employees.length})</span>
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', overflowY: 'auto', flex: 1 }}>
          {employees.map((emp) => (
            <div key={emp.id} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '0.75rem 1rem', backgroundColor: 'var(--background)', borderRadius: '8px', border: '1px solid var(--border)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  padding: '0.45rem', backgroundColor: emp.role === 'admin' ? 'hsl(38, 92%, 90%)' : 'var(--primary-lighter)',
                  color: emp.role === 'admin' ? 'var(--warning)' : 'var(--primary)', borderRadius: '50%', display: 'flex'
                }}>
                  <Key size={18} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontWeight: '700' }}>{emp.username}</span>
                    {isSelf(emp) && <span className="badge badge-info" style={{ fontSize: '0.65rem' }}>أنت</span>}
                    {isSuspended(emp) && <span className="badge badge-danger" style={{ fontSize: '0.65rem' }}>معطل</span>}
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    <Shield size={10} style={{ display: 'inline' }} /> {emp.role === 'admin' ? 'مدير متجر' : 'موظف مبيعات'}
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.35rem' }}>
                <button onClick={() => openActivityModal(emp)} className="btn btn-secondary" style={{ padding: '0.35rem', fontSize: '0.7rem', borderRadius: '6px' }} title="تقرير النشاط">
                  <BarChart3 size={14} />
                </button>
                <button onClick={() => openPasswordModal(emp)} className="btn btn-secondary" style={{ padding: '0.35rem', fontSize: '0.7rem', borderRadius: '6px' }} title="تغيير كلمة المرور">
                  <Key size={14} />
                </button>
                <button onClick={() => openRoleModal(emp)} className="btn btn-secondary" style={{ padding: '0.35rem', fontSize: '0.7rem', borderRadius: '6px' }} title="تعديل الدور">
                  <Edit2 size={14} />
                </button>
                {!isSelf(emp) && (
                  <button onClick={() => handleSuspendToggle(emp)} className={`btn ${isSuspended(emp) ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '0.35rem', fontSize: '0.7rem', borderRadius: '6px' }} title={isSuspended(emp) ? 'تفعيل' : 'تعطيل'}>
                    {isSuspended(emp) ? <CheckCircle size={14} /> : <Ban size={14} />}
                  </button>
                )}
                {!isSelf(emp) && (
                  <button onClick={() => handleDeleteEmployee(emp)} className="btn btn-danger" style={{ padding: '0.35rem', fontSize: '0.7rem', borderRadius: '6px', border: 'none' }} title="حذف">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
          {employees.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem 0' }}>{strings.employees.noEmployees}</div>
          )}
        </div>
      </div>

      {/* Password Modal */}
      {showPasswordModal && passwordTarget && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card animate-fade-in" style={{ width: '400px', padding: '1.75rem' }}>
            <h3 style={{ marginBottom: '1.25rem' }}>تغيير كلمة المرور - {passwordTarget.username}</h3>
            {passwordTarget.id === currentUser?.id && (
              <div className="input-group">
                <label className="input-label">كلمة المرور الحالية</label>
                <input type="password" className="input-field" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
              </div>
            )}
            <div className="input-group" style={{ position: 'relative' }}>
              <label className="input-label">كلمة المرور الجديدة</label>
              <input type={showNewPassword ? 'text' : 'password'} className="input-field" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} style={{ paddingRight: '2.5rem' }} />
              <button onClick={() => setShowNewPassword(!showNewPassword)} style={{ position: 'absolute', right: '0.75rem', top: '2.2rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <div className="input-group">
              <label className="input-label">تأكيد كلمة المرور</label>
              <input type="password" className="input-field" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowPasswordModal(false)}>{strings.common.cancel}</button>
              <button className="btn btn-primary" style={{ flex: 1, border: 'none' }} onClick={handleChangePassword}>{strings.common.save}</button>
            </div>
          </div>
        </div>
      )}

      {/* Role Modal */}
      {showRoleModal && roleTarget && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card animate-fade-in" style={{ width: '380px', padding: '1.75rem' }}>
            <h3 style={{ marginBottom: '1.25rem' }}>تعديل دور - {roleTarget.username}</h3>
            <div className="input-group">
              <label className="input-label">الدور الجديد</label>
              <select className="input-field" value={newRole} onChange={(e) => setNewRole(e.target.value as any)}>
                <option value="employee">{strings.employees.roleEmployee}</option>
                <option value="admin">{strings.employees.roleAdmin}</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowRoleModal(false)}>{strings.common.cancel}</button>
              <button className="btn btn-primary" style={{ flex: 1, border: 'none' }} onClick={handleChangeRole}>{strings.common.save}</button>
            </div>
          </div>
        </div>
      )}

      {/* Activity Modal */}
      {showActivityModal && activityTarget && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card animate-fade-in" style={{ width: '500px', padding: '1.75rem', maxHeight: '80vh', overflowY: 'auto' }}>
            <h3 style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <BarChart3 size={18} /> نشاط - {activityTarget.username}
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
              <div className="card" style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--success)' }}>{activityData.sales}</span>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>فاتورة بيع</p>
              </div>
              <div className="card" style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--primary)' }}>{activityData.auditLogs.length}</span>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>عملية مسجلة</p>
              </div>
            </div>
            <h4 style={{ marginBottom: '0.75rem', fontSize: '0.9rem' }}>آخر العمليات:</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {activityData.auditLogs.map(log => (
                <div key={log.id} style={{ padding: '0.5rem 0.75rem', backgroundColor: 'var(--background)', borderRadius: '6px', fontSize: '0.8rem' }}>
                  <p style={{ fontWeight: '600' }}>{log.action}</p>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{new Date(log.created_at).toLocaleString('ar-YE')}</span>
                </div>
              ))}
            </div>
            <button className="btn btn-secondary" style={{ width: '100%', marginTop: '1rem' }} onClick={() => setShowActivityModal(false)}>{strings.common.close}</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeesTab;
