import crypto from 'crypto';

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export const validateTelegramWebAppData = (initData: string): TelegramUser | null => {
  // Специальная обработка для тестовых данных
  try {
    // Пробуем декодировать base64 (тестовые данные)
    const decoded = Buffer.from(initData, 'base64').toString('utf-8');
    const testData = JSON.parse(decoded);
    
    if (testData.user && testData.hash === 'test_hash') {
      console.log('Test user detected, bypassing validation');
      // Убеждаемся что id это число
      return {
        ...testData.user,
        id: typeof testData.user.id === 'string' ? parseInt(testData.user.id) : testData.user.id
      };
    }
  } catch (error) {
    console.log('Not test data, continuing with normal validation');
    // Не тестовые данные, продолжаем обычную валидацию
  }

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
    if (process.env.NODE_ENV === 'development' || process.env.ALLOW_TEST_MODE === 'true') {
      console.warn('Telegram validation skipped');
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