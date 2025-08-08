import { useState, useEffect } from 'react';
import { SimpleFallback } from './components/SimpleFallback';

function AppSafe() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>({});

  useEffect(() => {
    console.log('🚀 AppSafe starting...');
    
    // Симулируем загрузку
    const timer = setTimeout(() => {
      try {
        console.log('✅ AppSafe loaded');
        setIsLoading(false);
        
        // Собираем debug информацию
        setDebugInfo({
          apiUrl: import.meta.env.VITE_API_URL,
          wsUrl: import.meta.env.VITE_WS_URL,
          mode: import.meta.env.MODE,
          timestamp: new Date().toISOString()
        });
      } catch (err: any) {
        console.error('❌ AppSafe error:', err);
        setError(err.message || 'Unknown error');
        setIsLoading(false);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  if (error) {
    return <SimpleFallback />;
  }

  if (isLoading) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#1a1a2e',
        color: 'white',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>🌍</div>
        <div style={{ fontSize: '24px', marginBottom: '10px' }}>World Flag Battle</div>
        <div style={{ fontSize: '14px', opacity: 0.7 }}>Loading...</div>
        <div style={{ 
          marginTop: '40px', 
          padding: '20px', 
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '10px',
          maxWidth: '400px'
        }}>
          <div style={{ fontSize: '12px', marginBottom: '10px' }}>Debug Info:</div>
          <pre style={{ fontSize: '10px', opacity: 0.7 }}>
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: '#1a1a2e',
      color: 'white',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      padding: '20px'
    }}>
      <div style={{ 
        backgroundColor: 'rgba(0, 212, 255, 0.1)',
        border: '2px solid #00d4ff',
        borderRadius: '15px',
        padding: '40px',
        maxWidth: '500px',
        width: '100%',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '60px', marginBottom: '20px' }}>🎮</div>
        <h1 style={{ fontSize: '28px', marginBottom: '20px', color: '#00d4ff' }}>
          World Flag Battle
        </h1>
        <p style={{ fontSize: '16px', marginBottom: '30px', opacity: 0.8 }}>
          Safe Mode Activated
        </p>
        
        <div style={{
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          padding: '20px',
          borderRadius: '10px',
          marginBottom: '20px',
          textAlign: 'left'
        }}>
          <div style={{ fontSize: '14px', marginBottom: '10px', color: '#4ecdc4' }}>
            ✅ System Status:
          </div>
          <div style={{ fontSize: '12px', opacity: 0.7, lineHeight: '1.6' }}>
            • API: {import.meta.env.VITE_API_URL ? '🟢 Configured' : '🔴 Not Set'}<br/>
            • WebSocket: {import.meta.env.VITE_WS_URL ? '🟢 Configured' : '🔴 Not Set'}<br/>
            • Mode: {import.meta.env.MODE}<br/>
            • Platform: Web Browser
          </div>
        </div>
        
        <button
          onClick={() => window.location.reload()}
          style={{
            backgroundColor: '#00d4ff',
            color: '#000',
            border: 'none',
            padding: '12px 30px',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: 'pointer',
            width: '100%'
          }}
        >
          🔄 Reload Application
        </button>
      </div>
    </div>
  );
}

export default AppSafe;