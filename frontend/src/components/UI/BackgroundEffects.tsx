import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

interface BackgroundEffectsProps {
  intensity?: 'low' | 'medium' | 'high';
  className?: string;
}

export const BackgroundEffects: React.FC<BackgroundEffectsProps> = ({
  intensity = 'medium',
  className = ''
}) => {
  // Generate particles based on intensity
  const particleCount = useMemo(() => {
    const counts = { low: 15, medium: 25, high: 40 };
    return counts[intensity];
  }, [intensity]);

  const particles = useMemo(() => {
    return Array.from({ length: particleCount }, (_, i) => ({
      id: i,
      size: Math.random() * 4 + 1,
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 20,
      duration: Math.random() * 10 + 15,
      opacity: Math.random() * 0.6 + 0.1
    }));
  }, [particleCount]);

  return (
    <div className={`fixed inset-0 pointer-events-none overflow-hidden ${className}`}>
      {/* Animated gradient background */}
      <motion.div
        className="absolute inset-0 opacity-50"
        style={{
          background: `
            radial-gradient(circle at 20% 80%, rgba(0, 212, 255, 0.15) 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, rgba(255, 0, 128, 0.15) 0%, transparent 50%),
            radial-gradient(circle at 40% 40%, rgba(0, 255, 136, 0.1) 0%, transparent 50%)
          `
        }}
        animate={{
          backgroundPosition: [
            '20% 80%, 80% 20%, 40% 40%',
            '25% 75%, 75% 25%, 45% 35%',
            '20% 80%, 80% 20%, 40% 40%'
          ]
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: 'linear'
        }}
      />

      {/* Floating geometric shapes */}
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={`shape-${i}`}
          className="absolute"
          style={{
            left: `${(i * 12.5 + Math.random() * 10)}%`,
            top: `${Math.random() * 100}%`,
          }}
          initial={{
            opacity: 0,
            scale: 0,
            rotate: 0
          }}
          animate={{
            opacity: [0, 0.3, 0],
            scale: [0, 1, 0],
            rotate: 360,
            y: [-20, -100],
            x: [0, Math.random() * 50 - 25]
          }}
          transition={{
            duration: 15 + Math.random() * 10,
            repeat: Infinity,
            delay: i * 2,
            ease: 'linear'
          }}
        >
          <div
            className={`w-2 h-2 border border-cyan-400/30 ${
              i % 3 === 0 ? 'rounded-full' : 
              i % 3 === 1 ? 'rotate-45' : 
              'rounded-sm'
            }`}
            style={{
              background: i % 2 === 0 
                ? 'linear-gradient(45deg, rgba(0, 212, 255, 0.2), transparent)' 
                : 'linear-gradient(45deg, rgba(255, 0, 128, 0.2), transparent)'
            }}
          />
        </motion.div>
      ))}

      {/* Animated particles */}
      {particles.map((particle) => (
        <motion.div
          key={`particle-${particle.id}`}
          className="absolute rounded-full"
          style={{
            left: `${particle.x}%`,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            background: particle.id % 3 === 0 
              ? 'rgba(0, 212, 255, 0.6)'
              : particle.id % 3 === 1
              ? 'rgba(255, 0, 128, 0.6)'
              : 'rgba(0, 255, 136, 0.6)'
          }}
          initial={{
            y: '100vh',
            opacity: 0,
            scale: 0
          }}
          animate={{
            y: '-10vh',
            opacity: [0, particle.opacity, 0],
            scale: [0, 1, 0],
            x: [0, Math.sin(particle.id) * 50]
          }}
          transition={{
            duration: particle.duration,
            repeat: Infinity,
            delay: particle.delay,
            ease: 'linear'
          }}
        />
      ))}

      {/* Pulsing energy waves */}
      {[...Array(3)].map((_, i) => (
        <motion.div
          key={`wave-${i}`}
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
          initial={{
            width: '0px',
            height: '0px',
            opacity: 1
          }}
          animate={{
            width: ['0px', '800px', '1200px'],
            height: ['0px', '800px', '1200px'],
            opacity: [0.8, 0.2, 0]
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            delay: i * 2.5,
            ease: 'easeOut'
          }}
        >
          <div
            className="w-full h-full rounded-full border"
            style={{
              borderColor: i % 2 === 0 
                ? 'rgba(0, 212, 255, 0.1)' 
                : 'rgba(255, 0, 128, 0.1)',
              borderWidth: '1px'
            }}
          />
        </motion.div>
      ))}

      {/* Subtle grid pattern */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0, 212, 255, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 212, 255, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px'
        }}
      />

      {/* Corner accent gradients */}
      <div className="absolute top-0 left-0 w-64 h-64 bg-gradient-to-br from-cyan-400/10 to-transparent rounded-full blur-3xl" />
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-pink-400/10 to-transparent rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-emerald-400/10 to-transparent rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-0 w-64 h-64 bg-gradient-to-tl from-purple-400/10 to-transparent rounded-full blur-3xl" />

      {/* Scanning line effect */}
      <motion.div
        className="absolute left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent"
        animate={{
          y: ['0vh', '100vh']
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: 'linear'
        }}
      />

      {/* Floating orbs */}
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={`orb-${i}`}
          className="absolute rounded-full blur-sm"
          style={{
            left: `${20 + i * 15}%`,
            width: `${10 + Math.random() * 20}px`,
            height: `${10 + Math.random() * 20}px`,
            background: `radial-gradient(circle, ${
              i % 3 === 0 ? 'rgba(0, 212, 255, 0.4)' :
              i % 3 === 1 ? 'rgba(255, 0, 128, 0.4)' :
              'rgba(0, 255, 136, 0.4)'
            }, transparent)`
          }}
          animate={{
            y: [0, -30, 0],
            x: [0, Math.sin(i) * 20, 0],
            scale: [1, 1.2, 1],
            opacity: [0.4, 0.8, 0.4]
          }}
          transition={{
            duration: 6 + i,
            repeat: Infinity,
            delay: i * 0.5,
            ease: 'easeInOut'
          }}
        />
      ))}

      {/* Central energy core */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
        <motion.div
          className="w-2 h-2 rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(0, 212, 255, 0.8), rgba(0, 212, 255, 0.2), transparent)',
            boxShadow: '0 0 30px rgba(0, 212, 255, 0.3)'
          }}
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.8, 0.4, 0.8]
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
        />
      </div>
    </div>
  );
};