import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

interface BackgroundEffectsProps {
  intensity?: 'low' | 'medium' | 'high';
  className?: string;
}

export const BackgroundEffects: React.FC<BackgroundEffectsProps> = ({
  intensity = 'low', // Уменьшаем интенсивность по умолчанию
  className = ''
}) => {
  // Generate particles based on intensity
  const particleCount = useMemo(() => {
    const counts = { low: 5, medium: 10, high: 15 }; // Меньше частиц
    return counts[intensity];
  }, [intensity]);

  const particles = useMemo(() => {
    return Array.from({ length: particleCount }, (_, i) => ({
      id: i,
      size: Math.random() * 3 + 1,
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 10,
      duration: Math.random() * 20 + 20, // Медленнее движение
      opacity: Math.random() * 0.3 + 0.1 // Меньше opacity
    }));
  }, [particleCount]);

  return (
    <div 
      className={`fixed inset-0 pointer-events-none ${className}`}
      style={{ 
        zIndex: -1, // Помещаем позади всего контента
        overflow: 'hidden',
        width: '100vw',
        height: '100vh'
      }}
    >
      {/* Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-purple-900/10 to-gray-900" />
      
      {/* Floating Particles */}
      {particles.map(particle => (
        <motion.div
          key={particle.id}
          className="absolute rounded-full"
          style={{
            width: particle.size + 'px',
            height: particle.size + 'px',
            left: particle.x + '%',
            top: particle.y + '%',
            background: `radial-gradient(circle, rgba(139, 92, 246, ${particle.opacity}) 0%, transparent 70%)`,
          }}
          animate={{
            x: [0, 30, -30, 0],
            y: [0, -30, 30, 0],
          }}
          transition={{
            duration: particle.duration,
            delay: particle.delay,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      ))}
    </div>
  );
};