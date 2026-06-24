import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';
import { userRepo, auditRepo } from '../../core/repositories/sqlite';
import { hashPassword, comparePassword } from '../../core/utils/hash';
import { User, Shield, Key, Eye, EyeOff, Save, Package } from 'lucide-react';

const UserProfile: React.FC = () => {
  const { user, tenant } = useAuthStore();
  const { addToast } = useToastStore();

  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleChangePassword = async () => {
    if (!user || !tenant) return;

    if (!currentPassword || !newPassword || !confirmPassword) {
      addToast('error', 'الرجاء تعبئة جميع الحقول');
      return;
    }
    if (newPassword.length < 4) {
      addToast('error', 'كلمة المرور الجديدة يجب أن تكون 4 خانات على الأقل');
      return;
    }
    if (newPassword !== confirmPassword) {
      addToast('error', 'كلمتا المرور غير متطابقتين');
      return;
    }

    setIsSaving(true);
    try {
      const userData = await userRepo.getByUsername(tenant.id, user.username);
      if (userData) {
        const valid = await comparePassword(currentPassword, userData.password_hash);
        if (!valid) {
          addToast('error', 'كلمة المرور الحالية غير صحيحة');
          setIsSaving(false);
          return;
        }

        const hash = await hashPassword(newPassword);
        await userRepo.update({ ...userData, password_hash: hash });

        await auditRepo.create({
          tenant_id: tenant.id,
          action: `تغيير كلمة المرور من صفحة الملف الشخصي`,
          performed_by: user.username,
        });

        addToast('success', 'تم تغيير كلمة المرور بنجاح');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setShowPasswordSection(false);
      }
    } catch (err) {
      addToast('error', 'حدث خطأ أثناء تغيير كلمة المرور');
    }
    setIsSaving(false);
  };

  const roleLabels: Record<string, string> = {
    sysadmin: 'مدير النظام',
    admin: 'مدير المتجر',
    employee: 'موظف مبيعات',
  };

  const roleBadgeClass: Record<string, string> = {
    sysadmin: 'badge-danger',
    admin: 'badge-warning',
    employee: 'badge-info',
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '600px' }}>
      <div>
        <h2 style={{ color: 'var(--primary)' }}>الملف الشخصي</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>معلومات حسابك وإعداداتك</p>
      </div>

      {/* Profile Card */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{
            width: '80px', height: '80px', borderRadius: '50%',
            backgroundColor: 'var(--primary)', color: 'var(--text-light)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '2rem', fontWeight: '800'
          }}>
            {user?.username?.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 style={{ fontSize: '1.3rem', marginBottom: '0.25rem' }}>{user?.username}</h3>
            <span className={`badge ${roleBadgeClass[user?.role || '']}`} style={{ fontSize: '0.75rem' }}>
              <Shield size={12} style={{ display: 'inline' }} /> {roleLabels[user?.role || '']}
            </span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div style={{ padding: '0.85rem', backgroundColor: 'var(--background)', borderRadius: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
              <User size={14} style={{ color: 'var(--text-muted)' }} />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>المتجر</span>
            </div>
            <p style={{ fontWeight: '700', fontSize: '0.9rem' }}>{tenant?.store_name}</p>
          </div>
          <div style={{ padding: '0.85rem', backgroundColor: 'var(--background)', borderRadius: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
              <Package size={14} style={{ color: 'var(--text-muted)' }} />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>رمز المتجر</span>
            </div>
            <p style={{ fontWeight: '700', fontSize: '0.9rem' }}>{tenant?.client_code}</p>
          </div>
        </div>
      </div>

      {/* Password Change */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Key size={16} /> تغيير كلمة المرور
          </h3>
          <button onClick={() => setShowPasswordSection(!showPasswordSection)} className="btn btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}>
            {showPasswordSection ? 'إلغاء' : 'تغيير'}
          </button>
        </div>

        {showPasswordSection && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="input-group" style={{ position: 'relative' }}>
              <label className="input-label">كلمة المرور الحالية</label>
              <input type={showCurrentPw ? 'text' : 'password'} className="input-field" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} style={{ paddingRight: '2.5rem' }} />
              <button onClick={() => setShowCurrentPw(!showCurrentPw)} style={{ position: 'absolute', right: '0.75rem', top: '2.2rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                {showCurrentPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <div className="input-group" style={{ position: 'relative' }}>
              <label className="input-label">كلمة المرور الجديدة</label>
              <input type={showNewPw ? 'text' : 'password'} className="input-field" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} style={{ paddingRight: '2.5rem' }} />
              <button onClick={() => setShowNewPw(!showNewPw)} style={{ position: 'absolute', right: '0.75rem', top: '2.2rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                {showNewPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <div className="input-group">
              <label className="input-label">تأكيد كلمة المرور</label>
              <input type="password" className="input-field" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
            </div>
            <button onClick={handleChangePassword} className="btn btn-primary" style={{ width: '100%', border: 'none' }} disabled={isSaving}>
              <Save size={16} /> {isSaving ? 'جاري الحفظ...' : 'حفظ كلمة المرور الجديدة'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserProfile;
