import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      game: {
        title: 'World Flag Battle',
        selectCountry: 'Select Your Country',
        search: 'Search country...',
        energy: 'Energy',
        progress: 'filled',
        leaderboard: 'Leaderboard',
        rank: 'Rank',
        country: 'Country',
        players: 'Players',
        yourCountry: 'Your Country',
        attack: 'Attack',
        defend: 'Defend',
        tap: 'Tap to place pixel',
        noEnergy: 'No energy! Wait or buy more',
        connecting: 'Connecting...',
        reconnecting: 'Reconnecting...',
        offline: 'Offline. Check your connection',
      },
      shop: {
        title: 'Energy Shop',
        energy: 'energy',
        buy: 'Buy',
        vip: 'VIP Subscription',
        vipDesc: '• 200 max energy\n• 2x faster restore\n• Exclusive effects',
        vipPrice: '100 Stars/week',
        dailyBonus: 'Daily Bonus',
        claim: 'Claim +50 Energy',
        claimed: 'Claimed! Come back tomorrow',
      },
      stats: {
        title: 'Statistics',
        pixelsPlaced: 'Pixels Placed',
        countryRank: 'Country Rank',
        globalRank: 'Global Rank',
        todayPixels: 'Today\'s Pixels',
        contribution: 'Your Contribution',
      },
      errors: {
        connection: 'Connection error',
        auth: 'Authentication failed',
        noCountry: 'Please select a country first',
        tapFailed: 'Failed to place pixel',
      },
    },
  },
  ru: {
    translation: {
      game: {
        title: 'Битва Флагов',
        selectCountry: 'Выберите Страну',
        search: 'Поиск страны...',
        energy: 'Энергия',
        progress: 'заполнено',
        leaderboard: 'Рейтинг',
        rank: 'Место',
        country: 'Страна',
        players: 'Игроки',
        yourCountry: 'Ваша Страна',
        attack: 'Атака',
        defend: 'Защита',
        tap: 'Тап для пикселя',
        noEnergy: 'Нет энергии! Подождите или купите',
        connecting: 'Подключение...',
        reconnecting: 'Переподключение...',
        offline: 'Офлайн. Проверьте соединение',
      },
      shop: {
        title: 'Магазин Энергии',
        energy: 'энергии',
        buy: 'Купить',
        vip: 'VIP Подписка',
        vipDesc: '• 200 макс. энергии\n• 2x быстрее восстановление\n• Эксклюзивные эффекты',
        vipPrice: '100 Stars/неделя',
        dailyBonus: 'Ежедневный Бонус',
        claim: 'Получить +50 Энергии',
        claimed: 'Получено! Приходите завтра',
      },
      stats: {
        title: 'Статистика',
        pixelsPlaced: 'Пикселей Размещено',
        countryRank: 'Место в Стране',
        globalRank: 'Глобальное Место',
        todayPixels: 'Пикселей Сегодня',
        contribution: 'Ваш Вклад',
      },
      errors: {
        connection: 'Ошибка соединения',
        auth: 'Ошибка авторизации',
        noCountry: 'Сначала выберите страну',
        tapFailed: 'Не удалось разместить пиксель',
      },
    },
  },
  es: {
    translation: {
      game: {
        title: 'Batalla de Banderas',
        selectCountry: 'Selecciona Tu País',
        search: 'Buscar país...',
        energy: 'Energía',
        progress: 'completado',
        leaderboard: 'Clasificación',
        rank: 'Rango',
        country: 'País',
        players: 'Jugadores',
        yourCountry: 'Tu País',
        attack: 'Atacar',
        defend: 'Defender',
        tap: 'Toca para colocar píxel',
        noEnergy: '¡Sin energía! Espera o compra más',
        connecting: 'Conectando...',
        reconnecting: 'Reconectando...',
        offline: 'Sin conexión. Verifica tu internet',
      },
      shop: {
        title: 'Tienda de Energía',
        energy: 'energía',
        buy: 'Comprar',
        vip: 'Suscripción VIP',
        vipDesc: '• 200 energía máxima\n• 2x recuperación más rápida\n• Efectos exclusivos',
        vipPrice: '100 Stars/semana',
        dailyBonus: 'Bono Diario',
        claim: 'Reclamar +50 Energía',
        claimed: '¡Reclamado! Vuelve mañana',
      },
      stats: {
        title: 'Estadísticas',
        pixelsPlaced: 'Píxeles Colocados',
        countryRank: 'Rango del País',
        globalRank: 'Rango Global',
        todayPixels: 'Píxeles de Hoy',
        contribution: 'Tu Contribución',
      },
      errors: {
        connection: 'Error de conexión',
        auth: 'Error de autenticación',
        noCountry: 'Primero selecciona un país',
        tapFailed: 'Error al colocar píxel',
      },
    },
  },
};

// Определяем язык из Telegram или браузера
const detectLanguage = () => {
  const tgLang = window.Telegram?.WebApp?.initDataUnsafe?.user?.language_code;
  const browserLang = navigator.language.substring(0, 2);
  
  const lang = tgLang || browserLang || 'en';
  
  // Проверяем, есть ли у нас этот язык
  if (resources[lang as keyof typeof resources]) {
    return lang;
  }
  
  return 'en';
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: detectLanguage(),
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;