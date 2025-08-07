import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useGameStore } from '../../store/gameStore';
import type { Country, Pixel } from '../../types';
import { useTelegram } from '../../hooks/useTelegram';
import { gameAPI } from '../../services/api';
import wsService from '../../services/websocket';

interface TouchPoint {
  x: number;
  y: number;
  id: number;
}

export const WorldMap: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number>(0);
  
  const { hapticFeedback } = useTelegram();
  const { 
    countries, 
    pixels, 
    selectedCountry, 
    energy,
    decreaseEnergy,
    addPixel,
    mapCenter,
    mapZoom,
    setMapView
  } = useGameStore();

  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [lastTouchDistance, setLastTouchDistance] = useState(0);
  const [touches, setTouches] = useState<TouchPoint[]>([]);
  
  // Размеры карты
  const MAP_WIDTH = 2000;
  const MAP_HEIGHT = 1000;
  const MIN_ZOOM = 0.5;
  const MAX_ZOOM = 10;
  
  // Инициализация offscreen canvas
  useEffect(() => {
    offscreenCanvasRef.current = document.createElement('canvas');
    offscreenCanvasRef.current.width = MAP_WIDTH;
    offscreenCanvasRef.current.height = MAP_HEIGHT;
  }, []);

  // Функция отрисовки карты
  const drawMap = useCallback(() => {
    const canvas = canvasRef.current;
    const offscreen = offscreenCanvasRef.current;
    if (!canvas || !offscreen) return;

    const ctx = canvas.getContext('2d');
    const offCtx = offscreen.getContext('2d');
    if (!ctx || !offCtx) return;

    // Очистка
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    offCtx.clearRect(0, 0, MAP_WIDTH, MAP_HEIGHT);

    // Сохраняем состояние
    ctx.save();
    
    // Применяем трансформации
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.scale(mapZoom, mapZoom);
    ctx.translate(-mapCenter.x, -mapCenter.y);

    // Рисуем страны
    countries.forEach((country) => {
      // Упрощенная отрисовка - прямоугольники вместо реальных границ
      offCtx.fillStyle = country.color || '#e0e0e0';
      offCtx.strokeStyle = '#666';
      offCtx.lineWidth = 1;
      
      const { minX, minY, maxX, maxY } = country.bounds;
      offCtx.fillRect(minX, minY, maxX - minX, maxY - minY);
      offCtx.strokeRect(minX, minY, maxX - minX, maxY - minY);
      
      // Название страны
      if (mapZoom > 1) {
        offCtx.fillStyle = '#000';
        offCtx.font = `${12 / mapZoom}px Arial`;
        offCtx.textAlign = 'center';
        offCtx.fillText(
          country.name, 
          (minX + maxX) / 2, 
          (minY + maxY) / 2
        );
      }
    });

    // Рисуем пиксели
    pixels.forEach((pixel) => {
      offCtx.fillStyle = pixel.color;
      offCtx.fillRect(pixel.x, pixel.y, 1, 1);
    });

    // Копируем на основной canvas
    ctx.drawImage(offscreen, 0, 0);
    
    // Подсветка выбранной страны
    if (selectedCountry) {
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 3 / mapZoom;
      const { minX, minY, maxX, maxY } = selectedCountry.bounds;
      ctx.strokeRect(minX, minY, maxX - minX, maxY - minY);
    }

    ctx.restore();
  }, [countries, pixels, selectedCountry, mapCenter, mapZoom]);

  // Анимационный цикл
  useEffect(() => {
    const animate = () => {
      drawMap();
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    animate();
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [drawMap]);

  // Обработка тапа
  const handleTap = async (x: number, y: number) => {
    if (energy <= 0) {
      hapticFeedback('medium');
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Преобразование координат экрана в координаты карты
    const rect = canvas.getBoundingClientRect();
    const canvasX = x - rect.left;
    const canvasY = y - rect.top;
    
    const mapX = (canvasX - canvas.width / 2) / mapZoom + mapCenter.x;
    const mapY = (canvasY - canvas.height / 2) / mapZoom + mapCenter.y;

    // Находим страну под тапом
    const tappedCountry = countries.find((country) => {
      const { minX, minY, maxX, maxY } = country.bounds;
      return mapX >= minX && mapX <= maxX && mapY >= minY && mapY <= maxY;
    });

    if (!tappedCountry) return;

    // Оптимистичное обновление
    const pixel: Pixel = {
      x: Math.floor(mapX),
      y: Math.floor(mapY),
      countryId: tappedCountry.id,
      color: selectedCountry?.color || '#ff0000',
      placedBy: 'current-user',
      placedAt: new Date(),
    };

    addPixel(pixel);
    decreaseEnergy();
    hapticFeedback('light');
    
    // Анимация тапа
    showTapAnimation(canvasX, canvasY);

    // Отправка на сервер
    try {
      const result = await gameAPI.placeTap(tappedCountry.id, Math.floor(mapX), Math.floor(mapY));
      
      if (!result.success) {
        // Откатываем изменения
        decreaseEnergy(-1);
        // TODO: Удалить пиксель из store
      }
    } catch (error) {
      console.error('Tap error:', error);
      decreaseEnergy(-1);
    }
    
    // Отправка через WebSocket
    wsService.sendTap(tappedCountry.id, Math.floor(mapX), Math.floor(mapY));
  };

  // Анимация тапа
  const showTapAnimation = (x: number, y: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let radius = 0;
    let opacity = 1;
    
    const animate = () => {
      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      
      radius += 3;
      opacity -= 0.05;
      
      if (opacity > 0) {
        requestAnimationFrame(animate);
      }
    };
    
    animate();
  };

  // Touch события
  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({ x: touch.clientX, y: touch.clientY });
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      setLastTouchDistance(Math.sqrt(dx * dx + dy * dy));
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    
    if (e.touches.length === 1 && isDragging) {
      const touch = e.touches[0];
      const dx = touch.clientX - dragStart.x;
      const dy = touch.clientY - dragStart.y;
      
      setMapView(
        {
          x: mapCenter.x - dx / mapZoom,
          y: mapCenter.y - dy / mapZoom,
        },
        mapZoom
      );
      
      setDragStart({ x: touch.clientX, y: touch.clientY });
    } else if (e.touches.length === 2) {
      // Pinch zoom
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (lastTouchDistance > 0) {
        const scale = distance / lastTouchDistance;
        const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, mapZoom * scale));
        setMapView(mapCenter, newZoom);
      }
      
      setLastTouchDistance(distance);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    
    if (e.touches.length === 0) {
      if (isDragging && e.changedTouches.length === 1) {
        const touch = e.changedTouches[0];
        const dx = Math.abs(touch.clientX - dragStart.x);
        const dy = Math.abs(touch.clientY - dragStart.y);
        
        // Если движение минимальное, считаем это тапом
        if (dx < 5 && dy < 5) {
          handleTap(touch.clientX, touch.clientY);
        }
      }
      
      setIsDragging(false);
      setLastTouchDistance(0);
    }
  };

  // Изменение размера canvas
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight * 0.75; // 75% экрана для карты
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="touch-none select-none"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        cursor: isDragging ? 'grabbing' : 'grab',
      }}
    />
  );
};