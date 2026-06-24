import React, { useState, useEffect } from 'react';
import { Printer, Save } from 'lucide-react';
import { useToastStore } from '../../store/toastStore';

interface PrintSettings {
  storeName: string;
  storePhone: string;
  storeAddress: string;
  receiptWidth: '58mm' | '80mm';
  showBarcode: boolean;
  showLogo: boolean;
  footerText: string;
}

const defaultSettings: PrintSettings = {
  storeName: 'بقالة حضرموت النموذجية',
  storePhone: '777123456',
  storeAddress: 'المكلا - شارع الجلاء',
  receiptWidth: '80mm',
  showBarcode: true,
  showLogo: false,
  footerText: 'شكراً لزيارتكم!',
};

const PrintSettingsPanel: React.FC = () => {
  const { addToast } = useToastStore();
  const [settings, setSettings] = useState<PrintSettings>(defaultSettings);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('grocery_saas_print_settings');
      if (stored) setSettings({ ...defaultSettings, ...JSON.parse(stored) });
    } catch {}
  }, []);

  const handleSave = () => {
    localStorage.setItem('grocery_saas_print_settings', JSON.stringify(settings));
    addToast('success', 'تم حفظ إعدادات الطباعة بنجاح');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h2 style={{ color: 'var(--primary)' }}>إعدادات الطباعة</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>تخصيص شكل الفاتورة المطبوعة</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Settings Card */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ fontSize: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>بيانات المتجر</h3>
          <div className="input-group">
            <label className="input-label">اسم المتجر</label>
            <input type="text" className="input-field" value={settings.storeName} onChange={(e) => setSettings({ ...settings, storeName: e.target.value })} />
          </div>
          <div className="input-group">
            <label className="input-label">رقم الهاتف</label>
            <input type="text" className="input-field" value={settings.storePhone} onChange={(e) => setSettings({ ...settings, storePhone: e.target.value })} />
          </div>
          <div className="input-group">
            <label className="input-label">العنوان</label>
            <input type="text" className="input-field" value={settings.storeAddress} onChange={(e) => setSettings({ ...settings, storeAddress: e.target.value })} />
          </div>
          <div className="input-group">
            <label className="input-label">نص أسفل الفاتورة</label>
            <input type="text" className="input-field" value={settings.footerText} onChange={(e) => setSettings({ ...settings, footerText: e.target.value })} />
          </div>
        </div>

        {/* Preview Card */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ fontSize: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>خيارات الطباعة</h3>
          <div className="input-group">
            <label className="input-label">عرض الفاتورة</label>
            <select className="input-field" value={settings.receiptWidth} onChange={(e) => setSettings({ ...settings, receiptWidth: e.target.value as any })}>
              <option value="58mm">58 مم (طابعة صغيرة)</option>
              <option value="80mm">80 مم (طابعة عادية)</option>
            </select>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
            <input type="checkbox" checked={settings.showBarcode} onChange={(e) => setSettings({ ...settings, showBarcode: e.target.checked })} />
            عرض الباركود على الفاتورة
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
            <input type="checkbox" checked={settings.showLogo} onChange={(e) => setSettings({ ...settings, showLogo: e.target.checked })} />
            عرض شعار المتجر
          </label>
        </div>
      </div>

      {/* Receipt Preview */}
      <div className="card">
        <h3 style={{ fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Printer size={18} /> معاينة الفاتورة
        </h3>
        <div className="receipt-container" style={{ margin: '0 auto', width: settings.receiptWidth === '58mm' ? '280px' : '320px', border: '1px dashed #333' }}>
          <div className="receipt-header">
            <h4 style={{ color: '#000', fontSize: '1rem', fontWeight: 'bold' }}>{settings.storeName}</h4>
            <p style={{ fontSize: '0.7rem', color: '#555' }}>{settings.storePhone} - {settings.storeAddress}</p>
          </div>
          <div style={{ fontSize: '0.7rem', marginBottom: '0.5rem', borderBottom: '1px dashed #000', paddingBottom: '0.35rem' }}>
            <div>رقم الفاتورة: INV_123456</div>
            <div>التاريخ: {new Date().toLocaleString('ar-YE')}</div>
            <div>الكاشير: admin</div>
          </div>
          <div style={{ borderBottom: '1px dashed #000', paddingBottom: '0.35rem', marginBottom: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '0.7rem' }}>
              <span style={{ width: '50%' }}>المنتج</span>
              <span style={{ width: '15%', textAlign: 'center' }}>ك</span>
              <span style={{ width: '35%', textAlign: 'left' }}>المجموع</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', marginTop: '0.2rem' }}>
              <span style={{ width: '50%' }}>حليب المدهش</span>
              <span style={{ width: '15%', textAlign: 'center' }}>2</span>
              <span style={{ width: '35%', textAlign: 'left' }}>80.00</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', marginTop: '0.2rem' }}>
              <span style={{ width: '50%' }}>أرز بسمتي</span>
              <span style={{ width: '15%', textAlign: 'center' }}>1</span>
              <span style={{ width: '35%', textAlign: 'left' }}>48.00</span>
            </div>
          </div>
          <div className="receipt-total" style={{ fontSize: '0.8rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>الإجمالي:</span>
              <span>128.00 ر.س</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.2rem' }}>
              <span>باليمني:</span>
              <span>50,560 ر.ي</span>
            </div>
          </div>
          <div style={{ textAlign: 'center', marginTop: '0.75rem', fontSize: '0.65rem', borderTop: '1px dashed #000', paddingTop: '0.5rem' }}>
            {settings.footerText}
          </div>
        </div>
      </div>

      <button onClick={handleSave} className="btn btn-primary" style={{ width: '200px', border: 'none' }}>
        <Save size={16} /> حفظ الإعدادات
      </button>
    </div>
  );
};

export default PrintSettingsPanel;
