import { Router } from 'express';
import { prisma } from '../db/prisma';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();

// Получить все страны
router.get('/countries', async (req, res, next) => {
  try {
    const countries = await prisma.country.findMany({
      select: {
        id: true,
        code: true,
        name: true,
        nameRu: true,
        flagSvg: true,
        color: true,
        totalPixels: true,
        filledPixels: true,
        minX: true,
        minY: true,
        maxX: true,
        maxY: true,
        _count: {
          select: { users: true },
        },
      },
    });

    const formattedCountries = countries.map(country => ({
      ...country,
      players: country._count.users,
      bounds: {
        minX: country.minX,
        minY: country.minY,
        maxX: country.maxX,
        maxY: country.maxY,
      },
    }));

    res.json(formattedCountries);
  } catch (error) {
    next(error);
  }
});

// Выбрать страну
router.post('/select-country', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { countryId } = req.body;

    if (!countryId) {
      throw new AppError('Country ID required', 400);
    }

    const country = await prisma.country.findUnique({
      where: { id: countryId },
    });

    if (!country) {
      throw new AppError('Country not found', 404);
    }

    const user = await prisma.user.update({
      where: { id: req.userId },
      data: { countryId },
    });

    res.json(user);
  } catch (error) {
    next(error);
  }
});

// Получить данные карты
router.get('/map', async (req, res, next) => {
  try {
    const [countries, pixels] = await Promise.all([
      prisma.country.findMany({
        select: {
          id: true,
          code: true,
          name: true,
          nameRu: true,
          flagSvg: true,
          color: true,
          totalPixels: true,
          filledPixels: true,
          minX: true,
          minY: true,
          maxX: true,
          maxY: true,
          _count: {
            select: { users: true },
          },
        },
      }),
      prisma.pixel.findMany({
        take: 10000, // Ограничиваем количество для производительности
        orderBy: { placedAt: 'desc' },
      }),
    ]);

    const formattedCountries = countries.map(country => ({
      ...country,
      players: country._count.users,
      bounds: {
        minX: country.minX,
        minY: country.minY,
        maxX: country.maxX,
        maxY: country.maxY,
      },
    }));

    res.json({
      countries: formattedCountries,
      pixels,
    });
  } catch (error) {
    next(error);
  }
});

// Разместить пиксель (тап)
router.post('/tap', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { countryId, x, y } = req.body;

    if (!countryId || x == null || y == null) {
      throw new AppError('Missing required parameters', 400);
    }

    // Проверяем энергию пользователя
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (user.energy <= 0) {
      throw new AppError('No energy', 400);
    }

    // Проверяем, что страна существует
    const country = await prisma.country.findUnique({
      where: { id: countryId },
    });

    if (!country) {
      throw new AppError('Country not found', 404);
    }

    // Проверяем границы
    if (x < country.minX || x > country.maxX || y < country.minY || y > country.maxY) {
      throw new AppError('Coordinates out of bounds', 400);
    }

    // Определяем, это атака или защита
    const isAttack = user.countryId !== countryId;
    const color = user.countryId ? 
      (await prisma.country.findUnique({ where: { id: user.countryId } }))?.color || '#000000' : 
      '#000000';

    // Создаем или обновляем пиксель
    const pixel = await prisma.pixel.upsert({
      where: { x_y: { x, y } },
      update: {
        countryId,
        color,
        placedBy: user.id,
        isAttack,
        placedAt: new Date(),
      },
      create: {
        x,
        y,
        countryId,
        color,
        placedBy: user.id,
        isAttack,
      },
    });

    // Обновляем энергию и статистику пользователя
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        energy: user.energy - 1,
        pixelsPlaced: user.pixelsPlaced + 1,
      },
    });

    // Обновляем счетчик заполненных пикселей страны
    if (!isAttack) {
      await prisma.country.update({
        where: { id: countryId },
        data: {
          filledPixels: {
            increment: 1,
          },
        },
      });
    }

    // Сохраняем активность
    await prisma.activity.create({
      data: {
        userId: user.id,
        type: isAttack ? 'attack' : 'tap',
        data: { countryId, x, y },
      },
    });

    res.json({
      success: true,
      pixel,
      energy: updatedUser.energy,
    });
  } catch (error) {
    next(error);
  }
});

// Получить лидерборд
router.get('/leaderboard', async (req, res, next) => {
  try {
    const countries = await prisma.country.findMany({
      select: {
        id: true,
        code: true,
        name: true,
        nameRu: true,
        flagSvg: true,
        color: true,
        totalPixels: true,
        filledPixels: true,
        minX: true,
        minY: true,
        maxX: true,
        maxY: true,
        _count: {
          select: { users: true },
        },
      },
      orderBy: {
        filledPixels: 'desc',
      },
      take: 20,
    });

    const leaderboard = countries.map((country, index) => ({
      rank: index + 1,
      country: {
        ...country,
        players: country._count.users,
        bounds: {
          minX: country.minX,
          minY: country.minY,
          maxX: country.maxX,
          maxY: country.maxY,
        },
      },
      progress: (country.filledPixels / country.totalPixels) * 100,
      players: country._count.users,
      pixelsToday: 0, // TODO: Implement daily stats
    }));

    res.json(leaderboard);
  } catch (error) {
    next(error);
  }
});

// Получить статистику пользователя
router.get('/user-stats', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      include: {
        country: true,
      },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Рейтинг в стране
    let countryRank = 0;
    if (user.countryId) {
      const usersInCountry = await prisma.user.findMany({
        where: { countryId: user.countryId },
        orderBy: { pixelsPlaced: 'desc' },
        select: { id: true },
      });
      countryRank = usersInCountry.findIndex(u => u.id === user.id) + 1;
    }

    // Глобальный рейтинг
    const allUsers = await prisma.user.findMany({
      orderBy: { pixelsPlaced: 'desc' },
      select: { id: true },
    });
    const globalRank = allUsers.findIndex(u => u.id === user.id) + 1;

    res.json({
      pixelsPlaced: user.pixelsPlaced,
      countryRank,
      globalRank,
      achievements: [], // TODO: Implement achievements
    });
  } catch (error) {
    next(error);
  }
});

export default router;