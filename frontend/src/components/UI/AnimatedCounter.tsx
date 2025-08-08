import React, { useEffect, useState } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';

interface AnimatedCounterProps {
  value: number;
  maxValue?: number;
  suffix?: string;
  prefix?: string;
  className?: string;
  variant?: 'default' | 'neon' | 'gradient';
  duration?: number;
  showProgress?: boolean;
}

export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  value,
  maxValue,
  suffix = '',
  prefix = '',
  className = '',
  variant = 'default',
  duration = 0.5,
  showProgress = false
}) => {
  const [displayValue, setDisplayValue] = useState(0);
  
  // Spring animation для плавного изменения значения
  const spring = useSpring(0, { 
    stiffness: 100, 
    damping: 30,
    duration: duration * 1000
  });
  
  const display = useTransform(spring, (latest) => Math.round(latest));

  useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  useEffect(() => {
    return display.on('change', setDisplayValue);
  }, [display]);

  const percentage = maxValue ? (value / maxValue) * 100 : 0;

  const variantClasses = {
    default: 'text-white',
    neon: 'text-cyan-400 neon-glow',
    gradient: 'bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent'
  };

  return (
    <div className={`relative ${className}`}>
      <motion.div
        className={`font-bold tabular-nums ${variantClasses[variant]}`}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        {/* Counter with subtle pulse on change */}
        <motion.span
          key={value} // Re-animate when value changes
          initial={{ scale: 1.2, opacity: 0.7 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="inline-block"
        >
          {prefix}{displayValue.toLocaleString()}{suffix}
          {maxValue && (
            <span className="text-white/60 ml-1">
              / {maxValue.toLocaleString()}
            </span>
          )}
        </motion.span>
      </motion.div>

      {/* Progress bar */}
      {showProgress && maxValue && (
        <motion.div
          className="mt-2 h-2 bg-black/30 rounded-full overflow-hidden"
          initial={{ width: 0 }}
          animate={{ width: '100%' }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <motion.div
            className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full relative overflow-hidden"
            initial={{ width: '0%' }}
            animate={{ width: `${percentage}%` }}
            transition={{ 
              duration: duration,
              delay: 0.2,
              ease: "easeOut"
            }}
          >
            {/* Animated shine effect */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
              animate={{
                translateX: ['-100%', '100%']
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                repeatType: 'loop',
                ease: 'linear',
                delay: 0.5
              }}
            />
          </motion.div>
        </motion.div>
      )}

      {/* Percentage indicator */}
      {showProgress && maxValue && (
        <motion.div
          className="mt-1 text-xs text-white/60 text-right"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.4 }}
        >
          {percentage.toFixed(1)}%
        </motion.div>
      )}

      {/* Floating particles on value change */}
      <motion.div
        key={`particles-${value}`}
        className="absolute inset-0 pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-cyan-400 rounded-full"
            initial={{
              x: '50%',
              y: '50%',
              scale: 0,
              opacity: 1
            }}
            animate={{
              x: `${50 + (Math.random() - 0.5) * 100}%`,
              y: `${50 + (Math.random() - 0.5) * 100}%`,
              scale: [0, 1, 0],
              opacity: [0, 1, 0]
            }}
            transition={{
              duration: 0.8,
              delay: i * 0.1,
              ease: "easeOut"
            }}
          />
        ))}
      </motion.div>
    </div>
  );
};