import React from 'react';
import { motion } from 'framer-motion';
import { GlassCard } from './GlassCard';
import { AnimatedCounter } from './AnimatedCounter';

interface GameHeaderProps {
  userName?: string;
  level?: number;
  experience?: number;
  maxExperience?: number;
  energy?: number;
  maxEnergy?: number;
  coins?: number;
  className?: string;
}

export const GameHeader: React.FC<GameHeaderProps> = ({
  userName = 'Игрок',
  level = 1,
  experience = 0,
  maxExperience = 100,
  energy = 100,
  maxEnergy = 100,
  coins = 0,
  className = ''
}) => {
  const energyPercentage = (energy / maxEnergy) * 100;
  const expPercentage = (experience / maxExperience) * 100;

  return (
    <motion.div
      className={`relative ${className}`}
      initial={{ opacity: 0, y: -50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <GlassCard className="p-4">
        <div className="flex items-center justify-between">
          {/* Левая секция: Аватар и информация о пользователе */}
          <div className="flex items-center space-x-3">
            {/* Аватар с neon border */}
            <motion.div
              className="relative"
              whileHover={{ scale: 1.1 }}
              transition={{ duration: 0.2 }}
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 p-0.5">
                <div className="w-full h-full rounded-full bg-gray-800 flex items-center justify-center">
                  <span className="text-white font-bold text-lg">
                    {userName.charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>
              
              {/* Level badge */}
              <motion.div
                className="absolute -bottom-1 -right-1 bg-gradient-to-r from-yellow-400 to-orange-500 text-black text-xs font-bold px-1.5 py-0.5 rounded-full border-2 border-white/20"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, duration: 0.3 }}
              >
                {level}
              </motion.div>
            </motion.div>

            {/* Информация о пользователе */}
            <div className="flex flex-col">
              <motion.h3
                className="text-white font-semibold text-sm"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2, duration: 0.4 }}
              >
                {userName}
              </motion.h3>
              
              {/* Experience bar */}
              <motion.div
                className="mt-1"
                initial={{ opacity: 0, scaleX: 0 }}
                animate={{ opacity: 1, scaleX: 1 }}
                transition={{ delay: 0.4, duration: 0.5 }}
              >
                <div className="w-24 h-1.5 bg-black/40 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-purple-400 to-pink-500 rounded-full relative"
                    initial={{ width: '0%' }}
                    animate={{ width: `${expPercentage}%` }}
                    transition={{ delay: 0.6, duration: 0.8, ease: "easeOut" }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
                  </motion.div>
                </div>
                <div className="text-xs text-white/60 mt-0.5">
                  {experience}/{maxExperience} XP
                </div>
              </motion.div>
            </div>
          </div>

          {/* Правая секция: Энергия и монеты */}
          <div className="flex items-center space-x-4">
            {/* Energy indicator */}
            <motion.div
              className="flex items-center space-x-2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.4 }}
            >
              <div className="relative">
                {/* Energy icon */}
                <div className={`w-6 h-6 rounded-full ${
                  energyPercentage > 25 
                    ? 'bg-gradient-to-r from-green-400 to-emerald-500' 
                    : 'bg-gradient-to-r from-red-400 to-red-500 pulse'
                }`}>
                  <div className="w-full h-full flex items-center justify-center text-white text-xs font-bold">
                    ⚡
                  </div>
                </div>
                
                {/* Energy ring */}
                <svg className="absolute inset-0 w-6 h-6 -rotate-90">
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="rgba(255,255,255,0.2)"
                    strokeWidth="2"
                    fill="none"
                    className="w-full h-full"
                  />
                  <motion.circle
                    cx="12"
                    cy="12"
                    r="10"
                    stroke={energyPercentage > 25 ? "#10B981" : "#EF4444"}
                    strokeWidth="2"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 10}`}
                    initial={{ strokeDashoffset: 2 * Math.PI * 10 }}
                    animate={{ 
                      strokeDashoffset: 2 * Math.PI * 10 * (1 - energyPercentage / 100)
                    }}
                    transition={{ delay: 0.5, duration: 1, ease: "easeOut" }}
                    className="w-full h-full"
                  />
                </svg>
              </div>
              
              <AnimatedCounter
                value={energy}
                maxValue={maxEnergy}
                className="text-xs font-medium"
                variant="neon"
              />
            </motion.div>

            {/* Coins */}
            <motion.div
              className="flex items-center space-x-1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4, duration: 0.4 }}
            >
              <div className="w-6 h-6 rounded-full bg-gradient-to-r from-yellow-400 to-amber-500 flex items-center justify-center">
                <span className="text-black text-xs font-bold">💰</span>
              </div>
              <AnimatedCounter
                value={coins}
                className="text-xs font-medium text-yellow-400"
                variant="neon"
              />
            </motion.div>
          </div>
        </div>

        {/* Декоративные элементы */}
        <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-50" />
        <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-30" />
        
        {/* Floating particles */}
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-cyan-400/30 rounded-full"
            style={{
              left: `${20 + i * 15}%`,
              top: `${10 + (i % 2) * 80}%`
            }}
            animate={{
              opacity: [0.3, 0.7, 0.3],
              scale: [0.5, 1, 0.5],
              y: [0, -5, 0]
            }}
            transition={{
              duration: 2 + i * 0.5,
              repeat: Infinity,
              delay: i * 0.3
            }}
          />
        ))}
      </GlassCard>
    </motion.div>
  );
};