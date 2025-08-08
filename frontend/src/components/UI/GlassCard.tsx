import React from 'react';
import { motion } from 'framer-motion';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  variant?: 'default' | 'strong' | 'interactive';
  animate?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className = '',
  onClick,
  variant = 'default',
  animate = true
}) => {
  const baseClasses = 'glass relative overflow-hidden';
  
  const variantClasses = {
    default: '',
    strong: 'glass-strong',
    interactive: 'cursor-pointer hover:bg-opacity-20 transition-all duration-300 hover:transform hover:scale-[1.02]'
  };

  const combinedClasses = `${baseClasses} ${variantClasses[variant]} ${className}`;

  const cardContent = (
    <div className={combinedClasses} onClick={onClick}>
      {children}
      {/* Subtle animated border effect */}
      <div className="absolute inset-0 rounded-[inherit] border border-white/10 pointer-events-none" />
      
      {/* Interactive hover effect */}
      {variant === 'interactive' && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent transform -translate-x-full group-hover:translate-x-full transition-transform duration-700 pointer-events-none" />
      )}
    </div>
  );

  if (!animate) {
    return cardContent;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.4, 
        ease: [0.25, 0.46, 0.45, 0.94] 
      }}
      whileHover={variant === 'interactive' ? {
        scale: 1.02,
        transition: { duration: 0.2 }
      } : undefined}
      whileTap={onClick ? { 
        scale: 0.98,
        transition: { duration: 0.1 }
      } : undefined}
      className="group"
    >
      {cardContent}
    </motion.div>
  );
};