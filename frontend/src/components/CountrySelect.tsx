import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Country } from '../types';
import { useGameStore } from '../store/gameStore';
import { gameAPI } from '../services/api';
import { useTelegram } from '../hooks/useTelegram';

interface CountrySelectProps {
  onSelect: (country: Country) => void;
}

export const CountrySelect: React.FC<CountrySelectProps> = ({ onSelect }) => {
  const { t } = useTranslation();
  const { hapticFeedback } = useTelegram();
  const { countries } = useGameStore();
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Фильтрация стран
  const filteredCountries = useMemo(() => {
    if (!search) return countries;
    
    const searchLower = search.toLowerCase();
    return countries.filter(
      (country) =>
        country.name.toLowerCase().includes(searchLower) ||
        country.nameRu.toLowerCase().includes(searchLower) ||
        country.code.toLowerCase().includes(searchLower)
    );
  }, [countries, search]);

  // Сортировка по популярности
  const sortedCountries = useMemo(() => {
    return [...filteredCountries].sort((a, b) => b.players - a.players);
  }, [filteredCountries]);

  const handleSelect = async (country: Country) => {
    setIsLoading(true);
    hapticFeedback('medium');
    
    try {
      await gameAPI.selectCountry(country.id);
      onSelect(country);
    } catch (error) {
      console.error('Failed to select country:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Автоопределение страны по IP (заглушка)
  const suggestedCountry = countries.find((c) => c.code === 'RU');

  return (
    <div className="fixed inset-0 bg-telegram-bg flex flex-col">
      {/* Заголовок */}
      <div className="bg-telegram-secondary p-4 shadow-md">
        <h1 className="text-2xl font-bold text-center text-telegram-text">
          {t('game.selectCountry')}
        </h1>
        
        {/* Поиск */}
        <div className="mt-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('game.search')}
            className="w-full px-4 py-2 rounded-lg bg-telegram-bg text-telegram-text 
                     border border-gray-300 focus:outline-none focus:border-telegram-button"
          />
        </div>
        
        {/* Предложенная страна */}
        {suggestedCountry && !search && (
          <div className="mt-3 p-3 bg-green-100 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Рекомендуем:</p>
            <button
              onClick={() => handleSelect(suggestedCountry)}
              disabled={isLoading}
              className="flex items-center justify-between w-full p-2 bg-white rounded-lg"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{suggestedCountry.flagSvg || '🏳️'}</span>
                <span className="font-medium">{suggestedCountry.name}</span>
              </div>
              <div className="text-sm text-gray-500">
                {suggestedCountry.players} игроков
              </div>
            </button>
          </div>
        )}
      </div>

      {/* Список стран */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {sortedCountries.map((country) => (
          <button
            key={country.id}
            onClick={() => handleSelect(country)}
            disabled={isLoading}
            className="w-full p-4 bg-telegram-secondary rounded-lg flex items-center 
                     justify-between hover:bg-gray-100 transition-colors
                     disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-center gap-3">
              <span className="text-3xl">{country.flagSvg || '🏳️'}</span>
              <div className="text-left">
                <div className="font-medium text-telegram-text">{country.name}</div>
                <div className="text-sm text-telegram-hint">{country.nameRu}</div>
              </div>
            </div>
            
            <div className="text-right">
              <div className="text-sm font-medium text-telegram-text">
                {country.filledPixels}/{country.totalPixels}
              </div>
              <div className="text-xs text-telegram-hint">
                {Math.round((country.filledPixels / country.totalPixels) * 100)}%
              </div>
              <div className="text-xs text-telegram-hint mt-1">
                {country.players} игроков
              </div>
            </div>
          </button>
        ))}
        
        {sortedCountries.length === 0 && (
          <div className="text-center py-8 text-telegram-hint">
            Страны не найдены
          </div>
        )}
      </div>

      {/* Загрузка */}
      {isLoading && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-4 rounded-lg">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-telegram-button"></div>
          </div>
        </div>
      )}
    </div>
  );
};