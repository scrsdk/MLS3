import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
// import App from './App.tsx'
import App from './AppSafe.tsx' // Временно используем безопасную версию
import { ErrorBoundary } from './components/ErrorBoundary.tsx'

// Глобальный обработчик ошибок
window.addEventListener('error', (event) => {
  console.error('🔴 Global error:', event.error);
  console.error('Stack:', event.error?.stack);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('🔴 Unhandled promise rejection:', event.reason);
});

// Логирование при загрузке
console.log('🚀 BattleMap starting...');
console.log('📍 Environment:', import.meta.env.MODE);
console.log('🔗 API URL:', import.meta.env.VITE_API_URL || 'not set');
console.log('🔗 WS URL:', import.meta.env.VITE_WS_URL || 'not set');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)