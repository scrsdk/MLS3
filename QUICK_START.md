# 🚀 БЫСТРЫЙ СТАРТ - World Flag Battle Online

## За 15 минут запустите игру онлайн БЕСПЛАТНО!

### ⚡ Что нужно сделать:

1. **GitHub** (2 мин)
   - Создайте репозиторий
   - Загрузите код

2. **Supabase** (3 мин) 
   - Создайте проект
   - Скопируйте DATABASE_URL

3. **Render** (5 мин)
   - Импортируйте из GitHub
   - Вставьте переменные окружения
   - Деплой backend

4. **Vercel** (3 мин)
   - Импортируйте из GitHub  
   - Вставьте API URL
   - Деплой frontend

5. **Telegram Bot** (2 мин)
   - Создайте бота у @BotFather
   - Настройте Mini App URL

### 📝 Переменные окружения:

**Backend (Render):**
```
DATABASE_URL=postgresql://postgres:пароль@db.xxx.supabase.co:5432/postgres
JWT_SECRET=любая_случайная_строка
TELEGRAM_BOT_TOKEN=токен_от_botfather
FRONTEND_URL=https://ваш-проект.vercel.app
NODE_ENV=production
```

**Frontend (Vercel):**
```
VITE_API_URL=https://ваш-backend.onrender.com/api
VITE_WS_URL=wss://ваш-backend.onrender.com
```

### ✅ Готово!

Откройте бота в Telegram и играйте!

---

**Подробная инструкция:** [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)