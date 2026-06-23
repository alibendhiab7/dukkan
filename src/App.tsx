// src/App.tsx
import React, { useEffect, useState } from 'react';
import { db } from './core/database/db';
import { initializeSchemaAndSeed } from './core/database/schema';
import { useAuthStore } from './store/authStore';
import { AppRouter } from './routes';

const App: React.FC = () => {
  const [dbReady, setDbReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const { checkSession } = useAuthStore();

  useEffect(() => {
    const initApp = async () => {
      try {
        // 1. Initialize database engine (version check + table creation)
        await db.initialize();

        // 2. Seed demo data if needed
        await initializeSchemaAndSeed();

        // 3. Restore session if exists
        await checkSession();

        setDbReady(true);
      } catch (err: any) {
        console.error('[App] Initialization failed:', err);
        setInitError(err.message || 'خطأ غير متوقع');
      }
    };

    initApp();
  }, [checkSession]);

  if (initError) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: 'linear-gradient(135deg, var(--primary-dark) 0%, var(--primary) 100%)',
        color: 'white',
        fontFamily: "'Tajawal', sans-serif",
        gap: '1rem',
        padding: '2rem',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '3rem' }}>⚠️</div>
        <h3 style={{ fontWeight: 'bold' }}>حدث خطأ أثناء تحميل النظام</h3>
        <p style={{ opacity: 0.8, fontSize: '0.9rem' }}>{initError}</p>
        <button
          onClick={() => {
            db.clearDatabase().then(() => window.location.reload());
          }}
          style={{
            marginTop: '1rem',
            padding: '0.75rem 2rem',
            border: '2px solid white',
            borderRadius: '8px',
            background: 'transparent',
            color: 'white',
            fontWeight: 'bold',
            cursor: 'pointer',
            fontSize: '0.95rem'
          }}
        >
          إعادة تهيئة قاعدة البيانات 🔄
        </button>
      </div>
    );
  }

  if (!dbReady) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: 'linear-gradient(135deg, var(--primary-dark) 0%, var(--primary) 100%)',
        color: 'white',
        fontFamily: "'Tajawal', sans-serif",
        gap: '1rem'
      }}>
        <div style={{
          border: '4px solid rgba(255,255,255,0.3)',
          borderTop: '4px solid white',
          borderRadius: '50%',
          width: '40px',
          height: '40px',
          animation: 'spin 1s linear infinite'
        }} />
        <h3 style={{ fontWeight: 'bold' }}>جاري تهيئة النظام...</h3>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return <AppRouter />;
};

export default App;
