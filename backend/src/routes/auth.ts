import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { validateTelegramWebAppData } from '../utils/telegram';
import { AppError } from '../middleware/errorHandler';

const router = Router();
const prisma = new PrismaClient();

router.post('/telegram', async (req, res, next) => {
  try {
    const { initData } = req.body;

    if (!initData) {
      throw new AppError('Init data required', 400);
    }

    const telegramUser = validateTelegramWebAppData(initData);
    
    if (!telegramUser) {
      throw new AppError('Invalid init data', 401);
    }

    // Найти или создать пользователя
    let user = await prisma.user.findUnique({
      where: { telegramId: telegramUser.id.toString() },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          telegramId: telegramUser.id.toString(),
          username: telegramUser.username,
          firstName: telegramUser.first_name,
          lastName: telegramUser.last_name,
          languageCode: telegramUser.language_code || 'en',
        },
      });
    } else {
      // Обновляем данные пользователя
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          username: telegramUser.username,
          firstName: telegramUser.first_name,
          lastName: telegramUser.last_name,
          languageCode: telegramUser.language_code || user.languageCode,
        },
      });
    }

    // Проверяем и восстанавливаем энергию
    const now = new Date();
    const timeSinceUpdate = now.getTime() - user.lastEnergyUpdate.getTime();
    const energyToRestore = Math.floor(timeSinceUpdate / (3 * 60 * 1000)); // 1 энергия каждые 3 минуты

    if (energyToRestore > 0 && user.energy < user.maxEnergy) {
      const newEnergy = Math.min(user.energy + energyToRestore, user.maxEnergy);
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          energy: newEnergy,
          lastEnergyUpdate: now,
        },
      });
    }

    // Создаем JWT токен
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        telegramId: user.telegramId,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        countryId: user.countryId,
        energy: user.energy,
        maxEnergy: user.maxEnergy,
        lastEnergyUpdate: user.lastEnergyUpdate,
        pixelsPlaced: user.pixelsPlaced,
        isVip: user.isVip,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;