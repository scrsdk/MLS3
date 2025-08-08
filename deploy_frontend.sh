#!/bin/bash

echo "🚀 Начинаем деплой frontend на Vercel..."

# Переходим в директорию frontend
cd frontend

# Проверяем наличие Vercel CLI
if ! command -v vercel &> /dev/null; then
    echo "📦 Устанавливаем Vercel CLI..."
    npm i -g vercel
fi

# Создаем production build
echo "🔨 Создаем production сборку..."
npm run build

# Проверяем успешность сборки
if [ $? -ne 0 ]; then
    echo "❌ Ошибка при сборке проекта"
    exit 1
fi

echo "✅ Сборка завершена успешно"

# Информация о деплое
echo ""
echo "📋 Для деплоя на Vercel:"
echo "1. Выполните команду: vercel --prod"
echo "2. Следуйте инструкциям:"
echo "   - Set up and deploy: Y"
echo "   - Which scope: выберите ваш аккаунт"
echo "   - Link to existing project: N (если первый раз)"
echo "   - Project name: flagbattle-frontend"
echo "   - Directory: ./ (текущая)"
echo "   - Override settings: N"
echo ""
echo "3. После деплоя добавьте переменные окружения в Vercel Dashboard:"
echo "   VITE_API_URL = https://flagbattle-kpph.onrender.com/api"
echo "   VITE_WS_URL = wss://flagbattle-kpph.onrender.com"
echo ""
echo "🔗 Ваше приложение будет доступно по адресу, который выдаст Vercel"