import { useEffect, useState } from 'react';
import type { TelegramWebApp } from '../types';

declare global {
  interface Window {
    Telegram: {
      WebApp: TelegramWebApp;
    };
  }
}

export const useTelegram = () => {
  const [webApp, setWebApp] = useState<TelegramWebApp | null>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    
    if (tg) {
      tg.ready();
      tg.expand();
      
      setWebApp(tg);
      setUser(tg.initDataUnsafe?.user);
      
      // Установка цветов темы
      const computedStyle = getComputedStyle(document.documentElement);
      const bgColor = computedStyle.getPropertyValue('--tg-theme-bg-color') || '#ffffff';
      const headerColor = computedStyle.getPropertyValue('--tg-theme-secondary-bg-color') || '#f1f1f1';
      
      tg.setBackgroundColor(bgColor);
      tg.setHeaderColor(headerColor);
    }
  }, []);

  const hapticFeedback = (type: 'light' | 'medium' | 'heavy' = 'light') => {
    webApp?.HapticFeedback?.impactOccurred(type);
  };

  const hapticNotification = (type: 'error' | 'success' | 'warning') => {
    webApp?.HapticFeedback?.notificationOccurred(type);
  };

  const showAlert = (message: string) => {
    webApp?.showAlert(message);
  };

  const showConfirm = (message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      webApp?.showConfirm(message, (confirmed) => {
        resolve(confirmed);
      });
    });
  };

  const openInvoice = (url: string): Promise<string> => {
    return new Promise((resolve) => {
      webApp?.openInvoice(url, (status) => {
        resolve(status);
      });
    });
  };

  const close = () => {
    webApp?.close();
  };

  return {
    webApp,
    user,
    hapticFeedback,
    hapticNotification,
    showAlert,
    showConfirm,
    openInvoice,
    close,
    initData: webApp?.initData || '',
    isReady: !!webApp,
  };
};