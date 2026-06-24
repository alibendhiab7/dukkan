import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';
import { db } from '../../core/database/db';
import { Download, Upload, AlertTriangle } from 'lucide-react';

const ALL_TABLES = [
  'tenants', 'users', 'tenant_settings', 'products', 'inventory_movements',
  'sales', 'sale_items', 'exchange_rates', 'audit_logs', 'notifications',
  'financial_costs', 'customers', 'coupons', 'product_returns', 'return_items'
];

const BackupRestore: React.FC = () => {
  const { tenant } = useAuthStore();
  const { addToast } = useToastStore();
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleBackup = async () => {
    setIsBackingUp(true);
    try {
      const backup: Record<string, any[]> = {};
      for (const table of ALL_TABLES) {
        backup[table] = await db.query(`SELECT * FROM ${table}`);
      }

      const backupData = {
        version: 1,
        createdAt: new Date().toISOString(),
        tenantId: tenant?.id || 'all',
        data: backup,
      };

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `grocery-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      addToast('success', 'تم تصدير النسخة الاحتياطية بنجاح');
    } catch (err) {
      console.error(err);
      addToast('error', 'فشل إنشاء النسخة الاحتياطية');
    }
    setIsBackingUp(false);
  };

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsRestoring(true);
    try {
      const text = await file.text();
      const backupData = JSON.parse(text);

      if (!backupData.data || !backupData.version) {
        addToast('error', 'ملف النسخة الاحتياطية غير صالح');
        setIsRestoring(false);
        return;
      }

      await db.clearDatabase();
      await db.initialize();

      for (const table of ALL_TABLES) {
        const rows = backupData.data[table];
        if (rows && Array.isArray(rows)) {
          for (const row of rows) {
            const columns = Object.keys(row);
            const values = columns.map(c => row[c]);
            const placeholders = columns.map(() => '?').join(', ');
            await db.execute(
              `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`,
              values
            );
          }
        }
      }

      addToast('success', 'تمت استعادة البيانات بنجاح! يرجى إعادة تحميل الصفحة.');
      setTimeout(() => window.location.reload(), 2000);
    } catch (err) {
      console.error(err);
      addToast('error', 'فشل استعادة البيانات - تأكد من صحة الملف');
    }
    setIsRestoring(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
      {/* Backup Card */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ padding: '0.65rem', backgroundColor: 'hsl(142, 69%, 92%)', borderRadius: '10px' }}>
            <Download size={22} style={{ color: 'var(--success)' }} />
          </div>
          <div>
            <h4 style={{ fontSize: '0.95rem' }}>النسخ الاحتياطي</h4>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>تصدير جميع البيانات كملف JSON</p>
          </div>
        </div>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
          سيتم تصدير جميع المنتجات، المبيعات، العملاء، الإعدادات، والسجلات في ملف واحد يمكن استخدامه لاحقاً لاستعادة البيانات.
        </p>
        <button
          onClick={handleBackup}
          className="btn btn-primary"
          disabled={isBackingUp}
          style={{ width: '100%', border: 'none' }}
        >
          <Download size={16} />
          <span>{isBackingUp ? 'جاري التصدير...' : 'تصدير النسخة الاحتياطية'}</span>
        </button>
      </div>

      {/* Restore Card */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ padding: '0.65rem', backgroundColor: 'hsl(0, 84%, 95%)', borderRadius: '10px' }}>
            <Upload size={22} style={{ color: 'var(--danger)' }} />
          </div>
          <div>
            <h4 style={{ fontSize: '0.95rem' }}>استعادة البيانات</h4>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>استيراد من نسخة احتياطية سابقة</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem', backgroundColor: 'hsl(38, 92%, 92%)', borderRadius: '6px', fontSize: '0.8rem' }}>
          <AlertTriangle size={16} style={{ color: 'var(--warning)', flexShrink: 0 }} />
          <span style={{ color: 'var(--text-dark)' }}>تحذير: سيتم حذف جميع البيانات الحالية واستبدالها بالبيانات من الملف!</span>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleRestore}
          style={{ display: 'none' }}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="btn btn-danger"
          disabled={isRestoring}
          style={{ width: '100%', border: 'none' }}
        >
          <Upload size={16} />
          <span>{isRestoring ? 'جاري الاستعادة...' : 'استعادة من ملف'}</span>
        </button>
      </div>
    </div>
  );
};

export default BackupRestore;
