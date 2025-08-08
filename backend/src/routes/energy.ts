import { Router } from 'express';
import { prisma } from '../db/prisma';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();

// Получить статус энергии
router.get('/status', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Рассчитываем восстановленную энергию
    const now = new Date();
    const timeSinceUpdate = now.getTime() - user.lastEnergyUpdate.getTime();
    const energyToRestore = Math.floor(timeSinceUpdate / (3 * 60 * 1000)); // 1 энергия каждые 3 минуты

    let currentEnergy = user.energy;
    if (energyToRestore > 0 && user.energy < user.maxEnergy) {
      currentEnergy = Math.min(user.energy + energyToRestore, user.maxEnergy);
      
      // Обновляем в БД
      await prisma.user.update({
        where: { id: user.id },
        data: {
          energy: currentEnergy,
          lastEnergyUpdate: now,
        },
      });
    }

    // Время до следующего восстановления
    const timeToNextRestore = new Date(
      user.lastEnergyUpdate.getTime() + 3 * 60 * 1000 - (timeSinceUpdate % (3 * 60 * 1000))
    );

    res.json({
      current: currentEnergy,
      max: user.maxEnergy,
      nextRestore: timeToNextRestore,
    });
  } catch (error) {
    next(error);
  }
});

// Получить ежедневный бонус
router.post('/claim-daily', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Проверяем, можно ли получить бонус
    const now = new Date();
    if (user.lastDailyBonus) {
      const timeSinceBonus = now.getTime() - user.lastDailyBonus.getTime();
      const hoursPassedSinceBonus = timeSinceBonus / (1000 * 60 * 60);
      
      if (hoursPassedSinceBonus < 24) {
        const nextClaim = new Date(user.lastDailyBonus.getTime() + 24 * 60 * 60 * 1000);
        throw new AppError(`Daily bonus already claimed. Next claim at ${nextClaim.toISOString()}`, 400);
      }
    }

    // Даем бонус
    const bonusEnergy = 50;
    const newEnergy = Math.min(user.energy + bonusEnergy, user.maxEnergy);

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        energy: newEnergy,
        lastDailyBonus: now,
      },
    });

    // Сохраняем активность
    await prisma.activity.create({
      data: {
        userId: user.id,
        type: 'bonus',
        data: { amount: bonusEnergy },
      },
    });

    const nextClaim = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    res.json({
      energy: updatedUser.energy,
      nextClaim,
    });
  } catch (error) {
    next(error);
  }
});

// Получить пакеты энергии для покупки
router.get('/packages', async (req, res, next) => {
  try {
    const packages = [
      {
        id: 'pack_50',
        amount: 50,
        price: 10,
        bonus: 0,
      },
      {
        id: 'pack_200',
        amount: 200,
        price: 35,
        bonus: 10,
      },
      {
        id: 'pack_500',
        amount: 500,
        price: 75,
        bonus: 50,
      },
    ];

    res.json(packages);
  } catch (error) {
    next(error);
  }
});

// Купить энергию
router.post('/purchase', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { packageId } = req.body;

    if (!packageId) {
      throw new AppError('Package ID required', 400);
    }

    // Находим пакет
    const packages: any = {
      pack_50: { amount: 50, price: 10 },
      pack_200: { amount: 200, price: 35 },
      pack_500: { amount: 500, price: 75 },
    };

    const pack = packages[packageId];
    if (!pack) {
      throw new AppError('Package not found', 404);
    }

    // Создаем запись о покупке
    const purchase = await prisma.purchase.create({
      data: {
        userId: req.userId!,
        type: 'energy',
        amount: pack.amount,
        stars: pack.price,
        status: 'pending',
      },
    });

    // Генерируем ссылку на оплату (заглушка)
    const invoiceUrl = `https://t.me/your_bot?start=pay_${purchase.id}`;

    res.json({
      success: true,
      invoiceUrl,
    });
  } catch (error) {
    next(error);
  }
});

export default router;