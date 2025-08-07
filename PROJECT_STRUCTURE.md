# World Flag Battle - Структура проекта

## Архитектура приложения

```
BattleMap/
├── frontend/               # React приложение (Telegram Mini App)
│   ├── src/
│   │   ├── components/    # React компоненты
│   │   ├── hooks/        # Custom React hooks
│   │   ├── services/     # API и WebSocket сервисы
│   │   ├── store/        # Zustand state management
│   │   ├── utils/        # Утилиты и хелперы
│   │   ├── locales/      # Файлы локализации
│   │   ├── types/        # TypeScript типы
│   │   └── assets/       # Изображения, флаги
│   └── public/
│
├── backend/               # Node.js сервер
│   ├── src/
│   │   ├── controllers/  # Контроллеры API
│   │   ├── services/     # Бизнес-логика
│   │   ├── models/       # Prisma модели
│   │   ├── middleware/   # Express middleware
│   │   ├── utils/        # Утилиты
│   │   └── websocket/    # Socket.io логика
│   └── prisma/           # Схема БД
│
└── shared/               # Общий код между frontend и backend
    └── types/           # Общие TypeScript типы
```

## Технический стек

### Frontend
- **React 18** - UI библиотека
- **TypeScript** - Типизация
- **Vite** - Сборщик
- **Tailwind CSS** - Стилизация
- **Zustand** - State management
- **Socket.io-client** - WebSocket клиент
- **i18next** - Локализация
- **Canvas API** - Отрисовка карты

### Backend
- **Node.js** - Runtime
- **Express** - Web framework
- **Socket.io** - Real-time связь
- **Prisma** - ORM
- **PostgreSQL** - База данных
- **Redis** - Кеширование (опционально)

### Инфраструктура
- **Vercel** - Frontend хостинг
- **Railway/Render** - Backend хостинг
- **Supabase** - PostgreSQL хостинг
- **GitHub Actions** - CI/CD

## Основные модули

### 1. Карта мира (Map Engine)
- Canvas-based рендеринг
- Оптимизированный zoom/pan
- Батчинг обновлений пикселей
- Кеширование видимой области

### 2. Система энергии
- Автоматическое восстановление
- Покупка через Telegram Stars
- Ежедневные бонусы

### 3. Real-time синхронизация
- WebSocket подключение
- Батчинг тапов (каждые 2 сек)
- Оптимистичные обновления UI
- Автореконнект

### 4. Telegram интеграция
- Mini App API
- Авторизация через initData
- Платежи через Stars
- Haptic feedback

## Оптимизации

### Производительность
- Virtual scrolling для больших списков
- Debouncing/throttling событий
- Lazy loading компонентов
- Оффскрин рендеринг карты

### Сеть
- Батчинг запросов
- Компрессия WebSocket сообщений
- CDN для статики
- Service Worker кеширование

### UX
- Оптимистичные обновления
- Skeleton screens
- Progressive enhancement
- Offline режим с очередью