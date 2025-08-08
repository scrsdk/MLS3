import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { GameWorldMap } from './components/Map/GameWorldMap';
import { CountrySelect } from './components/CountrySelect';
import { EnergyBar } from './components/UI/EnergyBar';
import { GameHeader } from './components/UI/GameHeader';
import { BackgroundEffects } from './components/UI/BackgroundEffects';
import { GlassCard } from './components/UI/GlassCard';
import { NeonButton } from './components/UI/NeonButton';
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
      console.log('🚀 App init started');
      try {
        setLoading(true);
        
        // DEBUG MODE - работаем без Telegram
        let authData = initData;
        
        if (!authData) {
          console.warn('⚠️ DEBUG MODE: No Telegram data, using test user');
          // Создаем тестовые данные для отладки
          authData = btoa(JSON.stringify({
            user: {
              id: 123456789,
              first_name: 'Test',
              last_name: 'User',
              username: 'testuser',
              language_code: 'ru'
            },
            auth_date: Math.floor(Date.now() / 1000),
            hash: 'test_hash'
          }));
        } else {
          console.log('✅ Telegram data found:', authData);
        }

        console.log('🔐 Attempting login...');
        const { token, user: authUser } = await authAPI.loginWithTelegram(authData);
        console.log('✅ Login successful:', authUser);
        setUser(authUser);

        // Подключение WebSocket
        console.log('🔌 Connecting WebSocket...');
        wsService.connect(token);

        // Загрузка данных игры
        console.log('📊 Loading game data...');
        const [countries, mapData] = await Promise.all([
          gameAPI.getCountries(),
          gameAPI.getMapData(),
        ]);
        console.log('✅ Countries loaded:', countries.length);
        console.log('✅ Pixels loaded:', mapData.pixels?.length || 0);

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

        console.log('✅ Initialization complete!');
        setLoading(false);
      } catch (err: any) {
        console.error('❌ Init error:', err);
        console.error('Error details:', {
          message: err?.message,
          response: err?.response?.data,
          status: err?.response?.status
        });
        setError(`Ошибка: ${err?.message || 'Неизвестная ошибка'}`);
        setLoading(false);
      }
    };

    init();

    return () => {
      wsService.disconnect();
    };
  }, []);

  // Обработка выбора страны
  const handleCountrySelect = (country: any) => {
    setSelectedCountry(country);
    setShowCountrySelect(false);
    wsService.subscribeToCountry(country.id);
    gameAPI.selectCountry(country.id);
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-gray-900 overflow-hidden">
        <BackgroundEffects intensity="low" />
        <motion.div
          className="flex items-center justify-center h-screen"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <GlassCard className="p-8 text-center">
            <motion.div
              className="text-6xl mb-6"
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              🌍
            </motion.div>
            <motion.div
              className="text-xl font-semibold text-white mb-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              {t('common.loading')}
            </motion.div>
            <motion.div
              className="text-sm text-white/60"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              Инициализация боевой системы...
            </motion.div>
            
            {/* Loading progress bar */}
            <motion.div
              className="w-48 h-1 bg-black/30 rounded-full mt-6 overflow-hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              <motion.div
                className="h-full bg-gradient-to-r from-cyan-400 to-blue-500"
                animate={{ width: ['0%', '100%'] }}
                transition={{ duration: 3, repeat: Infinity }}
              />
            </motion.div>
          </GlassCard>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-gray-900 overflow-hidden">
        <BackgroundEffects intensity="low" />
        <motion.div
          className="flex items-center justify-center h-screen"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <GlassCard className="p-8 text-center max-w-md mx-4">
            <motion.div
              className="text-6xl mb-6 text-red-400"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              ⚠️
            </motion.div>
            <motion.div
              className="text-xl font-semibold text-red-400 mb-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              Ошибка подключения
            </motion.div>
            <motion.div
              className="text-white/80 mb-6 text-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              {error}
            </motion.div>
            
            <motion.div
              className="space-y-2 text-xs text-white/60 mb-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              <div>Backend: flagbattle-kpph.onrender.com</div>
              <div className="flex items-center justify-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${
                  isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'
                }`} />
                <span>Status: {isConnected ? 'Подключено' : 'Отключено'}</span>
              </div>
            </motion.div>
            
            <NeonButton
              onClick={() => window.location.reload()}
              variant="primary"
            >
              Попробовать снова
            </NeonButton>
          </GlassCard>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-gray-900 relative overflow-hidden" style={{ position: 'fixed', top: 0, left: 0 }}>
      {/* Background Effects */}
      <BackgroundEffects intensity="low" />
      
      {/* Game Header */}
      <motion.div
        className="relative z-10 p-4"
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        <GameHeader
          userName={user?.firstName || 'Игрок'}
          level={user?.level || 1}
          experience={user?.experience || 0}
          maxExperience={100}
          energy={user?.energy || 100}
          maxEnergy={user?.maxEnergy || 100}
          coins={user?.coins || 0}
        />
      </motion.div>

      {/* Energy Bar */}
      {user && (
        <motion.div
          className="relative z-10 px-4 pb-4"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <EnergyBar />
        </motion.div>
      )}

      {/* Main Content */}
      <motion.div
        className="flex-1 relative z-10 px-4 pb-4"
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.8 }}
      >
        <GlassCard className="h-full">
          <AnimatePresence mode="wait">
            {selectedCountry ? (
              <motion.div
                key="game-map"
                className="h-full"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                transition={{ duration: 0.5 }}
              >
                <GameWorldMap />
              </motion.div>
            ) : (
              <motion.div
                key="country-select-prompt"
                className="flex items-center justify-center h-full"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5 }}
              >
                <div className="text-center">
                  <motion.div
                    className="text-6xl mb-6"
                    animate={{ 
                      rotate: [0, 5, -5, 0],
                      scale: [1, 1.1, 1]
                    }}
                    transition={{ 
                      duration: 2, 
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  >
                    🏳️
                  </motion.div>
                  <motion.div
                    className="text-xl font-semibold text-white mb-6"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    {t('game.selectCountryFirst')}
                  </motion.div>
                  <NeonButton
                    onClick={() => setShowCountrySelect(true)}
                    variant="primary"
                    size="large"
                  >
                    Выбрать страну
                  </NeonButton>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </GlassCard>
      </motion.div>

      {/* Modals */}
      <AnimatePresence>
        {showCountrySelect && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCountrySelect(false)}
            />
            <motion.div
              className="relative z-10 w-full max-w-md"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", duration: 0.5 }}
            >
              <CountrySelect onSelect={handleCountrySelect} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;