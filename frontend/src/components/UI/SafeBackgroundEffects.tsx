import React from 'react';

interface SafeBackgroundEffectsProps {
  intensity?: 'low' | 'medium' | 'high';
  className?: string;
}

export const SafeBackgroundEffects: React.FC<SafeBackgroundEffectsProps> = ({
  intensity = 'low',
  className = ''
}) => {
  try {
    // Простой градиентный фон без анимаций
    return (
      <div 
        className={`fixed inset-0 ${className}`}
        style={{ 
          zIndex: -1,
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
          pointerEvents: 'none'
        }}
      />
    );
  } catch (error) {
    console.error('❌ SafeBackgroundEffects error:', error);
    // Возвращаем пустой div если что-то пошло не так
    return <div style={{ position: 'fixed', inset: 0, zIndex: -1, backgroundColor: '#1a1a2e' }} />;
  }
};