# 🚀 ФИНАЛЬНЫЕ ШАГИ - World Flag Battle

## ✅ Что уже готово:
- Код полностью готов к деплою
- Telegram бот настроен: @Flagbattle_bot
- Git репозиторий инициализирован

## 📋 Осталось сделать (15 минут):

### 1️⃣ Создайте репозиторий на GitHub (2 минуты)

1. Откройте: https://github.com/new
2. Repository name: `flagbattle`
3. Выберите: **Private** или **Public**
4. **НЕ** добавляйте README, .gitignore или License
5. Нажмите **Create repository**

### 2️⃣ Загрузите код на GitHub (1 минута)

Выполните эти команды в терминале:

```bash
cd /Users/nikita/Desktop/Apps/BattleMap
git remote add origin https://github.com/Raw3hape/flagbattle.git
git push -u origin main
```

Если попросит логин/пароль, используйте Personal Access Token от GitHub.

### 3️⃣ Supabase - База данных (3 минуты)

1. Откройте: https://supabase.com
2. Нажмите **"Start your project"**
3. Войдите через GitHub
4. **Create new project**:
   - Organization: выберите или создайте
   - Project name: `flagbattle`
   - Database Password: **запишите пароль!** (например: `FlagBattle2024!`)
   - Region: `West US (North California)`
5. Нажмите **Create new project**
6. Подождите ~2 минуты
7. Перейдите в **Settings → Database**
8. Скопируйте **Connection string** (URI)
9. Замените `[YOUR-PASSWORD]` на ваш пароль

**Сохраните DATABASE_URL:**
```
postgresql://postgres:ВАШ_ПАРОЛЬ@db.xxxxxxxxxxxx.supabase.co:5432/postgres
```

### 4️⃣ Render - Backend (5 минут)

1. Откройте: https://render.com
2. **Sign up** с GitHub
3. Нажмите **New +** → **Web Service**
4. **Connect GitHub** и выберите `Raw3hape/flagbattle`
5. Заполните:
   - **Name**: `flagbattle-backend`
   - **Root Directory**: `backend`
   - **Environment**: `Node`
   - **Build Command**: 
   ```
   npm install && npm run build && npx prisma migrate deploy && npm run seed
   ```
   - **Start Command**: `npm start`
6. Выберите **Free** план
7. **Environment Variables** (нажмите Add Environment Variable):

| Key | Value |
|-----|-------|
| DATABASE_URL | `строка из Supabase (шаг 3)` |
| JWT_SECRET | `supersecret_flagbattle_2024_jwt_key_8213774739` |
| TELEGRAM_BOT_TOKEN | `8213774739:AAF8pFq6GmfhQY-NGSnqRH5u5PpRQNqU2kc` |
| FRONTEND_URL | `https://flagbattle.vercel.app` |
| NODE_ENV | `production` |

8. Нажмите **Create Web Service**
9. Подождите деплоя (~5 минут)
10. **Скопируйте URL** (например: `https://flagbattle-backend.onrender.com`)

### 5️⃣ Vercel - Frontend (3 минуты)

1. Откройте: https://vercel.com
2. **Sign up** с GitHub
3. Нажмите **Add New...** → **Project**
4. **Import** `Raw3hape/flagbattle`
5. Настройки:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `frontend`
6. **Environment Variables**:

| Key | Value |
|-----|-------|
| VITE_API_URL | `https://flagbattle-backend.onrender.com/api` |
| VITE_WS_URL | `wss://flagbattle-backend.onrender.com` |

7. Нажмите **Deploy**
8. Подождите (~2 минуты)
9. **Скопируйте URL** (например: `https://flagbattle.vercel.app`)

### 6️⃣ Настройка Telegram бота (1 минута)

1. Откройте @BotFather
2. Отправьте команды:
```
/mybots
@Flagbattle_bot
Bot Settings
Menu Button
Configure menu button
```
3. Введите:
   - **Label**: `🎮 Играть`
   - **URL**: URL из Vercel (например: `https://flagbattle.vercel.app`)

### 7️⃣ Финальная проверка

1. Если Render URL отличается от `flagbattle-backend.onrender.com`:
   - Вернитесь в Vercel → Settings → Environment Variables
   - Обновите `VITE_API_URL` и `VITE_WS_URL`
   - Redeploy

2. Откройте @Flagbattle_bot
3. Нажмите кнопку **🎮 Играть**
4. Игра должна открыться!

## 🎉 ГОТОВО!

Ваша игра доступна по адресу:
- **Бот**: https://t.me/Flagbattle_bot
- **Web**: https://flagbattle.vercel.app

## ⚠️ Важные моменты:

1. **Render засыпает** через 15 минут неактивности (бесплатный план)
   - Первый запрос займёт ~30 секунд
   - Решение: используйте https://uptimerobot.com для пинга каждые 5 минут

2. **Если что-то не работает**:
   - Проверьте логи в Render Dashboard
   - Проверьте логи в Vercel Functions
   - Убедитесь что DATABASE_URL правильный

## 📊 Мониторинг:

- **Backend логи**: https://dashboard.render.com
- **Frontend логи**: https://vercel.com/dashboard
- **База данных**: https://supabase.com/dashboard

## 🔄 Обновление кода:

```bash
git add .
git commit -m "Update"
git push
```

Vercel и Render автоматически передеплоят при push!