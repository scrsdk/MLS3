/**
 * Оптимизированная реализация пиксельной карты с архитектурой PixMap.fun
 * Основные улучшения:
 * - Иерархическая система чанков
 * - Offscreen рендеринг для плавности
 * - Throttled event handling
 * - Только карта масштабируется, интерфейс остается фиксированным
 */

import React, { useRef, useEffect, useCallback, useState } from 'react';
import { useMapStore } from '../../store/mapStore';
import { useGameStore } from '../../store/gameStore';

interface Props {
  className?: string;
  onPixelPlaced?: (x: number, y: number, color: string) => void;
  showDebugInfo?: boolean;
}

export const OptimizedPixelMap: React.FC<Props> = ({ 
  className = '', 
  onPixelPlaced,
  showDebugInfo = false 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number>(0);
  const lastRenderTime = useRef<number>(0);
  
  // State для обработки событий
  const [dragState, setDragState] = useState({
    isDragging: false,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0
  });
  
  // Touch handling для мобильных устройств
  const [touchState, setTouchState] = useState({
    lastTouchTime: 0,
    pinchDistance: 0,
    isPinching: false
  });
  
  // Map store
  const {
    viewport,
    setViewport,
    initializeRendering,
    cleanupRendering,
    offscreenRenderer,
    handleWheel,
    handlePan,
    handleClick,
    handleDoubleClick,
    placePixel,
    performance,
    settings,
    isInitialized
  } = useMapStore();
  
  // Game store
  const {
    selectedCountry,
    energy,
    decreaseEnergy
  } = useGameStore();

  // Инициализация карты и wheel обработчик
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    console.log('OptimizedPixelMap: Starting initialization');
    
    try {
      // Сначала убедимся что canvas имеет правильные размеры
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      
      // Рисуем начальный фон чтобы убедиться что canvas работает
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        
        // Темный фон
        ctx.fillStyle = '#0a0e27';
        ctx.fillRect(0, 0, rect.width, rect.height);
        
        // Сетка
        ctx.strokeStyle = 'rgba(0, 212, 255, 0.05)';
        ctx.lineWidth = 1;
        
        const gridSize = 50;
        for (let x = 0; x < rect.width; x += gridSize) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, rect.height);
          ctx.stroke();
        }
        
        for (let y = 0; y < rect.height; y += gridSize) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(rect.width, y);
          ctx.stroke();
        }
        
        // Текст загрузки
        ctx.fillStyle = '#00d4ff';
        ctx.font = '20px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Инициализация карты мира...', rect.width / 2, rect.height / 2);
      }
      
      initializeRendering(canvas);
      isInitialized(true);
      
      // Добавляем обработчик wheel с passive: false для возможности preventDefault
      const wheelHandler = (e: WheelEvent) => {
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const centerX = e.clientX - rect.left;
        const centerY = e.clientY - rect.top;
        handleWheel(e.deltaY, centerX, centerY);
      };
      
      canvas.addEventListener('wheel', wheelHandler, { passive: false });
      
      // Принудительная инициализация карты через несколько мс
      setTimeout(() => {
        console.log('OptimizedPixelMap: Force triggering rendering setup');
        if (!isInitialized) {
          console.warn('Map not initialized after timeout, trying again...');
          initializeRendering(canvas);
        }
      }, 200);
      
      return () => {
        console.log('OptimizedPixelMap: Cleaning up');
        canvas.removeEventListener('wheel', wheelHandler);
        try {
          cleanupRendering();
        } catch (error) {
          console.warn('Ошибка при очистке карты:', error);
        }
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = 0;
        }
      };
    } catch (error) {
      console.error('Ошибка при инициализации карты:', error);
    }
  }, [initializeRendering, cleanupRendering, handleWheel]);

  // Обработка изменения размеров
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      
      if (!canvas || !container) return;
      
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      
      // Устанавливаем размеры canvas с учетом DPR
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      
      // Обновляем viewport
      setViewport({
        width: rect.width,
        height: rect.height
      });
      
      // Переинициализируем рендерер с новыми размерами
      if (isInitialized) {
        offscreenRenderer?.resize(canvas.width, canvas.height);
      }
    };
    
    handleResize();
    
    const resizeObserver = new ResizeObserver(handleResize);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    
    return () => resizeObserver.disconnect();
  }, [isInitialized, setViewport, offscreenRenderer]);

  // Главный цикл рендеринга
  const renderLoop = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !offscreenRenderer || !isInitialized) {
      console.warn('RenderLoop: Missing dependencies', {
        canvas: !!canvas,
        offscreenRenderer: !!offscreenRenderer,
        isInitialized
      });
      // Очищаем animationFrame если рендерер не готов
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = 0;
      }
      return;
    }
    
    try {
      const now = window.performance.now();
      const deltaTime = now - lastRenderTime.current;
      
      // Ограничиваем FPS до 60
      if (deltaTime >= 16.67) {
        console.log('RenderLoop: Rendering frame at', now);
        offscreenRenderer.renderToCanvas(canvas);
        lastRenderTime.current = now;
      }
      
      // Только запускаем следующий кадр если все еще инициализированы
      if (isInitialized && offscreenRenderer) {
        animationFrameRef.current = requestAnimationFrame(renderLoop);
      }
    } catch (error) {
      console.error('Ошибка в renderLoop, останавливаем рендеринг:', error);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = 0;
      }
    }
  }, [offscreenRenderer, isInitialized]);
  
  // Запуск цикла рендеринга
  useEffect(() => {
    console.log('RenderLoop useEffect triggered', {
      isInitialized,
      offscreenRenderer: !!offscreenRenderer
    });
    
    if (isInitialized && offscreenRenderer) {
      // Отменяем предыдущий цикл перед запуском нового
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = 0;
      }
      
      try {
        console.log('Starting render loop');
        renderLoop();
      } catch (error) {
        console.error('Ошибка при запуске renderLoop:', error);
      }
    } else {
      console.warn('Cannot start render loop: requirements not met');
    }
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = 0;
      }
    };
  }, [isInitialized, offscreenRenderer, renderLoop]);

  // Обработчики событий мыши
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    
    setDragState({
      isDragging: true,
      startX: e.clientX,
      startY: e.clientY,
      lastX: e.clientX,
      lastY: e.clientY
    });
  }, []);
  
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragState.isDragging) return;
    
    const deltaX = e.clientX - dragState.lastX;
    const deltaY = e.clientY - dragState.lastY;
    
    // Throttle обновлений
    if (Math.abs(deltaX) > 0 || Math.abs(deltaY) > 0) {
      handlePan(-deltaX, -deltaY);
      
      setDragState(prev => ({
        ...prev,
        lastX: e.clientX,
        lastY: e.clientY
      }));
    }
  }, [dragState, handlePan]);
  
  const handleMouseUp = useCallback(() => {
    setDragState(prev => ({ ...prev, isDragging: false }));
  }, []);
  
  const handleMouseWheel = useCallback((e: React.WheelEvent) => {
    // preventDefault вызывается только при необходимости
    if (e.deltaY !== 0) {
      e.preventDefault();
    }
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const centerX = e.clientX - rect.left;
    const centerY = e.clientY - rect.top;
    
    handleWheel(e.deltaY, centerX, centerY);
  }, [handleWheel]);
  
  // Обработка клика для размещения пикселя
  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    // Проверяем, что это был клик, а не drag
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect || dragState.isDragging) return;
    
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    
    const worldPos = handleClick(clickX, clickY);
    if (!worldPos || energy <= 0) return;
    
    const { worldX, worldY } = worldPos;
    const color = selectedCountry?.color || '#FF0000';
    
    // Размещаем пиксель
    placePixel(worldX, worldY, color);
    decreaseEnergy();
    
    // Уведомляем родительский компонент
    onPixelPlaced?.(worldX, worldY, color);
    
    // Визуальный эффект
    showPixelPlacementEffect(clickX, clickY, color);
  }, [dragState.isDragging, handleClick, energy, selectedCountry, placePixel, decreaseEnergy, onPixelPlaced]);
  
  // Touch события для мобильных
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // Не используем preventDefault для passive listeners
    // e.preventDefault();
    
    const now = Date.now();
    const touch = e.touches[0];
    
    if (e.touches.length === 1) {
      // Обработка двойного тапа
      if (now - touchState.lastTouchTime < 300) {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (rect) {
          const centerX = touch.clientX - rect.left;
          const centerY = touch.clientY - rect.top;
          handleDoubleClick(centerX, centerY);
        }
      }
      
      setTouchState(prev => ({ ...prev, lastTouchTime: now }));
      setDragState({
        isDragging: true,
        startX: touch.clientX,
        startY: touch.clientY,
        lastX: touch.clientX,
        lastY: touch.clientY
      });
    } else if (e.touches.length === 2) {
      // Pinch-to-zoom
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) +
        Math.pow(touch2.clientY - touch1.clientY, 2)
      );
      
      setTouchState(prev => ({
        ...prev,
        pinchDistance: distance,
        isPinching: true
      }));
    }
  }, [touchState.lastTouchTime, handleDoubleClick]);
  
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    // Не используем preventDefault для passive listeners
    // e.preventDefault();
    
    if (e.touches.length === 1 && dragState.isDragging && !touchState.isPinching) {
      const touch = e.touches[0];
      const deltaX = touch.clientX - dragState.lastX;
      const deltaY = touch.clientY - dragState.lastY;
      
      handlePan(-deltaX, -deltaY);
      
      setDragState(prev => ({
        ...prev,
        lastX: touch.clientX,
        lastY: touch.clientY
      }));
    } else if (e.touches.length === 2 && touchState.isPinching) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const newDistance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) +
        Math.pow(touch2.clientY - touch1.clientY, 2)
      );
      
      if (touchState.pinchDistance > 0) {
        const scale = newDistance / touchState.pinchDistance;
        const centerX = (touch1.clientX + touch2.clientX) / 2;
        const centerY = (touch1.clientY + touch2.clientY) / 2;
        
        const rect = canvasRef.current?.getBoundingClientRect();
        if (rect) {
          const localX = centerX - rect.left;
          const localY = centerY - rect.top;
          
          const deltaY = scale > 1 ? -100 : 100;
          handleWheel(deltaY, localX, localY);
        }
      }
      
      setTouchState(prev => ({
        ...prev,
        pinchDistance: newDistance
      }));
    }
  }, [dragState, touchState, handlePan, handleWheel]);
  
  const handleTouchEnd = useCallback(() => {
    setDragState(prev => ({ ...prev, isDragging: false }));
    setTouchState(prev => ({
      ...prev,
      isPinching: false,
      pinchDistance: 0
    }));
  }, []);
  
  // Визуальный эффект размещения пикселя
  const showPixelPlacementEffect = useCallback((x: number, y: number, color: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Анимация пульсации
    let radius = 0;
    const maxRadius = 30;
    
    const animate = () => {
      const alpha = Math.max(0, 1 - radius / maxRadius);
      
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      
      radius += 3;
      
      if (radius < maxRadius) {
        requestAnimationFrame(animate);
      }
    };
    
    animate();
  }, []);

  return (
    <div 
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden bg-gray-900 ${className}`}
      style={{ touchAction: 'none' }}
    >
      {/* Основной canvas карты */}
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleCanvasClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="absolute inset-0 cursor-grab active:cursor-grabbing"
        style={{
          imageRendering: settings.pixelatedRendering && viewport.zoom > 2 ? 'pixelated' : 'auto',
          width: '100%',
          height: '100%',
          backgroundColor: '#0a0e27'
        }}
      />
      
      {/* Фиксированный UI поверх карты */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Debug информация - показываем всегда в dev режиме */}
        {(showDebugInfo || process.env.NODE_ENV === 'development') && (
          <div className="absolute top-4 left-4 bg-black/70 text-white p-3 rounded-lg text-sm font-mono pointer-events-auto max-w-xs">
            <div className="text-cyan-400 font-bold mb-2">MAP DEBUG</div>
            <div>Init: {isInitialized ? '✅' : '❌'}</div>
            <div>Renderer: {offscreenRenderer ? '✅' : '❌'}</div>
            <div>Zoom: {viewport.zoom.toFixed(2)}x</div>
            <div>Position: ({Math.floor(viewport.x)}, {Math.floor(viewport.y)})</div>
            <div>Canvas: {viewport.width}x{viewport.height}</div>
            <div>FPS: {performance.fps.toFixed(1)}</div>
            <div>Chunks: {performance.chunksVisible}/{performance.chunksLoaded}</div>
            <div>Frame: {performance.frameTime.toFixed(1)}ms</div>
            {performance.memoryUsage > 0 && (
              <div>Memory: {(performance.memoryUsage / 1024 / 1024).toFixed(1)}MB</div>
            )}
            <div className="mt-2 text-xs text-white/60">
              Откройте консоль для логов
            </div>
          </div>
        )}
        
        {/* Координаты курсора */}
        <div 
          className="absolute top-4 right-4 bg-black/70 text-white px-3 py-2 rounded-lg text-sm font-mono pointer-events-auto"
          onMouseMove={(e) => {
            const rect = canvasRef.current?.getBoundingClientRect();
            if (rect) {
              const screenX = e.clientX - rect.left;
              const screenY = e.clientY - rect.top;
              const world = useMapStore.getState().screenToWorld(screenX, screenY);
              
              const element = e.currentTarget;
              element.textContent = `${Math.floor(world.x)}, ${Math.floor(world.y)}`;
            }
          }}
        >
          0, 0
        </div>
        
        {/* Мини-карта */}
        <div className="absolute bottom-4 right-4 w-32 h-32 bg-black/80 border-2 border-cyan-400 rounded-lg overflow-hidden pointer-events-auto">
          <div 
            className="absolute border-2 border-cyan-400 bg-cyan-400/20"
            style={{
              left: `${(viewport.x / 16384) * 100}%`,
              top: `${(viewport.y / 16384) * 100}%`,
              width: `${Math.min(100, (viewport.width / viewport.zoom / 16384) * 100)}%`,
              height: `${Math.min(100, (viewport.height / viewport.zoom / 16384) * 100)}%`,
              transform: 'translate(-50%, -50%)'
            }}
          />
        </div>
        
        {/* Индикаторы состояния */}
        <div className="absolute bottom-4 left-4 flex flex-col gap-2 pointer-events-auto">
          {/* Energy indicator */}
          <div className="bg-black/70 text-white px-3 py-2 rounded-lg text-sm">
            Energy: {energy}
          </div>
          
          {/* Selected country */}
          {selectedCountry && (
            <div 
              className="bg-black/70 text-white px-3 py-2 rounded-lg text-sm flex items-center gap-2"
              style={{ borderLeft: `4px solid ${selectedCountry.color}` }}
            >
              <span>{selectedCountry.name}</span>
            </div>
          )}
          
          {/* Loading indicator */}
          {performance.chunksLoaded < performance.chunksVisible && (
            <div className="bg-black/70 text-white px-3 py-2 rounded-lg text-sm">
              Loading chunks... ({performance.chunksLoaded}/{performance.chunksVisible})
            </div>
          )}
        </div>
        
        {/* Zoom controls */}
        <div className="absolute top-1/2 right-4 -translate-y-1/2 flex flex-col gap-2 pointer-events-auto">
          <button
            onClick={() => {
              const center = {
                x: viewport.width / 2,
                y: viewport.height / 2
              };
              handleWheel(-500, center.x, center.y);
            }}
            className="w-10 h-10 bg-black/70 hover:bg-black/90 text-white rounded-lg flex items-center justify-center text-lg font-bold transition-colors"
            disabled={viewport.zoom >= useMapStore.getState().maxZoom}
          >
            +
          </button>
          <button
            onClick={() => {
              const center = {
                x: viewport.width / 2,
                y: viewport.height / 2
              };
              handleWheel(500, center.x, center.y);
            }}
            className="w-10 h-10 bg-black/70 hover:bg-black/90 text-white rounded-lg flex items-center justify-center text-lg font-bold transition-colors"
            disabled={viewport.zoom <= useMapStore.getState().minZoom}
          >
            −
          </button>
        </div>
        
        {/* Центральный перекрестие */}
        {viewport.zoom > 4 && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
            <div className="w-5 h-5 border border-white/50 bg-white/10 rounded-sm"></div>
          </div>
        )}
      </div>
      
      {/* Loading overlay */}
      {!isInitialized && (
        <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
          <div className="text-center">
            <div className="text-white text-xl mb-4">
              Initializing World Map...
            </div>
            <div className="text-white/60 text-sm">
              Если карта не загружается, проверьте консоль
            </div>
          </div>
        </div>
      )}
      
      {/* Debug fallback */}
      {isInitialized && !offscreenRenderer && (
        <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
          <div className="text-center">
            <div className="text-red-400 text-xl mb-4">
              Ошибка инициализации рендерера
            </div>
            <div className="text-white/60 text-sm">
              Проверьте консоль для подробностей
            </div>
          </div>
        </div>
      )}
    </div>
  );
};