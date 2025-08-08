import React, { useState, useEffect } from 'react';
import { GameWorldMap } from './GameWorldMap';
import { useGameStore } from '../../store/gameStore';
import { worldCountryData, loadWorldTopology } from '../../utils/worldData';
import type { Country } from '../../types';

// Демо компонент для тестирования карты
export const MapDemo: React.FC = () => {
  const { setSelectedCountry, setCountries, selectedCountry } = useGameStore();
  const [isReady, setIsReady] = useState(false);
  const [availableCountries, setAvailableCountries] = useState<any[]>([]);
  
  useEffect(() => {
    // Инициализация демо данных
    const initDemo = async () => {
      await loadWorldTopology();
      const demoCountries: Country[] = worldCountryData.map((wc: any) => ({
        id: wc.id,
        code: wc.code,
        name: wc.name,
        nameRu: wc.nameRu,
        flagSvg: undefined,
        color: wc.color,
        totalPixels: 1000,
        filledPixels: Math.floor(Math.random() * 500),
        players: Math.floor(Math.random() * 100) + 1,
        bounds: wc.bounds,
        geoJson: undefined
      }));
      
      setCountries(demoCountries);
      setAvailableCountries(worldCountryData);
      setIsReady(true);
    };
    
    initDemo();
  }, [setCountries]);
  
  if (!isReady) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>Инициализация демо карты...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="h-screen flex flex-col">
      {/* Заголовок */}
      <div className="bg-gray-800 text-white p-4 flex justify-between items-center">
        <div>
          <h1 className="text-lg font-bold">BattleMap Demo</h1>
          {selectedCountry && (
            <p className="text-sm text-gray-300">
              Выбранная страна: {selectedCountry.nameRu}
            </p>
          )}
        </div>
        
        {/* Выбор страны */}
        <div className="flex gap-2">
          <select
            className="bg-gray-700 text-white px-3 py-1 rounded text-sm"
            value={selectedCountry?.id || ''}
            onChange={(e) => {
              const country = availableCountries.find((c: any) => c.id === e.target.value);
              if (country) {
                const gameCountry: Country = {
                  id: country.id,
                  code: country.code,
                  name: country.name,
                  nameRu: country.nameRu,
                  flagSvg: undefined,
                  color: country.color,
                  totalPixels: 1000,
                  filledPixels: 0,
                  players: 1,
                  bounds: country.bounds,
                  geoJson: undefined
                };
                setSelectedCountry(gameCountry);
              }
            }}
          >
            <option value="">Выберите страну</option>
            {availableCountries.map((country: any) => (
              <option key={country.id} value={country.id}>
                {country.nameRu}
              </option>
            ))}
          </select>
        </div>
      </div>
      
      {/* Карта */}
      <div className="flex-1">
        <GameWorldMap />
      </div>
      
      
      {/* Информационная панель */}
      <div className="bg-gray-100 p-4">
        <div className="text-sm text-gray-600">
          <p><strong>Инструкция:</strong></p>
          <ul className="list-disc list-inside mt-1">
            <li>Выберите страну в меню выше</li>
            <li>Тапните по карте для закрашивания территорий</li>
            <li>Используйте жесты для зума и панорамирования</li>
            <li>Наблюдайте за эффектами частиц при тапах</li>
            <li>Карта показывает реальные границы стран мира</li>
            <li>Fog of War скрывает неисследованные территории</li>
          </ul>
        </div>
      </div>
    </div>
  );
};