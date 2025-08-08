-- Включаем Row Level Security для всех таблиц
ALTER TABLE "Activity" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Country" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Pixel" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Purchase" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Season" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;

-- Создаем политики для публичного доступа
-- (так как мы используем JWT токены на стороне сервера)

-- Country - все могут читать
CREATE POLICY "Countries are viewable by everyone" ON "Country"
  FOR ALL USING (true);

-- User - все операции разрешены (аутентификация на backend)
CREATE POLICY "Users can be created and updated" ON "User"
  FOR ALL USING (true);

-- Pixel - все операции разрешены
CREATE POLICY "Pixels can be placed by anyone" ON "Pixel"
  FOR ALL USING (true);

-- Season - все могут читать
CREATE POLICY "Seasons are viewable by everyone" ON "Season"
  FOR ALL USING (true);

-- Purchase - все операции разрешены
CREATE POLICY "Purchases can be created" ON "Purchase"
  FOR ALL USING (true);

-- Activity - все операции разрешены
CREATE POLICY "Activities can be logged" ON "Activity"
  FOR ALL USING (true);