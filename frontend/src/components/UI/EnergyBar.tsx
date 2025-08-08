import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../store/gameStore';
import { GlassCard } from './GlassCard';
import { AnimatedCounter } from './AnimatedCounter';

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
    <GlassCard className="p-4 relative overflow-visible">
      {/* Header с иконкой энергии */}
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center space-x-2">
          <motion.div
            className={`w-8 h-8 rounded-full flex items-center justify-center ${
              isLow 
                ? 'bg-gradient-to-r from-red-500 to-red-600 pulse' 
                : 'bg-gradient-to-r from-emerald-500 to-green-500'
            }`}
            animate={isLow ? {
              scale: [1, 1.1, 1],
              boxShadow: [
                '0 0 0 0 rgba(239, 68, 68, 0.4)',
                '0 0 0 10px rgba(239, 68, 68, 0)',
                '0 0 0 0 rgba(239, 68, 68, 0)'
              ]
            } : {}}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <span className="text-white text-lg font-bold">⚡</span>
          </motion.div>
          
          <span className="text-sm font-medium text-white/80">
            {t('game.energy')}
          </span>
        </div>
        
        <AnimatedCounter
          value={energy}
          maxValue={maxEnergy}
          className="text-sm font-bold"
          variant={isLow ? 'default' : 'neon'}
        />
      </div>
      
      {/* Glass morphism progress bar */}
      <div className="relative">
        <div className="h-3 bg-black/30 rounded-full overflow-hidden backdrop-blur-sm border border-white/10">
          <motion.div
            className={`h-full rounded-full relative overflow-hidden ${
              isLow 
                ? 'bg-gradient-to-r from-red-500 to-red-600' 
                : 'bg-gradient-to-r from-emerald-400 to-green-500'
            }`}
            initial={{ width: '0%' }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            {/* Animated shimmer effect */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
              animate={{
                translateX: ['-100%', '100%']
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                repeatType: 'loop',
                ease: 'linear'
              }}
            />
            
            {/* Glow effect */}
            <div className="absolute inset-0 bg-gradient-to-t from-transparent to-white/20 rounded-full" />
          </motion.div>
          
          {/* Energy restoration progress indicator */}
          {timeToRestore && energy < maxEnergy && (
            <motion.div
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <span className="text-xs font-medium text-white/70 px-2 py-0.5 bg-black/40 rounded-full backdrop-blur-sm">
                +1 через {timeToRestore}
              </span>
            </motion.div>
          )}
        </div>
        
        {/* Percentage indicator */}
        <motion.div
          className="absolute -top-6 text-xs font-medium text-white/60"
          style={{ left: `${Math.max(0, Math.min(90, percentage - 5))}%` }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.3 }}
        >
          {percentage.toFixed(0)}%
        </motion.div>
      </div>
      
      {/* Low energy warning */}
      {isLow && (
        <motion.div
          className="mt-3 text-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="inline-flex items-center space-x-2 px-3 py-1.5 bg-red-500/20 border border-red-500/30 rounded-full backdrop-blur-sm">
            <motion.span
              className="w-2 h-2 bg-red-500 rounded-full"
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
            <span className="text-xs text-red-400 font-medium">
              {t('game.noEnergy')}
            </span>
          </div>
        </motion.div>
      )}
      
      {/* Floating energy particles when low */}
      {isLow && [...Array(3)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-red-400 rounded-full"
          style={{
            left: `${20 + i * 20}%`,
            top: `${20 + (i % 2) * 60}%`
          }}
          animate={{
            y: [-5, -15, -5],
            opacity: [0.7, 0.3, 0.7],
            scale: [0.8, 1.2, 0.8]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            delay: i * 0.3,
            ease: "easeInOut"
          }}
        />
      ))}
    </GlassCard>
  );
};