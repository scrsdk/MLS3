/**
 * Демо компонент для тестирования оптимизированной пиксельной карты
 */

import React from 'react';
import { OptimizedPixelMap } from './OptimizedPixelMap';

export const OptimizedMapDemo: React.FC = () => {
  const handlePixelPlaced = (x: number, y: number, color: string) => {
    console.log(`Pixel placed at (${x}, ${y}) with color ${color}`);
  };

  return (
    <div className="w-full h-full">
      <OptimizedPixelMap 
        onPixelPlaced={handlePixelPlaced}
        showDebugInfo={true}
      />
    </div>
  );
};