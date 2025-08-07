# 🚀 НАЖМИТЕ ЭТИ ССЫЛКИ ДЛЯ ДЕПЛОЯ

## ✅ Код уже на GitHub: https://github.com/Raw3hape/flagbattle

Теперь просто откройте эти ссылки по порядку:

---

## 1️⃣ SUPABASE - База данных (3 минуты)

### 👉 [СОЗДАТЬ БАЗУ ДАННЫХ](https://supabase.com/dashboard/new/project)

**Заполните:**
- Project name: `flagbattle`  
- Database Password: `FlagBattle2024!`
- Region: `West US (North California)`

**После создания:**
1. Settings → Database
2. Скопируйте **Connection string**
3. Замените `[YOUR-PASSWORD]` на `FlagBattle2024!`

**Сохраните DATABASE_URL:**
```
postgresql://postgres:FlagBattle2024!@db.xxxxx.supabase.co:5432/postgres
```

---

## 2️⃣ RENDER - Backend (5 минут)

### 👉 [ДЕПЛОЙ НА RENDER](https://render.com/deploy)

**После входа:**
1. New → Web Service
2. Connect GitHub → выберите `flagbattle`
3. **Заполните:**

| Поле | Значение |
|------|----------|
| Name | `flagbattle-backend` |
| Root Directory | `backend` |
| Build Command | `npm install && npm run build && npx prisma migrate deploy && npm run seed` |
| Start Command | `npm start` |

4. **Environment Variables** (кнопка Add Environment Variable):

```
DATABASE_URL = [вставьте из Supabase]
JWT_SECRET = supersecret_flagbattle_2024_jwt_key_8213774739
TELEGRAM_BOT_TOKEN = 8213774739:AAF8pFq6GmfhQY-NGSnqRH5u5PpRQNqU2kc
FRONTEND_URL = https://flagbattle.vercel.app
NODE_ENV = production
```

5. Create Web Service
6. **Скопируйте URL** (например: `https://flagbattle-backend.onrender.com`)

---

## 3️⃣ VERCEL - Frontend (2 минуты)

### 👉 [ДЕПЛОЙ НА VERCEL](https://vercel.com/new/clone?repository-url=https://github.com/Raw3hape/flagbattle&project-name=flagbattle&root-directory=frontend)

**После входа:**
1. Нажмите **Import**
2. **Environment Variables:**

```
VITE_API_URL = https://flagbattle-backend.onrender.com/api
VITE_WS_URL = wss://flagbattle-backend.onrender.com
```

⚠️ **Замените URL на ваш из Render!**

3. Deploy
4. **Скопируйте URL** (например: `https://flagbattle.vercel.app`)

---

## 4️⃣ TELEGRAM BOT - Настройка кнопки (1 минута)

### 👉 [ОТКРЫТЬ BOTFATHER](https://t.me/BotFather)

**Отправьте команды:**
```
/mybots
@Flagbattle_bot
Bot Settings
Menu Button
Configure menu button
```

**Введите:**
- Button text: `🎮 Играть`
- URL: `[URL из Vercel]`

---

## ✅ ГОТОВО!

### 🎮 Играть: https://t.me/Flagbattle_bot

---

## 🔧 Если что-то не работает:

1. **Render долго грузится?**
   - Это нормально при первом запуске (до 30 секунд)
   - Используйте [UptimeRobot](https://uptimerobot.com) для постоянной активности

2. **Ошибка подключения?**
   - Проверьте что в Vercel правильный URL от Render
   - Проверьте что в Render правильный DATABASE_URL от Supabase

3. **База данных не работает?**
   - Проверьте пароль в DATABASE_URL
   - Убедитесь что миграции прошли (смотрите логи Render)