import React, { useEffect, useState } from 'react';

export const SimpleFallback: React.FC = () => {
  const [logs, setLogs] = useState<string[]>([]);
  
  useEffect(() => {
    // Собираем информацию о состоянии
    const info = [
      `URL: ${window.location.href}`,
      `API: ${import.meta.env.VITE_API_URL || 'not set'}`,
      `WS: ${import.meta.env.VITE_WS_URL || 'not set'}`,
      `Mode: ${import.meta.env.MODE}`,
      `Last Error: ${localStorage.getItem('lastError') || 'none'}`
    ];
    setLogs(info);
  }, []);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: '#1a1a2e',
      color: 'white',
      padding: '20px',
      fontFamily: 'monospace',
      overflow: 'auto'
    }}>
      <h1 style={{ fontSize: '20px', marginBottom: '20px', color: '#00d4ff' }}>
        🎮 BattleMap Debug Mode
      </h1>
      
      <div style={{
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        padding: '15px',
        borderRadius: '5px',
        marginBottom: '20px'
      }}>
        <h2 style={{ fontSize: '16px', marginBottom: '10px', color: '#ffd700' }}>
          ℹ️ System Information:
        </h2>
        {logs.map((log, i) => (
          <div key={i} style={{ fontSize: '12px', marginBottom: '5px' }}>
            {log}
          </div>
        ))}
      </div>
      
      <div style={{
        backgroundColor: 'rgba(255, 100, 100, 0.2)',
        padding: '15px',
        borderRadius: '5px',
        marginBottom: '20px'
      }}>
        <h2 style={{ fontSize: '16px', marginBottom: '10px', color: '#ff6b6b' }}>
          ⚠️ Troubleshooting:
        </h2>
        <ul style={{ fontSize: '12px', paddingLeft: '20px' }}>
          <li>Проверьте консоль браузера (F12)</li>
          <li>Очистите кеш (Ctrl+Shift+R)</li>
          <li>Убедитесь что backend работает</li>
          <li>Попробуйте в инкогнито режиме</li>
        </ul>
      </div>
      
      <button
        onClick={() => {
          localStorage.clear();
          window.location.reload();
        }}
        style={{
          backgroundColor: '#00d4ff',
          color: '#000',
          border: 'none',
          padding: '10px 20px',
          borderRadius: '5px',
          cursor: 'pointer',
          fontWeight: 'bold',
          marginRight: '10px'
        }}
      >
        🔄 Clear & Reload
      </button>
      
      <button
        onClick={() => {
          window.location.href = 'https://flagbattle-kpph.onrender.com/health';
        }}
        style={{
          backgroundColor: '#4ecdc4',
          color: '#000',
          border: 'none',
          padding: '10px 20px',
          borderRadius: '5px',
          cursor: 'pointer',
          fontWeight: 'bold'
        }}
      >
        🔍 Check Backend
      </button>
    </div>
  );
};