-- ОЧИСТКА И ПЕРЕСОЗДАНИЕ БАЗЫ ДАННЫХ
-- Выполните этот скрипт в Supabase SQL Editor

-- 1. Удаляем все внешние ключи
ALTER TABLE IF EXISTS "User" DROP CONSTRAINT IF EXISTS "User_countryId_fkey";
ALTER TABLE IF EXISTS "Pixel" DROP CONSTRAINT IF EXISTS "Pixel_countryId_fkey";
ALTER TABLE IF EXISTS "Pixel" DROP CONSTRAINT IF EXISTS "Pixel_placedBy_fkey";
ALTER TABLE IF EXISTS "Purchase" DROP CONSTRAINT IF EXISTS "Purchase_userId_fkey";
ALTER TABLE IF EXISTS "Activity" DROP CONSTRAINT IF EXISTS "Activity_userId_fkey";

-- 2. Удаляем все таблицы
DROP TABLE IF EXISTS "Activity" CASCADE;
DROP TABLE IF EXISTS "Purchase" CASCADE;
DROP TABLE IF EXISTS "Pixel" CASCADE;
DROP TABLE IF EXISTS "User" CASCADE;
DROP TABLE IF EXISTS "Country" CASCADE;
DROP TABLE IF EXISTS "Season" CASCADE;

-- 3. Создаем таблицы заново

-- Таблица стран
CREATE TABLE "Country" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameRu" TEXT NOT NULL,
    "nameEs" TEXT,
    "flagSvg" TEXT,
    "color" TEXT NOT NULL,
    "totalPixels" INTEGER NOT NULL,
    "filledPixels" INTEGER NOT NULL DEFAULT 0,
    "minX" INTEGER NOT NULL,
    "minY" INTEGER NOT NULL,
    "maxX" INTEGER NOT NULL,
    "maxY" INTEGER NOT NULL,
    "geoJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Country_pkey" PRIMARY KEY ("id")
);

-- Таблица пользователей
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "telegramId" TEXT NOT NULL,
    "username" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT,
    "languageCode" TEXT NOT NULL DEFAULT 'en',
    "countryId" TEXT,
    "energy" INTEGER NOT NULL DEFAULT 50,
    "maxEnergy" INTEGER NOT NULL DEFAULT 100,
    "lastEnergyUpdate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastDailyBonus" TIMESTAMP(3),
    "pixelsPlaced" INTEGER NOT NULL DEFAULT 0,
    "isVip" BOOLEAN NOT NULL DEFAULT false,
    "vipExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- Таблица пикселей
CREATE TABLE "Pixel" (
    "id" TEXT NOT NULL,
    "x" INTEGER NOT NULL,
    "y" INTEGER NOT NULL,
    "countryId" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "placedBy" TEXT NOT NULL,
    "isAttack" BOOLEAN NOT NULL DEFAULT false,
    "placedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Pixel_pkey" PRIMARY KEY ("id")
);

-- Таблица покупок
CREATE TABLE "Purchase" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "stars" INTEGER NOT NULL,
    "invoiceId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Purchase_pkey" PRIMARY KEY ("id")
);

-- Таблица активности
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- Таблица сезонов
CREATE TABLE "Season" (
    "id" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "winners" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Season_pkey" PRIMARY KEY ("id")
);

-- Уникальные индексы
CREATE UNIQUE INDEX "Country_code_key" ON "Country"("code");
CREATE UNIQUE INDEX "User_telegramId_key" ON "User"("telegramId");
CREATE UNIQUE INDEX "Pixel_x_y_key" ON "Pixel"("x", "y");
CREATE UNIQUE INDEX "Season_number_key" ON "Season"("number");

-- Обычные индексы
CREATE INDEX "Pixel_countryId_idx" ON "Pixel"("countryId");
CREATE INDEX "Pixel_placedBy_idx" ON "Pixel"("placedBy");
CREATE INDEX "Purchase_userId_idx" ON "Purchase"("userId");
CREATE INDEX "Activity_userId_idx" ON "Activity"("userId");
CREATE INDEX "Activity_createdAt_idx" ON "Activity"("createdAt");

-- Внешние ключи
ALTER TABLE "User" ADD CONSTRAINT "User_countryId_fkey" 
    FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Pixel" ADD CONSTRAINT "Pixel_countryId_fkey" 
    FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Pixel" ADD CONSTRAINT "Pixel_placedBy_fkey" 
    FOREIGN KEY ("placedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Activity" ADD CONSTRAINT "Activity_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Вставка данных стран
INSERT INTO "Country" ("id", "code", "name", "nameRu", "color", "totalPixels", "minX", "minY", "maxX", "maxY") VALUES
('clz1', 'RU', 'Russia', 'Россия', '#0033A0', 5000, 0, 0, 200, 100),
('clz2', 'US', 'United States', 'США', '#B22234', 4500, 200, 0, 400, 100),
('clz3', 'CN', 'China', 'Китай', '#DE2910', 4500, 400, 0, 600, 100),
('clz4', 'CA', 'Canada', 'Канада', '#FF0000', 4000, 600, 0, 800, 100),
('clz5', 'BR', 'Brazil', 'Бразилия', '#009C3B', 4000, 800, 0, 1000, 100),
('clz6', 'AU', 'Australia', 'Австралия', '#012169', 3500, 1000, 0, 1200, 100),
('clz7', 'IN', 'India', 'Индия', '#FF9933', 3500, 1200, 0, 1400, 100),
('clz8', 'AR', 'Argentina', 'Аргентина', '#74ACDF', 3000, 1400, 0, 1600, 100),
('clz9', 'KZ', 'Kazakhstan', 'Казахстан', '#00AFCA', 3000, 1600, 0, 1800, 100),
('clz10', 'DZ', 'Algeria', 'Алжир', '#006233', 2500, 1800, 0, 2000, 100),
('clz11', 'MX', 'Mexico', 'Мексика', '#006847', 2500, 0, 100, 200, 200),
('clz12', 'ID', 'Indonesia', 'Индонезия', '#FF0000', 2500, 200, 100, 400, 200),
('clz13', 'SA', 'Saudi Arabia', 'Саудовская Аравия', '#006C35', 2500, 400, 100, 600, 200),
('clz14', 'LY', 'Libya', 'Ливия', '#000000', 2000, 600, 100, 800, 200),
('clz15', 'IR', 'Iran', 'Иран', '#239F40', 2000, 800, 100, 1000, 200),
('clz16', 'MN', 'Mongolia', 'Монголия', '#DA2032', 2000, 1000, 100, 1200, 200),
('clz17', 'PE', 'Peru', 'Перу', '#D91023', 2000, 1200, 100, 1400, 200),
('clz18', 'NE', 'Niger', 'Нигер', '#E05206', 1500, 1400, 100, 1600, 200),
('clz19', 'TD', 'Chad', 'Чад', '#002664', 1500, 1600, 100, 1800, 200),
('clz20', 'AO', 'Angola', 'Ангола', '#CC092F', 1500, 1800, 100, 2000, 200),
('clz21', 'ML', 'Mali', 'Мали', '#14B53A', 1500, 0, 200, 200, 300),
('clz22', 'ZA', 'South Africa', 'ЮАР', '#007A4D', 1500, 200, 200, 400, 300),
('clz23', 'CO', 'Colombia', 'Колумбия', '#FCD116', 1500, 400, 200, 600, 300),
('clz24', 'ET', 'Ethiopia', 'Эфиопия', '#009B3A', 1500, 600, 200, 800, 300),
('clz25', 'BO', 'Bolivia', 'Боливия', '#D52B1E', 1500, 800, 200, 1000, 300),
('clz26', 'MR', 'Mauritania', 'Мавритания', '#006233', 1000, 1000, 200, 1200, 300),
('clz27', 'EG', 'Egypt', 'Египет', '#CE1126', 1000, 1200, 200, 1400, 300),
('clz28', 'TZ', 'Tanzania', 'Танзания', '#1EB53A', 1000, 1400, 200, 1600, 300),
('clz29', 'NG', 'Nigeria', 'Нигерия', '#008751', 1000, 1600, 200, 1800, 300),
('clz30', 'VE', 'Venezuela', 'Венесуэла', '#FFCC00', 1000, 1800, 200, 2000, 300),
('clz31', 'PK', 'Pakistan', 'Пакистан', '#01411C', 1000, 0, 300, 200, 400),
('clz32', 'NA', 'Namibia', 'Намибия', '#003580', 1000, 200, 300, 400, 400),
('clz33', 'MZ', 'Mozambique', 'Мозамбик', '#007168', 1000, 400, 300, 600, 400),
('clz34', 'TR', 'Turkey', 'Турция', '#E30A17', 1000, 600, 300, 800, 400),
('clz35', 'CL', 'Chile', 'Чили', '#0039A6', 1000, 800, 300, 1000, 400),
('clz36', 'ZM', 'Zambia', 'Замбия', '#198A00', 1000, 1000, 300, 1200, 400),
('clz37', 'MM', 'Myanmar', 'Мьянма', '#FFCD00', 1000, 1200, 300, 1400, 400),
('clz38', 'AF', 'Afghanistan', 'Афганистан', '#000000', 1000, 1400, 300, 1600, 400),
('clz39', 'SO', 'Somalia', 'Сомали', '#4189DD', 1000, 1600, 300, 1800, 400),
('clz40', 'CF', 'Central African Republic', 'ЦАР', '#003082', 1000, 1800, 300, 2000, 400),
('clz41', 'UA', 'Ukraine', 'Украина', '#005BBB', 1000, 0, 400, 200, 500),
('clz42', 'MG', 'Madagascar', 'Мадагаскар', '#FC3D32', 1000, 200, 400, 400, 500),
('clz43', 'BW', 'Botswana', 'Ботсвана', '#75AADB', 1000, 400, 400, 600, 500),
('clz44', 'KE', 'Kenya', 'Кения', '#BB0000', 1000, 600, 400, 800, 500),
('clz45', 'FR', 'France', 'Франция', '#002395', 1000, 800, 400, 1000, 500),
('clz46', 'YE', 'Yemen', 'Йемен', '#CE1126', 1000, 1000, 400, 1200, 500),
('clz47', 'TH', 'Thailand', 'Таиланд', '#A51931', 1000, 1200, 400, 1400, 500),
('clz48', 'ES', 'Spain', 'Испания', '#AA151B', 1000, 1400, 400, 1600, 500),
('clz49', 'TM', 'Turkmenistan', 'Туркменистан', '#00843D', 1000, 1600, 400, 1800, 500),
('clz50', 'CM', 'Cameroon', 'Камерун', '#007A5E', 1000, 1800, 400, 2000, 500);

-- Создание первого сезона
INSERT INTO "Season" ("id", "number", "startedAt", "isActive") 
VALUES ('season1', 1, CURRENT_TIMESTAMP, true);

-- ГОТОВО!