import crypto from 'crypto';

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export const validateTelegramWebAppData = (initData: string): TelegramUser | null => {
  const urlParams = new URLSearchParams(initData);
  const hash = urlParams.get('hash');
  urlParams.delete('hash');

  // Сортируем параметры
  const dataCheckString = Array.from(urlParams.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  const secret = crypto
    .createHmac('sha256', 'WebAppData')
    .update(process.env.TELEGRAM_BOT_TOKEN!)
    .digest();

  const calculatedHash = crypto
    .createHmac('sha256', secret)
    .update(dataCheckString)
    .digest('hex');

  if (calculatedHash !== hash) {
    // В development режиме пропускаем проверку
    if (process.env.NODE_ENV === 'development') {
      console.warn('Telegram validation skipped in development');
      const userParam = urlParams.get('user');
      if (userParam) {
        try {
          return JSON.parse(userParam);
        } catch {
          return null;
        }
      }
    }
    return null;
  }

  const userParam = urlParams.get('user');
  if (!userParam) return null;

  try {
    return JSON.parse(userParam);
  } catch {
    return null;
  }
};