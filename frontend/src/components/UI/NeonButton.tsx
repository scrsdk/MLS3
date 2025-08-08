import React from 'react';
import { motion } from 'framer-motion';

interface NeonButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'success' | 'warning';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
}

export const NeonButton: React.FC<NeonButtonProps> = ({
  children,
  onClick,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  className = '',
  type = 'button'
}) => {
  const sizeClasses = {
    small: 'px-4 py-2 text-xs',
    medium: 'px-6 py-3 text-sm',
    large: 'px-8 py-4 text-base'
  };

  const variantClasses = {
    primary: 'btn-neon',
    secondary: 'btn-neon secondary',
    success: 'btn-neon success',
    warning: 'btn-neon warning'
  };

  const isDisabled = disabled || loading;

  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      className={`
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}
        ${className}
        relative overflow-hidden
        font-semibold
        transition-all duration-300
        focus:outline-none focus:ring-2 focus:ring-current focus:ring-offset-2 focus:ring-offset-transparent
      `}
      whileHover={!isDisabled ? {
        scale: 1.05,
        transition: { duration: 0.2 }
      } : undefined}
      whileTap={!isDisabled ? {
        scale: 0.95,
        transition: { duration: 0.1 }
      } : undefined}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ 
        opacity: 1, 
        scale: 1,
        transition: { duration: 0.3, ease: "easeOut" }
      }}
    >
      {/* Loading spinner */}
      {loading && (
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
        </motion.div>
      )}
      
      {/* Button content */}
      <motion.span
        className={loading ? 'opacity-0' : 'opacity-100'}
        transition={{ duration: 0.2 }}
      >
        {children}
      </motion.span>

      {/* Animated shine effect */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full"
        animate={{
          translateX: ['100%', '100%', '-100%', '-100%']
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          repeatType: 'loop',
          ease: 'linear',
          times: [0, 0.5, 0.7, 1]
        }}
      />

      {/* Pulse effect for active state */}
      <motion.div
        className="absolute inset-0 rounded-[inherit] border-2 border-current"
        animate={!isDisabled ? {
          scale: [1, 1.1, 1],
          opacity: [0.5, 0, 0.5]
        } : {}}
        transition={{
          duration: 2,
          repeat: Infinity,
          repeatType: 'loop'
        }}
      />
    </motion.button>
  );
};