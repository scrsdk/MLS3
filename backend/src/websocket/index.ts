import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { prisma } from '../db/prisma';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  countryId?: string;
}

const connectedUsers = new Map<string, AuthenticatedSocket>();

export const setupWebSocket = (io: Server) => {
  // Middleware для аутентификации
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication error'));
      }

      const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
      socket.userId = decoded.userId;
      
      // Получаем страну пользователя
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { countryId: true },
      });
      
      if (user?.countryId) {
        socket.countryId = user.countryId;
      }
      
      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`User connected: ${socket.userId}`);
    connectedUsers.set(socket.userId!, socket);

    // Присоединяем к комнате страны
    if (socket.countryId) {
      socket.join(`country:${socket.countryId}`);
    }

    // Подписка на страну
    socket.on('subscribe', async (data: { countryId: string }) => {
      if (data.countryId) {
        socket.join(`country:${data.countryId}`);
        console.log(`User ${socket.userId} subscribed to country ${data.countryId}`);
      }
    });

    // Отписка от страны
    socket.on('unsubscribe', (data: { countryId: string }) => {
      if (data.countryId) {
        socket.leave(`country:${data.countryId}`);
      }
    });

    // Обработка батча тапов
    socket.on('taps', async (data: { taps: any[] }) => {
      try {
        const user = await prisma.user.findUnique({
          where: { id: socket.userId },
        });

        if (!user) return;

        const pixels = [];
        let energyUsed = 0;

        for (const tap of data.taps) {
          if (user.energy - energyUsed <= 0) break;

          const { countryId, x, y } = tap;
          
          // Проверяем границы страны
          const country = await prisma.country.findUnique({
            where: { id: countryId },
          });

          if (!country) continue;
          if (x < country.minX || x > country.maxX || y < country.minY || y > country.maxY) {
            continue;
          }

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

          pixels.push(pixel);
          energyUsed++;

          // Обновляем счетчик страны
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
        }

        // Обновляем энергию пользователя
        if (energyUsed > 0) {
          await prisma.user.update({
            where: { id: user.id },
            data: {
              energy: Math.max(0, user.energy - energyUsed),
              pixelsPlaced: user.pixelsPlaced + energyUsed,
            },
          });
        }

        // Отправляем обновления всем в комнате страны
        if (pixels.length > 0) {
          pixels.forEach(pixel => {
            io.to(`country:${pixel.countryId}`).emit('pixels', { pixels: [pixel] });
          });
        }

        // Отправляем обновление энергии пользователю
        socket.emit('energy', {
          current: Math.max(0, user.energy - energyUsed),
          max: user.maxEnergy,
        });
      } catch (error) {
        console.error('Error processing taps:', error);
        socket.emit('error', { message: 'Failed to process taps' });
      }
    });

    // Отключение
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.userId}`);
      connectedUsers.delete(socket.userId!);
    });
  });

  // Периодическое обновление лидерборда
  setInterval(async () => {
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
        pixelsToday: 0,
      }));

      io.emit('leaderboard', { entries: leaderboard });
    } catch (error) {
      console.error('Error updating leaderboard:', error);
    }
  }, 30000); // Каждые 30 секунд
};