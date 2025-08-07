import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Упрощенные данные стран для MVP
const countries = [
  { code: 'RU', name: 'Russia', nameRu: 'Россия', color: '#0033A0', area: 17098242 },
  { code: 'US', name: 'United States', nameRu: 'США', color: '#B22234', area: 9833517 },
  { code: 'CN', name: 'China', nameRu: 'Китай', color: '#DE2910', area: 9596961 },
  { code: 'CA', name: 'Canada', nameRu: 'Канада', color: '#FF0000', area: 9984670 },
  { code: 'BR', name: 'Brazil', nameRu: 'Бразилия', color: '#009C3B', area: 8515767 },
  { code: 'AU', name: 'Australia', nameRu: 'Австралия', color: '#012169', area: 7692024 },
  { code: 'IN', name: 'India', nameRu: 'Индия', color: '#FF9933', area: 3287263 },
  { code: 'AR', name: 'Argentina', nameRu: 'Аргентина', color: '#74ACDF', area: 2780400 },
  { code: 'KZ', name: 'Kazakhstan', nameRu: 'Казахстан', color: '#00AFCA', area: 2724900 },
  { code: 'DZ', name: 'Algeria', nameRu: 'Алжир', color: '#006233', area: 2381741 },
  { code: 'MX', name: 'Mexico', nameRu: 'Мексика', color: '#006847', area: 1964375 },
  { code: 'ID', name: 'Indonesia', nameRu: 'Индонезия', color: '#FF0000', area: 1904569 },
  { code: 'SA', name: 'Saudi Arabia', nameRu: 'Саудовская Аравия', color: '#006C35', area: 2149690 },
  { code: 'LY', name: 'Libya', nameRu: 'Ливия', color: '#000000', area: 1759540 },
  { code: 'IR', name: 'Iran', nameRu: 'Иран', color: '#239F40', area: 1648195 },
  { code: 'MN', name: 'Mongolia', nameRu: 'Монголия', color: '#DA2032', area: 1564110 },
  { code: 'PE', name: 'Peru', nameRu: 'Перу', color: '#D91023', area: 1285216 },
  { code: 'NE', name: 'Niger', nameRu: 'Нигер', color: '#E05206', area: 1267000 },
  { code: 'TD', name: 'Chad', nameRu: 'Чад', color: '#002664', area: 1284000 },
  { code: 'AO', name: 'Angola', nameRu: 'Ангола', color: '#CC092F', area: 1246700 },
  { code: 'ML', name: 'Mali', nameRu: 'Мали', color: '#14B53A', area: 1240192 },
  { code: 'ZA', name: 'South Africa', nameRu: 'ЮАР', color: '#007A4D', area: 1221037 },
  { code: 'CO', name: 'Colombia', nameRu: 'Колумбия', color: '#FCD116', area: 1141748 },
  { code: 'ET', name: 'Ethiopia', nameRu: 'Эфиопия', color: '#009B3A', area: 1104300 },
  { code: 'BO', name: 'Bolivia', nameRu: 'Боливия', color: '#D52B1E', area: 1098581 },
  { code: 'MR', name: 'Mauritania', nameRu: 'Мавритания', color: '#006233', area: 1030700 },
  { code: 'EG', name: 'Egypt', nameRu: 'Египет', color: '#CE1126', area: 1002450 },
  { code: 'TZ', name: 'Tanzania', nameRu: 'Танзания', color: '#1EB53A', area: 945087 },
  { code: 'NG', name: 'Nigeria', nameRu: 'Нигерия', color: '#008751', area: 923768 },
  { code: 'VE', name: 'Venezuela', nameRu: 'Венесуэла', color: '#FFCC00', area: 916445 },
  { code: 'PK', name: 'Pakistan', nameRu: 'Пакистан', color: '#01411C', area: 881913 },
  { code: 'NA', name: 'Namibia', nameRu: 'Намибия', color: '#003580', area: 825615 },
  { code: 'MZ', name: 'Mozambique', nameRu: 'Мозамбик', color: '#007168', area: 801590 },
  { code: 'TR', name: 'Turkey', nameRu: 'Турция', color: '#E30A17', area: 783562 },
  { code: 'CL', name: 'Chile', nameRu: 'Чили', color: '#0039A6', area: 756102 },
  { code: 'ZM', name: 'Zambia', nameRu: 'Замбия', color: '#198A00', area: 752612 },
  { code: 'MM', name: 'Myanmar', nameRu: 'Мьянма', color: '#FFCD00', area: 676578 },
  { code: 'AF', name: 'Afghanistan', nameRu: 'Афганистан', color: '#000000', area: 652230 },
  { code: 'SO', name: 'Somalia', nameRu: 'Сомали', color: '#4189DD', area: 637657 },
  { code: 'CF', name: 'Central African Republic', nameRu: 'ЦАР', color: '#003082', area: 622984 },
  { code: 'UA', name: 'Ukraine', nameRu: 'Украина', color: '#005BBB', area: 603500 },
  { code: 'MG', name: 'Madagascar', nameRu: 'Мадагаскар', color: '#FC3D32', area: 587041 },
  { code: 'BW', name: 'Botswana', nameRu: 'Ботсвана', color: '#75AADB', area: 581730 },
  { code: 'KE', name: 'Kenya', nameRu: 'Кения', color: '#BB0000', area: 580367 },
  { code: 'FR', name: 'France', nameRu: 'Франция', color: '#002395', area: 551695 },
  { code: 'YE', name: 'Yemen', nameRu: 'Йемен', color: '#CE1126', area: 527968 },
  { code: 'TH', name: 'Thailand', nameRu: 'Таиланд', color: '#A51931', area: 513120 },
  { code: 'ES', name: 'Spain', nameRu: 'Испания', color: '#AA151B', area: 505992 },
  { code: 'TM', name: 'Turkmenistan', nameRu: 'Туркменистан', color: '#00843D', area: 488100 },
  { code: 'CM', name: 'Cameroon', nameRu: 'Камерун', color: '#007A5E', area: 475442 },
];

async function main() {
  console.log('🌱 Starting seed...');

  // Очищаем существующие данные
  await prisma.pixel.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.purchase.deleteMany();
  await prisma.user.deleteMany();
  await prisma.country.deleteMany();
  await prisma.season.deleteMany();

  // Создаем страны
  for (let i = 0; i < countries.length; i++) {
    const country = countries[i];
    
    // Упрощенный расчет границ (размещаем страны в сетке)
    const col = i % 10;
    const row = Math.floor(i / 10);
    const width = Math.min(200, Math.sqrt(country.area) * 0.1);
    const height = Math.min(100, Math.sqrt(country.area) * 0.05);
    
    // Расчет количества пикселей по формуле
    const pixelCount = Math.min(
      50000,
      Math.max(
        1000,
        Math.floor(Math.sqrt(country.area) * 10)
      )
    );

    await prisma.country.create({
      data: {
        code: country.code,
        name: country.name,
        nameRu: country.nameRu,
        nameEs: country.name, // Для упрощения используем английское название
        color: country.color,
        totalPixels: pixelCount,
        filledPixels: 0,
        minX: col * 200,
        minY: row * 100,
        maxX: col * 200 + width,
        maxY: row * 100 + height,
      },
    });

    console.log(`✅ Created country: ${country.name} with ${pixelCount} pixels`);
  }

  // Создаем первый сезон
  await prisma.season.create({
    data: {
      number: 1,
      startedAt: new Date(),
      isActive: true,
    },
  });

  console.log('✅ Created Season 1');
  console.log('🌱 Seed completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });