#!/bin/bash

# 🚀 АВТОМАТИЧЕСКИЙ ДЕПЛОЙ WORLD FLAG BATTLE
# Этот скрипт делает ВСЁ возможное автоматически

echo "🎮 WORLD FLAG BATTLE - АВТОДЕПЛОЙ"
echo "=================================="
echo ""

# Конфигурация
GITHUB_USER="Raw3hape"
REPO_NAME="flagbattle"
BOT_TOKEN="8213774739:AAF8pFq6GmfhQY-NGSnqRH5u5PpRQNqU2kc"
BOT_USERNAME="Flagbattle_bot"
JWT_SECRET="supersecret_flagbattle_2024_jwt_key_8213774739"

# 1. Проверяем GitHub CLI
if ! command -v gh &> /dev/null; then
    echo "📦 Устанавливаю GitHub CLI..."
    brew install gh
fi

# 2. Авторизация в GitHub
echo "🔐 Авторизация в GitHub..."
echo "Откроется браузер - разрешите доступ"
gh auth login --web

# 3. Создаём репозиторий
echo "📂 Создаю репозиторий на GitHub..."
gh repo create $REPO_NAME --public --source=. --remote=origin --push

# 4. Открываем нужные страницы
echo ""
echo "🌐 Открываю страницы для регистрации..."
echo ""

# Supabase
echo "1️⃣ SUPABASE (База данных)"
open "https://supabase.com/dashboard/new/project"
echo "   - Project name: flagbattle"
echo "   - Password: FlagBattle2024!"
echo "   - Region: West US"
echo ""
read -p "Нажмите Enter когда создадите проект Supabase..."

echo "Введите DATABASE_URL из Supabase (Settings → Database → Connection string):"
read DATABASE_URL

# Render
echo ""
echo "2️⃣ RENDER (Backend)"
open "https://render.com/deploy?repo=https://github.com/$GITHUB_USER/$REPO_NAME"

cat > render_env.txt << EOF
===== СКОПИРУЙТЕ ЭТИ ПЕРЕМЕННЫЕ В RENDER =====

DATABASE_URL=$DATABASE_URL
JWT_SECRET=$JWT_SECRET
TELEGRAM_BOT_TOKEN=$BOT_TOKEN
FRONTEND_URL=https://$REPO_NAME.vercel.app
NODE_ENV=production

Build Command:
npm install && npm run build && npx prisma migrate deploy && npm run seed

Start Command:
npm start

Root Directory:
backend

================================================
EOF

echo "Переменные сохранены в файл: render_env.txt"
open render_env.txt
echo ""
read -p "Нажмите Enter когда задеплоите на Render..."

echo "Введите URL вашего Render backend (например: https://flagbattle-backend.onrender.com):"
read BACKEND_URL

# Vercel
echo ""
echo "3️⃣ VERCEL (Frontend)"

# Создаём специальную ссылку для Vercel
VERCEL_URL="https://vercel.com/new/clone?repository-url=https://github.com/$GITHUB_USER/$REPO_NAME&project-name=$REPO_NAME&root-directory=frontend&env=VITE_API_URL,VITE_WS_URL&envDescription=Backend%20URLs&envValue-VITE_API_URL=$BACKEND_URL/api&envValue-VITE_WS_URL=wss://${BACKEND_URL#https://}"

echo "Открываю Vercel с предзаполненными настройками..."
open "$VERCEL_URL"

cat > vercel_env.txt << EOF
===== ПЕРЕМЕННЫЕ ДЛЯ VERCEL =====

VITE_API_URL=$BACKEND_URL/api
VITE_WS_URL=wss://${BACKEND_URL#https://}

==================================
EOF

echo "Переменные сохранены в файл: vercel_env.txt"
open vercel_env.txt
echo ""
read -p "Нажмите Enter когда задеплоите на Vercel..."

echo "Введите URL вашего Vercel frontend (например: https://flagbattle.vercel.app):"
read FRONTEND_URL

# 5. Настройка Telegram бота
echo ""
echo "4️⃣ НАСТРОЙКА TELEGRAM БОТА"
echo ""
echo "Сейчас откроется Telegram Web"
echo "Отправьте боту @BotFather эти команды:"
echo ""
cat > telegram_commands.txt << EOF
/mybots
@$BOT_USERNAME
Bot Settings
Menu Button
Configure menu button

Затем введите:
Label: 🎮 Играть
URL: $FRONTEND_URL
EOF

open "https://web.telegram.org/k/#@BotFather"
open telegram_commands.txt

echo ""
echo "=================================="
echo "✅ АВТОМАТИЧЕСКАЯ ЧАСТЬ ЗАВЕРШЕНА!"
echo "=================================="
echo ""
echo "📱 Ваша игра доступна:"
echo "   Бот: https://t.me/$BOT_USERNAME"
echo "   Web: $FRONTEND_URL"
echo ""
echo "📊 Панели управления:"
echo "   GitHub: https://github.com/$GITHUB_USER/$REPO_NAME"
echo "   Render: https://dashboard.render.com"
echo "   Vercel: https://vercel.com/dashboard"
echo "   Supabase: https://supabase.com/dashboard"
echo ""
echo "🔄 Для обновления кода:"
echo "   git add ."
echo "   git commit -m 'Update'"
echo "   git push"
echo ""
echo "🎮 ГОТОВО! Можете играть!"