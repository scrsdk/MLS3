# World Flag Battle - Руководство по разработке

## Быстрый старт

### Требования
- Node.js 18+
- npm или yarn
- PostgreSQL (или аккаунт Supabase)
- Telegram Bot (для тестирования Mini App)

### Установка

1. **Клонирование и установка зависимостей**
```bash
# Frontend
cd frontend
npm install

# Backend
cd ../backend
npm install
```

2. **Настройка окружения**

Frontend (.env):
```env
VITE_API_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3001
VITE_TELEGRAM_BOT_USERNAME=your_bot_name
```

Backend (.env):
```env
DATABASE_URL=postgresql://user:password@localhost:5432/battlemap
PORT=3001
JWT_SECRET=your_secret_key
TELEGRAM_BOT_TOKEN=your_bot_token
NODE_ENV=development
```

3. **Инициализация БД**
```bash
cd backend
npx prisma migrate dev
npx prisma generate
npm run seed # Заполнение начальными данными
```

4. **Запуск в dev режиме**
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

## Telegram Mini App настройка

### 1. Создание бота
1. Откройте @BotFather в Telegram
2. Создайте нового бота: `/newbot`
3. Сохраните токен

### 2. Настройка Mini App
```
/setmenubutton
Выберите вашего бота
Введите название кнопки: Play World Flag Battle
Введите URL: https://your-app.vercel.app
```

### 3. Локальная разработка
Используйте ngrok для тестирования:
```bash
npm install -g ngrok
ngrok http 5173
# Используйте полученный HTTPS URL в настройках бота
```

## Архитектура компонентов

### Frontend структура
```
src/
├── App.tsx                 # Главный компонент
├── components/
│   ├── Map/
│   │   ├── WorldMap.tsx   # Canvas карта
│   │   ├── MapControls.tsx # Управление картой
│   │   └── PixelGrid.tsx  # Сетка пикселей
│   ├── UI/
│   │   ├── EnergyBar.tsx  # Индикатор энергии
│   │   ├── CountryInfo.tsx # Информация о стране
│   │   └── Leaderboard.tsx # Таблица лидеров
│   └── Modals/
│       ├── CountrySelect.tsx # Выбор страны
│       └── Shop.tsx        # Магазин
├── hooks/
│   ├── useTelegram.ts     # Telegram API
│   ├── useWebSocket.ts    # Real-time связь
│   └── useEnergy.ts       # Логика энергии
└── services/
    ├── api.ts             # REST API
    ├── websocket.ts       # WebSocket
    └── telegram.ts        # Telegram SDK
```

### Backend структура
```
src/
├── app.ts                 # Express приложение
├── server.ts             # Точка входа
├── controllers/
│   ├── auth.controller.ts
│   ├── game.controller.ts
│   └── payment.controller.ts
├── services/
│   ├── game.service.ts   # Игровая логика
│   ├── energy.service.ts # Система энергии
│   └── map.service.ts    # Обработка карты
└── websocket/
    ├── connection.ts     # Управление соединениями
    └── handlers.ts       # Обработчики событий
```

## API Endpoints

### Аутентификация
```
POST /api/auth/telegram
Body: { initData: string }
Response: { token: string, user: User }
```

### Игровые данные
```
GET /api/game/map
Response: { countries: Country[], pixels: Pixel[] }

POST /api/game/tap
Body: { countryId: string, x: number, y: number }
Response: { success: boolean, energy: number }

GET /api/game/leaderboard
Response: { countries: LeaderboardEntry[] }
```

### Энергия
```
GET /api/energy/status
Response: { current: number, max: number, nextRestore: Date }

POST /api/energy/claim-daily
Response: { energy: number, nextClaim: Date }
```

## WebSocket события

### Client → Server
```javascript
// Подключение
socket.emit('auth', { token: string })

// Тап
socket.emit('tap', { countryId, x, y })

// Подписка на страну
socket.emit('subscribe', { countryId })
```

### Server → Client
```javascript
// Обновление пикселей
socket.on('pixels', { pixels: Pixel[] })

// Обновление энергии
socket.on('energy', { current, max })

// Обновление лидерборда
socket.on('leaderboard', { countries: LeaderboardEntry[] })
```

## Оптимизация производительности

### Canvas рендеринг
```javascript
// Использование offscreen canvas
const offscreen = document.createElement('canvas');
const offCtx = offscreen.getContext('2d');

// Рендерим в offscreen
offCtx.drawImage(/* ... */);

// Копируем на основной canvas
mainCtx.drawImage(offscreen, 0, 0);
```

### Батчинг обновлений
```javascript
// Собираем тапы
const tapQueue = [];

// Отправляем батчем
setInterval(() => {
  if (tapQueue.length > 0) {
    socket.emit('taps', tapQueue);
    tapQueue.length = 0;
  }
}, 2000);
```

## Деплой

### Frontend (Vercel)
1. Push в GitHub
2. Импорт проекта в Vercel
3. Настройка переменных окружения
4. Автодеплой при push в main

### Backend (Railway/Render)
1. Создание проекта
2. Подключение GitHub репозитория
3. Настройка переменных окружения
4. Добавление PostgreSQL

### База данных (Supabase)
1. Создание проекта
2. Копирование DATABASE_URL
3. Запуск миграций

## Тестирование

### Unit тесты
```bash
npm run test
```

### E2E тесты
```bash
npm run test:e2e
```

### Нагрузочное тестирование
```bash
npm run test:load
```

## Мониторинг

### Метрики
- Количество активных игроков
- Тапов в секунду
- Средняя задержка WebSocket
- Использование памяти/CPU

### Логирование
- Ошибки API
- WebSocket дисконнекты
- Подозрительная активность
- Платежи

## Частые проблемы

### CORS ошибки
Добавьте в backend:
```javascript
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));
```

### WebSocket не подключается
Проверьте:
- Правильный WS URL
- Firewall/proxy настройки
- SSL сертификаты (wss:// для production)

### Telegram initData validation
```javascript
// Проверка подписи
const secret = crypto
  .createHmac('sha256', 'WebAppData')
  .update(botToken)
  .digest();

const hash = crypto
  .createHmac('sha256', secret)
  .update(dataCheckString)
  .digest('hex');
```