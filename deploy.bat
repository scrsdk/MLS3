@echo off
echo ================================================
echo 🎮 World Flag Battle - Автоматическая установка
echo ================================================
echo.

REM Проверка зависимостей
where git >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Git не установлен. Установите: https://git-scm.com
    pause
    exit /b
)

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Node.js не установлен. Установите: https://nodejs.org
    pause
    exit /b
)

echo 📝 Сбор необходимой информации...
echo.

REM GitHub
echo 1️⃣ GitHub
set /p GITHUB_USERNAME="Ваш GitHub username: "
if "%GITHUB_USERNAME%"=="" (
    echo ❌ GitHub username обязателен!
    pause
    exit /b
)

set /p REPO_NAME="Название репозитория [battlemap]: "
if "%REPO_NAME%"=="" set REPO_NAME=battlemap

REM Telegram Bot
echo.
echo 2️⃣ Telegram Bot
echo    Откройте @BotFather и создайте бота (/newbot)
set /p TELEGRAM_BOT_TOKEN="Token от @BotFather: "
set /p TELEGRAM_BOT_USERNAME="Username бота (без @): "

REM Генерация секрета
set JWT_SECRET=secret_key_%RANDOM%%RANDOM%

echo.
echo ✅ Информация собрана!
echo.

REM Инициализация Git
echo 📦 Инициализация Git репозитория...
git init
git add .
git commit -m "🚀 Initial commit - World Flag Battle"

echo.
echo 📤 Создание репозитория на GitHub...
echo.
echo ⚠️  Теперь нужно:
echo 1. Перейдите на https://github.com/new
echo 2. Создайте репозиторий '%REPO_NAME%'
echo 3. НЕ инициализируйте с README
echo.
pause

REM Пуш на GitHub
git remote add origin https://github.com/%GITHUB_USERNAME%/%REPO_NAME%.git
git branch -M main
git push -u origin main

echo.
echo ✅ Код загружен на GitHub!
echo.
echo ================================================
echo ✅ АВТОМАТИЧЕСКАЯ ЧАСТЬ ЗАВЕРШЕНА!
echo ================================================
echo.
echo 📋 Теперь следуйте инструкциям в DEPLOY_INSTRUCTIONS.md
echo.
echo 🔗 Полезные ссылки:
echo    GitHub: https://github.com/%GITHUB_USERNAME%/%REPO_NAME%
echo    Supabase: https://supabase.com
echo    Render: https://render.com
echo    Vercel: https://vercel.com
echo.
pause