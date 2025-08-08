/**
 * GameWorldMap - обертка для оптимизированной пиксельной карты
 * Обеспечивает совместимость с существующей архитектурой игры
 */

import React, { useCallback } from 'react';
import { motion } from 'framer-motion';
import { OptimizedPixelMap } from './OptimizedPixelMap';
import { useGameStore } from '../../store/gameStore';
import { gameAPI } from '../../services/api';
import wsService from '../../services/websocket';
import { useTelegram } from '../../hooks/useTelegram';


export const GameWorldMap: React.FC = () => {
  // Hooks
  const { hapticFeedback } = useTelegram();
  const { 
    selectedCountry,
    addPixel,
    decreaseEnergy
  } = useGameStore();
  
  
  
  
  
  
  
  
  // Обработка размещения пикселя через оптимизированную карту
  const handlePixelPlaced = useCallback(async (x: number, y: number, color: string) => {
    if (!selectedCountry) return;
    
    // Создаем пиксель для локального state
    const pixel = {
      x,
      y,
      countryId: selectedCountry.id,
      color,
      placedBy: 'current-user',
      placedAt: new Date(),
    };
    
    addPixel(pixel);
    hapticFeedback('light');
    
    // Отправка на сервер
    try {
      const result = await gameAPI.placeTap(selectedCountry.id, x, y);
      
      if (!result.success) {
        console.warn('Server rejected pixel placement:', result);
        // В реальном приложении здесь можно откатить изменение
      }
    } catch (error) {
      console.error('Error placing pixel:', error);
    }
    
    // Отправка через WebSocket
    wsService.sendTap(selectedCountry.id, x, y);
    
    console.log(`Pixel placed at (${x}, ${y}) with color ${color}`);
  }, [selectedCountry, addPixel, hapticFeedback]);
  
  
  
  
  
  
  return (
    <motion.div 
      className="w-full h-full"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      <OptimizedPixelMap
        onPixelPlaced={handlePixelPlaced}
        showDebugInfo={process.env.NODE_ENV === 'development'}
      />
    </motion.div>
  );
};