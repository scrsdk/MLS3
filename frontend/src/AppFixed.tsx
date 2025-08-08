import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useGameStore } from './store/gameStore';
import { useTelegram } from './hooks/useTelegram';
import { authAPI, gameAPI } from './services/api';
import wsService from './services/websocket';
import { SimpleWorldMap } from './components/Map/SimpleWorldMap';
import './locales/i18n';

function AppFixed() {
  console.log('📱 AppFixed component rendering...');
  
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

  // Инициализация
  useEffect(() => {
    const init = async () => {
      console.log('🚀 AppFixed init started');
      
      try {
        setLoading(true);
        
        // DEBUG MODE - работаем без Telegram
        let authData = initData;
        
        if (!authData) {
          console.warn('⚠️ DEBUG MODE: No Telegram data, using test user');
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
        console.log('✅ Data loaded');

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
          setShowCountrySelect(true);
        }

        console.log('✅ Initialization complete!');
        setLoading(false);
      } catch (err: any) {
        console.error('❌ Init error:', err);
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
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#1a1a2e',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
        color: 'white',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '20px', animation: 'pulse 2s infinite' }}>🌍</div>
        <div style={{ fontSize: '24px', marginBottom: '10px' }}>World Flag Battle</div>
        <div style={{ fontSize: '14px', opacity: 0.7 }}>{t('common.loading') || 'Загрузка...'}</div>
        <div style={{ fontSize: '10px', opacity: 0.5, marginTop: '20px' }}>DEBUG MODE</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#1a1a2e',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
        color: 'white',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        padding: '20px'
      }}>
        <div style={{
          backgroundColor: 'rgba(255, 100, 100, 0.1)',
          border: '2px solid #ff6b6b',
          borderRadius: '15px',
          padding: '30px',
          maxWidth: '500px',
          width: '100%',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>⚠️</div>
          <h2 style={{ fontSize: '20px', marginBottom: '15px', color: '#ff6b6b' }}>
            Ошибка подключения
          </h2>
          <p style={{ fontSize: '14px', marginBottom: '20px', opacity: 0.8 }}>
            {error}
          </p>
          <div style={{ fontSize: '12px', opacity: 0.6, marginBottom: '20px' }}>
            Backend: flagbattle-kpph.onrender.com<br/>
            Status: {isConnected ? '🟢 Подключено' : '🔴 Отключено'}
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{
              backgroundColor: '#00d4ff',
              color: '#000',
              border: 'none',
              padding: '12px 30px',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
              width: '100%'
            }}
          >
            🔄 Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: '#1a1a2e',
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
      color: 'white',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      {/* Header */}
      <div style={{
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        padding: '15px 20px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <h1 style={{ fontSize: '20px', margin: 0 }}>🎮 World Flag Battle</h1>
          {selectedCountry && (
            <div style={{ fontSize: '12px', opacity: 0.7, marginTop: '5px' }}>
              {selectedCountry.nameRu} ({selectedCountry.code})
            </div>
          )}
        </div>
        {user && (
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '14px' }}>⚡ {user.energy}/{user.maxEnergy}</div>
            <div style={{ fontSize: '10px', opacity: 0.7 }}>Energy</div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        {selectedCountry ? (
          <div style={{
            width: '100%',
            height: '100%',
            position: 'relative',
            backgroundColor: 'rgba(0, 0, 0, 0.2)',
            borderRadius: '10px',
            overflow: 'hidden'
          }}>
            <SimpleWorldMap />
          </div>
        ) : (
          <div style={{
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '15px',
            padding: '30px',
            textAlign: 'center',
            maxWidth: '500px',
            width: '100%'
          }}>
            <div style={{ fontSize: '60px', marginBottom: '20px' }}>🏳️</div>
            <h2 style={{ fontSize: '24px', marginBottom: '20px' }}>
              Выберите страну
            </h2>
            <p style={{ fontSize: '14px', opacity: 0.8 }}>
              {t('game.selectCountryFirst') || 'Сначала выберите страну для игры'}
            </p>
          </div>
        )}
      </div>

      {/* Модальное окно выбора страны */}
      {showCountrySelect && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#1a1a2e',
            borderRadius: '15px',
            padding: '20px',
            maxWidth: '400px',
            width: '100%',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <h2 style={{ fontSize: '20px', marginBottom: '20px', textAlign: 'center' }}>
              Выберите страну
            </h2>
            <div style={{ fontSize: '12px', color: '#ff6b6b', textAlign: 'center', marginBottom: '20px' }}>
              Функция выбора страны временно недоступна
            </div>
            <button
              onClick={() => setShowCountrySelect(false)}
              style={{
                backgroundColor: '#00d4ff',
                color: '#000',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: 'pointer',
                width: '100%'
              }}
            >
              Закрыть
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default AppFixed;