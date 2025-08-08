import React, { useRef, useEffect, useState } from 'react';
import { useGameStore } from '../../store/gameStore';

export const SimpleWorldMap: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 });
  
  const { 
    selectedCountry, 
    energy,
    decreaseEnergy,
  } = useGameStore();

  // Простые данные стран для демонстрации
  const countries = [
    { name: 'Россия', x: 400, y: 100, width: 200, height: 150, color: '#FF6B6B' },
    { name: 'США', x: 100, y: 150, width: 150, height: 100, color: '#4ECDC4' },
    { name: 'Китай', x: 450, y: 200, width: 150, height: 100, color: '#45B7D1' },
    { name: 'Бразилия', x: 200, y: 300, width: 120, height: 120, color: '#96CEB4' },
    { name: 'Индия', x: 380, y: 250, width: 100, height: 80, color: '#FFEAA7' },
  ];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Устанавливаем размер canvas
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    // Функция отрисовки
    const draw = () => {
      // Очистка и фон
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Рисуем страны
      countries.forEach(country => {
        // Тень
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetX = 5;
        ctx.shadowOffsetY = 5;
        
        // Страна
        ctx.fillStyle = country.color + '40'; // Полупрозрачный
        ctx.fillRect(country.x, country.y, country.width, country.height);
        
        // Граница
        ctx.strokeStyle = country.color;
        ctx.lineWidth = 2;
        ctx.strokeRect(country.x, country.y, country.width, country.height);
        
        // Сброс тени
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        
        // Название
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(
          country.name,
          country.x + country.width / 2,
          country.y + country.height / 2
        );
      });

      // Информация
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '12px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(`Энергия: ${energy}`, 10, 20);
      ctx.fillText(`Страна: ${selectedCountry?.nameRu || 'Не выбрана'}`, 10, 40);
    };

    draw();

    // Обработка resize
    const handleResize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      draw();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [energy, selectedCountry, countries]);

  // Обработка кликов
  const handleClick = (e: React.MouseEvent) => {
    if (energy <= 0) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Проверяем попадание в страну
    const clickedCountry = countries.find(country => 
      x >= country.x && 
      x <= country.x + country.width &&
      y >= country.y && 
      y <= country.y + country.height
    );

    if (clickedCountry) {
      // Эффект клика
      ctx.fillStyle = selectedCountry?.color || '#00FF00';
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fill();
      
      // Анимация расширения
      let radius = 5;
      const animate = () => {
        ctx.strokeStyle = selectedCountry?.color || '#00FF00';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.stroke();
        
        radius += 2;
        if (radius < 20) {
          requestAnimationFrame(animate);
        }
      };
      animate();
      
      decreaseEnergy();
      console.log(`Clicked on ${clickedCountry.name}`);
    }
  };

  // Touch события для мобильных
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      setLastPos({
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top
      });
      setIsDrawing(true);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    
    const touch = e.touches[0];
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      
      // Здесь можно добавить drag логику
      setLastPos({ x, y });
    }
  };

  const handleTouchEnd = () => {
    setIsDrawing(false);
  };

  return (
    <canvas
      ref={canvasRef}
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        width: '100%',
        height: '100%',
        cursor: 'crosshair',
        touchAction: 'none'
      }}
    />
  );
};