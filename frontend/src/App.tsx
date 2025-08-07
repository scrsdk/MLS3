import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { WorldMap } from './components/Map/WorldMap';
import { CountrySelect } from './components/CountrySelect';
import { EnergyBar } from './components/UI/EnergyBar';
import { useGameStore } from './store/gameStore';
import { useTelegram } from './hooks/useTelegram';
import { authAPI, gameAPI } from './services/api';
import wsService from './services/websocket';
import './locales/i18n';

function App() {
  const { t } = useTranslation();
  const { webApp, user: tgUser, initData } = useTelegram();
  const {
    user,
    selectedCountry,
    isLoading,
    isConnected,
    error,
    setUser,
    setSelectedCountry,
    setCountries,
    setLoading,
    setError,
    addPixels,
  } = useGameStore();

  const [showCountrySelect, setShowCountrySelect] = useState(false);
  const [showShop, setShowShop] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  // Инициализация
  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        
        // Авторизация через Telegram
        if (!initData) {
          setError('Приложение должно быть открыто через Telegram');
          return;
        }

        const { token, user: authUser } = await authAPI.loginWithTelegram(initData);
        setUser(authUser);

        // Подключение WebSocket
        wsService.connect(token);

        // Загрузка данных игры
        const [countries, mapData] = await Promise.all([
          gameAPI.getCountries(),
          gameAPI.getMapData(),
        ]);

        setCountries(countries);
        addPixels(mapData.pixels);

        // Если у пользователя уже выбрана страна
        if (authUser.countryId) {
          const country = countries.find(c => c.id === authUser.countryId);
          if (country) {
            setSelectedCountry(country);
            wsService.subscribeToCountry(country.id);
          }
        } else {
          // Показываем выбор страны
          setShowCountrySelect(true);
        }

        setLoading(false);
      } catch (err) {
        console.error('Init error:', err);
        setError('Ошибка инициализации');
        setLoading(false);
      }
    };

    init();

    return () => {
      wsService.disconnect();
    };
  }, [initData]);

  // Обработка выбора страны
  const handleCountrySelect = (country: any) => {
    setSelectedCountry(country);
    setShowCountrySelect(false);
    wsService.subscribeToCountry(country.id);
    
    // Центрируем карту на выбранной стране
    const centerX = (country.bounds.minX + country.bounds.maxX) / 2;
    const centerY = (country.bounds.minY + country.bounds.maxY) / 2;
    useGameStore.getState().setMapView({ x: centerX, y: centerY }, 2);
  };

  // Экран загрузки
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-telegram-bg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-telegram-button mx-auto"></div>
          <p className="mt-4 text-telegram-text">{t('game.connecting')}</p>
        </div>
      </div>
    );
  }

  // Экран ошибки
  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-telegram-bg p-4">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-telegram-button text-telegram-buttonText rounded-lg"
          >
            Перезагрузить
          </button>
        </div>
      </div>
    );
  }

  // Выбор страны
  if (showCountrySelect) {
    return <CountrySelect onSelect={handleCountrySelect} />;
  }

  return (
    <div className="h-screen flex flex-col bg-telegram-bg">
      {/* Верхняя панель */}
      <div className="bg-telegram-secondary p-3 shadow-md">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{selectedCountry?.flagSvg || '🏳️'}</span>
            <div>
              <div className="font-medium text-telegram-text">
                {selectedCountry?.name}
              </div>
              <div className="text-xs text-telegram-hint">
                {selectedCountry && 
                  `${Math.round((selectedCountry.filledPixels / selectedCountry.totalPixels) * 100)}% ${t('game.progress')}`
                }
              </div>
            </div>
          </div>
          
          {/* Статус подключения */}
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-xs text-telegram-hint">
              {isConnected ? 'Online' : t('game.offline')}
            </span>
          </div>
        </div>
        
        {/* Энергия */}
        <EnergyBar />
      </div>

      {/* Карта */}
      <div className="flex-1 relative">
        <WorldMap />
      </div>

      {/* Нижняя панель */}
      <div className="bg-telegram-secondary p-3 shadow-lg">
        <div className="grid grid-cols-4 gap-2">
          <button
            onClick={() => {
              const centerX = (selectedCountry?.bounds.minX! + selectedCountry?.bounds.maxX!) / 2;
              const centerY = (selectedCountry?.bounds.minY! + selectedCountry?.bounds.maxY!) / 2;
              useGameStore.getState().setMapView({ x: centerX, y: centerY }, 3);
            }}
            className="p-3 bg-telegram-button text-telegram-buttonText rounded-lg flex flex-col items-center"
          >
            <span className="text-xl mb-1">🎯</span>
            <span className="text-xs">Центр</span>
          </button>
          
          <button
            onClick={() => setShowShop(true)}
            className="p-3 bg-telegram-button text-telegram-buttonText rounded-lg flex flex-col items-center"
          >
            <span className="text-xl mb-1">⚡</span>
            <span className="text-xs">Магазин</span>
          </button>
          
          <button
            onClick={() => setShowLeaderboard(true)}
            className="p-3 bg-telegram-button text-telegram-buttonText rounded-lg flex flex-col items-center"
          >
            <span className="text-xl mb-1">🏆</span>
            <span className="text-xs">Рейтинг</span>
          </button>
          
          <button
            onClick={() => setShowCountrySelect(true)}
            className="p-3 bg-telegram-button text-telegram-buttonText rounded-lg flex flex-col items-center"
          >
            <span className="text-xl mb-1">🌍</span>
            <span className="text-xs">Страна</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;