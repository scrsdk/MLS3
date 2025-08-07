import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../store/gameStore';

export const EnergyBar: React.FC = () => {
  const { t } = useTranslation();
  const { energy, maxEnergy, nextEnergyRestore } = useGameStore();
  const [timeToRestore, setTimeToRestore] = useState<string>('');

  useEffect(() => {
    const interval = setInterval(() => {
      if (nextEnergyRestore) {
        const now = new Date();
        const diff = nextEnergyRestore.getTime() - now.getTime();
        
        if (diff > 0) {
          const minutes = Math.floor(diff / 60000);
          const seconds = Math.floor((diff % 60000) / 1000);
          setTimeToRestore(`${minutes}:${seconds.toString().padStart(2, '0')}`);
        } else {
          setTimeToRestore('');
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [nextEnergyRestore]);

  const percentage = (energy / maxEnergy) * 100;
  const isLow = percentage < 20;

  return (
    <div className="bg-telegram-secondary p-3 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-telegram-text">
          {t('game.energy')}
        </span>
        <span className="text-sm font-bold text-telegram-text">
          {energy}/{maxEnergy}
        </span>
      </div>
      
      <div className="relative h-6 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`absolute inset-y-0 left-0 transition-all duration-300 rounded-full
                    ${isLow ? 'bg-red-500 animate-energy-pulse' : 'bg-green-500'}`}
          style={{ width: `${percentage}%` }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-transparent to-white opacity-20" />
        </div>
        
        {/* Текст внутри бара */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-medium text-gray-700">
            {timeToRestore && energy < maxEnergy && `+1 через ${timeToRestore}`}
          </span>
        </div>
      </div>
      
      {isLow && (
        <p className="text-xs text-red-500 mt-1 text-center animate-pulse">
          {t('game.noEnergy')}
        </p>
      )}
    </div>
  );
};