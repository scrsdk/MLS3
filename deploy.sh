#!/bin/bash

# 🚀 World Flag Battle - Автоматический деплой
# Этот скрипт автоматизирует весь процесс развертывания

echo "🎮 World Flag Battle - Автоматическая установка"
echo "================================================"
echo ""

# Проверка зависимостей
command -v git >/dev/null 2>&1 || { echo "❌ Git не установлен. Установите: https://git-scm.com"; exit 1; }
command -v node >/dev/null 2>&1 || { echo "❌ Node.js не установлен. Установите: https://nodejs.org"; exit 1; }

# Функция для ввода данных
prompt_with_default() {
    local prompt="$1"
    local default="$2"
    local response
    
    read -p "$prompt [$default]: " response
    echo "${response:-$default}"
}

echo "📝 Сбор необходимой информации..."
echo ""

# GitHub
echo "1️⃣ GitHub"
GITHUB_USERNAME=$(prompt_with_default "Ваш GitHub username" "")
if [ -z "$GITHUB_USERNAME" ]; then
    echo "❌ GitHub username обязателен!"
    exit 1
fi

REPO_NAME=$(prompt_with_default "Название репозитория" "battlemap")

# Telegram Bot
echo ""
echo "2️⃣ Telegram Bot"
echo "   Откройте @BotFather и создайте бота (/newbot)"
TELEGRAM_BOT_TOKEN=$(prompt_with_default "Token от @BotFather" "")
TELEGRAM_BOT_USERNAME=$(prompt_with_default "Username бота (без @)" "")

# Генерация секретов
JWT_SECRET=$(openssl rand -hex 32 2>/dev/null || echo "secret_key_$(date +%s)")

echo ""
echo "✅ Информация собрана!"
echo ""

# Создание .env файлов
echo "📁 Создание конфигурационных файлов..."

# Backend .env
cat > backend/.env.production << EOF
DATABASE_URL=\${DATABASE_URL}
PORT=3001
JWT_SECRET=$JWT_SECRET
TELEGRAM_BOT_TOKEN=$TELEGRAM_BOT_TOKEN
NODE_ENV=production
FRONTEND_URL=https://$REPO_NAME.vercel.app
EOF

# Frontend .env
cat > frontend/.env.production << EOF
VITE_API_URL=https://$REPO_NAME.onrender.com/api
VITE_WS_URL=wss://$REPO_NAME.onrender.com
VITE_TELEGRAM_BOT_USERNAME=$TELEGRAM_BOT_USERNAME
EOF

# Инициализация Git
echo "📦 Инициализация Git репозитория..."
git init
git add .
git commit -m "🚀 Initial commit - World Flag Battle"

# Создание репозитория на GitHub
echo ""
echo "📤 Создание репозитория на GitHub..."
echo ""
echo "⚠️  Теперь нужно:"
echo "1. Перейдите на https://github.com/new"
echo "2. Создайте репозиторий '$REPO_NAME'"
echo "3. НЕ инициализируйте с README"
echo ""
read -p "Нажмите Enter когда создадите репозиторий..."

# Пуш на GitHub
git remote add origin https://github.com/$GITHUB_USERNAME/$REPO_NAME.git
git branch -M main
git push -u origin main

echo ""
echo "✅ Код загружен на GitHub!"
echo ""

# Создание файла с инструкциями
cat > DEPLOY_INSTRUCTIONS.md << EOF
# 🚀 Инструкции для завершения деплоя

Код готов! Теперь нужно развернуть на хостингах:

## 1. Supabase (База данных) - 3 минуты

1. Перейдите на https://supabase.com
2. Нажмите "Start your project"
3. Войдите через GitHub
4. Создайте новый проект:
   - Name: battlemap
   - Password: запишите его!
   - Region: выберите ближайший
5. Подождите создания (~2 минуты)
6. Settings → Database → Connection string
7. Скопируйте строку и замените [YOUR-PASSWORD]

## 2. Render (Backend) - 5 минут

1. Перейдите на https://render.com
2. Войдите через GitHub
3. New+ → Web Service
4. Выберите репозиторий: $GITHUB_USERNAME/$REPO_NAME
5. Настройки:
   - Name: $REPO_NAME-backend
   - Root Directory: backend
   - Build: npm install && npm run build && npx prisma migrate deploy && npm run seed
   - Start: npm start
6. Environment Variables:
   - DATABASE_URL = (строка из Supabase)
   - JWT_SECRET = $JWT_SECRET
   - TELEGRAM_BOT_TOKEN = $TELEGRAM_BOT_TOKEN
   - FRONTEND_URL = https://$REPO_NAME.vercel.app
   - NODE_ENV = production
7. Create Web Service

## 3. Vercel (Frontend) - 3 минуты

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/$GITHUB_USERNAME/$REPO_NAME&root-directory=frontend&env=VITE_API_URL,VITE_WS_URL&envDescription=Backend%20URLs&envLink=https://github.com/$GITHUB_USERNAME/$REPO_NAME)

Или вручную:
1. Перейдите на https://vercel.com
2. Add New → Project
3. Import: $GITHUB_USERNAME/$REPO_NAME
4. Root Directory: frontend
5. Environment Variables:
   - VITE_API_URL = https://$REPO_NAME-backend.onrender.com/api
   - VITE_WS_URL = wss://$REPO_NAME-backend.onrender.com
6. Deploy

## 4. Telegram Bot

В @BotFather:
\`\`\`
/mybots
$TELEGRAM_BOT_USERNAME
Bot Settings → Menu Button
Название: Play 🎮
URL: https://$REPO_NAME.vercel.app
\`\`\`

## ✅ Готово!

Откройте бота: https://t.me/$TELEGRAM_BOT_USERNAME

---
JWT Secret: $JWT_SECRET
Bot Token: $TELEGRAM_BOT_TOKEN
EOF

echo "================================================"
echo "✅ АВТОМАТИЧЕСКАЯ ЧАСТЬ ЗАВЕРШЕНА!"
echo "================================================"
echo ""
echo "📋 Осталось сделать вручную (10-15 минут):"
echo ""
echo "1. Supabase - создать БД (3 мин)"
echo "2. Render - деплой backend (5 мин)"
echo "3. Vercel - деплой frontend (3 мин)"
echo "4. BotFather - настроить кнопку (2 мин)"
echo ""
echo "📖 Подробные инструкции в файле: DEPLOY_INSTRUCTIONS.md"
echo ""
echo "🔗 Полезные ссылки:"
echo "   GitHub: https://github.com/$GITHUB_USERNAME/$REPO_NAME"
echo "   Supabase: https://supabase.com"
echo "   Render: https://render.com"
echo "   Vercel: https://vercel.com"
echo ""