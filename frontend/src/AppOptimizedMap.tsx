/**
 * Тестовое приложение для демонстрации оптимизированной пиксельной карты
 */

import React, { useEffect } from 'react';
import { OptimizedMapDemo } from './components/Map/OptimizedMapDemo';
import { useGameStore } from './store/gameStore';

// Тестовые данные
const TEST_COUNTRIES = [
  {
    id: 'test-1',
    code: 'RU',
    name: 'Russia',
    nameRu: 'Россия',
    color: '#FF0000',
    totalPixels: 1000,
    filledPixels: 250,
    players: 100,
    bounds: { minX: 0, minY: 0, maxX: 1000, maxY: 1000 }
  },
  {
    id: 'test-2',
    code: 'US',
    name: 'United States',
    nameRu: 'США',
    color: '#0000FF',
    totalPixels: 800,
    filledPixels: 400,
    players: 150,
    bounds: { minX: 1000, minY: 1000, maxX: 2000, maxY: 2000 }
  }
];

const TEST_USER = {
  id: 'test-user',
  telegramId: '123456789',
  firstName: 'Test',
  lastName: 'User',
  energy: 100,
  maxEnergy: 100,
  lastEnergyUpdate: new Date(),
  pixelsPlaced: 0,
  isVip: false,
  level: 1,
  experience: 0,
  coins: 0,
  createdAt: new Date(),
  countryId: 'test-1'
};

export default function AppOptimizedMap() {
  const { setUser, setCountries, setSelectedCountry } = useGameStore();

  useEffect(() => {
    // Инициализируем тестовые данные
    setUser(TEST_USER);
    setCountries(TEST_COUNTRIES);
    setSelectedCountry(TEST_COUNTRIES[0]);
    
    console.log('Optimized map demo initialized with test data');
  }, [setUser, setCountries, setSelectedCountry]);

  return (
    <div className="h-screen w-screen bg-gray-900 overflow-hidden">
      <div className="h-full w-full relative">
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-50 p-4">
          <div className="bg-black/70 backdrop-blur-sm rounded-lg p-3 text-white">
            <h1 className="text-xl font-bold text-center text-cyan-400">
              🌍 Optimized Pixel Map Demo
            </h1>
            <p className="text-sm text-center text-gray-300 mt-1">
              PixMap.fun архитектура с chunk-based рендерингом
            </p>
          </div>
        </div>

        {/* Основная карта */}
        <div className="h-full w-full pt-20">
          <OptimizedMapDemo />
        </div>

        {/* Инструкции */}
        <div className="absolute bottom-4 left-4 z-50 max-w-xs">
          <div className="bg-black/70 backdrop-blur-sm rounded-lg p-3 text-white text-sm">
            <h3 className="font-semibold text-cyan-400 mb-2">Управление:</h3>
            <ul className="space-y-1 text-xs text-gray-300">
              <li>🖱️ Перетаскивание - панорама</li>
              <li>🔄 Колесико - зум</li>
              <li>👆 Клик - разместить пиксель</li>
              <li>📱 Touch - мульти-тач зум</li>
            </ul>
          </div>
        </div>

        {/* Статистика */}
        <div className="absolute top-20 right-4 z-50">
          <div className="bg-black/70 backdrop-blur-sm rounded-lg p-3 text-white text-sm">
            <h3 className="font-semibold text-cyan-400 mb-2">Особенности:</h3>
            <ul className="space-y-1 text-xs text-gray-300">
              <li>✅ Иерархический LOD</li>
              <li>✅ Chunk-based кеширование</li>
              <li>✅ Offscreen рендеринг</li>
              <li>✅ Throttled события</li>
              <li>✅ Smooth scrolling</li>
              <li>✅ Pixel-perfect зум</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}