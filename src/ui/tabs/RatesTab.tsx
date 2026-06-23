// src/ui/tabs/RatesTab.tsx
import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useSalesStore } from '../../store/salesStore';
import { strings } from '../../i18n';
import { TrendingUp, RefreshCw, Save, Info, AlertCircle } from 'lucide-react';

const RatesTab: React.FC = () => {
  const { tenant, user } = useAuthStore();
  const { exchangeRate, updateExchangeRate, error: rateError, isLoading } = useSalesStore();

  const [rateInput, setRateInput] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Sync state with store on load
  useEffect(() => {
    if (exchangeRate) {
      setRateInput(exchangeRate.sar_to_yer.toString());
    }
  }, [exchangeRate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccessMsg(null);

    const rateVal = parseFloat(rateInput);
    if (isNaN(rateVal) || rateVal <= 0) {
      setFormError(strings.rates.ratePlaceholder || 'الرجاء إدخال رقم صرف صحيح أكبر من الصفر');
      return;
    }

    const success = await updateExchangeRate(tenant!.id, rateVal, user!.username);
    if (success) {
      setSuccessMsg('تم تحديث سعر الصرف بنجاح وتعميمه على نقاط البيع');
    } else {
      setFormError(rateError || 'فشل تحديث سعر الصرف');
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '600px', margin: '0 auto' }}>
      <div className="card">
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
          <TrendingUp size={20} />
          <span>{strings.rates.title}</span>
        </h3>

        {/* Informative alert */}
        <div style={{
          backgroundColor: 'var(--primary-lighter)',
          color: 'var(--primary)',
          padding: '0.75rem 1rem',
          borderRadius: '8px',
          fontSize: '0.85rem',
          lineHeight: '1.5',
          marginBottom: '1.5rem',
          display: 'flex',
          gap: '0.75rem',
          alignItems: 'flex-start'
        }}>
          <Info size={18} style={{ flexShrink: 0, marginTop: '0.1rem' }} />
          <span>{strings.rates.rateHelp}</span>
        </div>

        {formError && (
          <div style={{
            backgroundColor: 'hsl(0, 84%, 96%)', color: 'var(--danger)', padding: '0.75rem 1rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '600', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem'
          }}>
            <AlertCircle size={16} />
            <span>{formError}</span>
          </div>
        )}

        {successMsg && (
          <div style={{
            backgroundColor: 'hsl(142, 69%, 95%)', color: 'var(--success)', padding: '0.75rem 1rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '600', marginBottom: '1rem'
          }}>{successMsg}</div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="input-group">
            <label className="input-label" htmlFor="rateInput">
              {strings.rates.sarToYerRate}
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                id="rateInput"
                type="number"
                step="0.1"
                className="input-field"
                placeholder={strings.rates.ratePlaceholder}
                value={rateInput}
                onChange={(e) => setRateInput(e.target.value)}
                disabled={isLoading}
                style={{ width: '100%', paddingLeft: '4rem', fontWeight: 'bold', fontSize: '1.1rem' }}
                required
              />
              <span style={{
                position: 'absolute',
                left: '1rem',
                fontWeight: 'bold',
                color: 'var(--text-muted)'
              }}>
                {strings.common.yer}
              </span>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={isLoading}
            style={{ border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.85rem' }}
          >
            {isLoading ? (
              <>
                <RefreshCw size={16} style={{ animation: 'fadeIn 1s infinite linear' }} />
                <span>جاري الحفظ...</span>
              </>
            ) : (
              <>
                <Save size={16} />
                <span>{strings.rates.updateRate}</span>
              </>
            )}
          </button>
        </form>

        {/* Audit / Metadata Footer */}
        {exchangeRate && (
          <div style={{
            marginTop: '2rem',
            borderTop: '1px dashed var(--border)',
            paddingTop: '1rem',
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
            display: 'flex',
            justifyContent: 'space-between'
          }}>
            <span>{strings.rates.lastUpdated}: {new Date(exchangeRate.updated_at).toLocaleString('ar-YE')}</span>
            <span>القيمة الحالية: 1 ر.س = {exchangeRate.sar_to_yer} ر.ي</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default RatesTab;
