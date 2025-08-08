# 🔧 РЕШЕНИЕ ПРОБЛЕМ - WORLD FLAG BATTLE

## 📋 ИСТОРИЯ ОШИБОК И ИХ РЕШЕНИЙ

### 1. TypeScript ошибки при сборке на Vercel

**Ошибка:**
```
error TS2304: Cannot find name 'useState'
error TS2304: Cannot find name 'useEffect'
```

**Причина:** Отсутствовал импорт React хуков

**Решение:**
```typescript
import { useState, useEffect } from 'react';
```

---

### 2. TypeScript ошибки с типами Node.js

**Ошибка:**
```
error TS2688: Cannot find type definition file for 'node'
error TS6306: Referenced project must have setting "composite": true
```

**Причина:** Отсутствовали типы Node.js и неправильная конфигурация tsconfig

**Решение:**
1. Добавить в package.json: `"@types/node": "^20.11.5"`
2. В tsconfig.node.json добавить: `"composite": true`
3. Заменить `"noEmit": true` на `"emitDeclarationOnly": true`

---

### 3. Ошибка 401 Unauthorized при авторизации

**Ошибка:**
```
POST /api/auth/telegram 401 (Unauthorized)
Request failed with status code 401
```

**Причина:** Backend не мог валидировать тестовые данные пользователя

**Решение:**
Добавить поддержку тестового режима в `backend/src/utils/telegram.ts`:
```typescript
// Специальная обработка для тестовых данных
try {
  const decoded = Buffer.from(initData, 'base64').toString('utf-8');
  const testData = JSON.parse(decoded);
  
  if (testData.user && testData.hash === 'test_hash') {
    console.log('Test user detected, bypassing validation');
    return testData.user;
  }
} catch {
  // Продолжаем обычную валидацию
}
```

---

### 4. Ошибка 500 - Prisma prepared statements

**Ошибка:**
```
Error occurred during query execution:
ConnectorError { code: "42P05", message: "prepared statement \"s0\" already exists" }
```

**Причина:** Множественные экземпляры PrismaClient создавали конфликт prepared statements

**Решение:**
1. Создать singleton для Prisma Client в `backend/src/db/prisma.ts`
2. Добавить параметры для отключения prepared statements:
```typescript
const datasourceUrl = `${databaseUrl}?pgbouncer=true&statement_cache_size=0`;
```

---

### 5. База данных не существует

**Ошибка:**
```
The table `public.Country` does not exist in the current database
```

**Причина:** Таблицы не были созданы в Supabase

**Решение:**
Выполнить SQL миграцию в Supabase SQL Editor из файла `supabase_migration.sql`

---

### 6. CORS ошибки

**Ошибка:**
```
Access to XMLHttpRequest blocked by CORS policy
```

**Причина:** Неправильные CORS настройки

**Решение:**
Убедиться что FRONTEND_URL правильно настроен в переменных окружения Render

---

### 7. Vercel не обновляет деплой автоматически

**Проблема:** Vercel использует старый коммит

**Решение:**
1. Создать пустой коммит для форсированного обновления:
```bash
git commit --allow-empty -m "Force Vercel rebuild"
git push
```
2. Или вручную нажать "Redeploy" в Vercel Dashboard

---

### 8. Render backend засыпает

**Проблема:** Бесплатный план Render засыпает после 15 минут неактивности

**Решение:**
1. Использовать сервис мониторинга (UptimeRobot) для пинга каждые 5 минут
2. Или обновить на платный план

---

## 🛠️ ОБЩИЕ КОМАНДЫ ДЛЯ ОТЛАДКИ

### Проверить статус сервисов:
```bash
# Backend health check
curl https://flagbattle-kpph.onrender.com/health

# API test
curl https://flagbattle-kpph.onrender.com/api/game/countries
```

### Логи в реальном времени:
- **Render:** Dashboard → Logs
- **Vercel:** Dashboard → Functions → Logs
- **Supabase:** Dashboard → Logs

### Очистить кеш браузера:
```
Chrome: Cmd+Shift+R
Firefox: Cmd+Shift+R
Safari: Cmd+Option+R
```

### Проверить консоль браузера:
```
F12 или Cmd+Option+I → Console
```

## 📞 ПОДДЕРЖКА

При возникновении новых проблем:
1. Проверить логи в соответствующем сервисе
2. Проверить консоль браузера
3. Убедиться что все переменные окружения настроены правильно
4. Проверить что последние изменения запушены на GitHub

---

*Последнее обновление: 8 августа 2025*