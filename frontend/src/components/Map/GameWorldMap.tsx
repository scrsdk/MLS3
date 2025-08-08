import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';
import { useTelegram } from '../../hooks/useTelegram';
import { gameAPI } from '../../services/api';
import wsService from '../../services/websocket';
import { 
  WorldCountry, 
  MAP_CONFIG,
  loadWorldTopology,
  getVisibleCountries,
  getMapViewport,
  getSimplifiedPath,
  renderOptimizer,
  FOG_OF_WAR_COLORS,
  projection
} from '../../utils/worldData';
import { 
  getLODLevel,
  isCountryVisible,
  spatialIndex,
  pointInPolygon
} from '../../utils/geoHelpers';
import { 
  MapTransformHelper, 
 
  ProgressAnimator, 
  RenderHelper,
  PerformanceHelper,
  MapTransform
} from '../../utils/mapHelpers';
import { ParticleSystem } from '../../utils/particleSystem';
import type { Pixel } from '../../types';

interface TouchPoint {
  id: number;
  x: number;
  y: number;
  timestamp: number;
}

interface RippleEffect {
  id: string;
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  opacity: number;
  color: string;
  startTime: number;
}

export const GameWorldMap: React.FC = () => {
  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const backgroundCanvasRef = useRef<HTMLCanvasElement>(null);
  const effectsCanvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>(0);
  
  // Hooks
  const { hapticFeedback } = useTelegram();
  const { 
    pixels, 
    selectedCountry, 
    energy,
    decreaseEnergy,
    addPixel,
    mapCenter,
    mapZoom,
    setMapView
  } = useGameStore();
  
  // State
  const [worldCountries, setWorldCountries] = useState<WorldCountry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [touches, setTouches] = useState<TouchPoint[]>([]);
  const [lastTouchDistance, setLastTouchDistance] = useState(0);
  const [rippleEffects, setRippleEffects] = useState<RippleEffect[]>([]);
  
  // Managers
  const progressAnimator = useMemo(() => new ProgressAnimator(), []);
  const particleSystem = useMemo(() => new ParticleSystem(), []);
  
  // Transform state
  const [transform, setTransform] = useState<MapTransform>({
    x: MAP_CONFIG.INITIAL_CENTER.x,
    y: MAP_CONFIG.INITIAL_CENTER.y,
    scale: MAP_CONFIG.INITIAL_ZOOM
  });
  
  // Загрузка данных карты с оптимизацией
  useEffect(() => {
    const loadMapData = async () => {
      try {
        const worldData = await loadWorldTopology();
        setWorldCountries(worldData);
        
        // Инициализируем spatial index для быстрого поиска
        spatialIndex.buildIndex(worldData);
      } catch (error) {
        console.error('Ошибка загрузки карты:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadMapData();
  }, []);
  
  // Синхронизация transform с store
  useEffect(() => {
    setTransform({
      x: mapCenter.x,
      y: mapCenter.y,
      scale: mapZoom
    });
  }, [mapCenter, mapZoom]);
  
  // Инициализация canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const backgroundCanvas = backgroundCanvasRef.current;
    const effectsCanvas = effectsCanvasRef.current;
    
    if (!canvas || !backgroundCanvas || !effectsCanvas) return;
    
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight * 0.75;
      
      [canvas, backgroundCanvas, effectsCanvas].forEach(c => {
        c.width = width * window.devicePixelRatio;
        c.height = height * window.devicePixelRatio;
        c.style.width = `${width}px`;
        c.style.height = `${height}px`;
        
        const ctx = c.getContext('2d');
        if (ctx) {
          ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        }
      });
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  
  // Отрисовка фона карты (океан)
  const drawBackground = useCallback((ctx: CanvasRenderingContext2D) => {
    const canvas = ctx.canvas;
    
    // Очистка с цветом океана
    ctx.fillStyle = FOG_OF_WAR_COLORS.OCEAN;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Применяем трансформацию
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.scale(transform.scale, transform.scale);
    ctx.translate(-transform.x, -transform.y);
    
    // Рисуем сетку для отладки
    if (transform.scale > 2) {
      ctx.strokeStyle = '#e0e0e0';
      ctx.lineWidth = 0.5 / transform.scale;
      
      const gridSize = 50;
      const startX = Math.floor((transform.x - canvas.width / 2 / transform.scale) / gridSize) * gridSize;
      const endX = Math.ceil((transform.x + canvas.width / 2 / transform.scale) / gridSize) * gridSize;
      const startY = Math.floor((transform.y - canvas.height / 2 / transform.scale) / gridSize) * gridSize;
      const endY = Math.ceil((transform.y + canvas.height / 2 / transform.scale) / gridSize) * gridSize;
      
      for (let x = startX; x <= endX; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, startY);
        ctx.lineTo(x, endY);
        ctx.stroke();
      }
      
      for (let y = startY; y <= endY; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(startX, y);
        ctx.lineTo(endX, y);
        ctx.stroke();
      }
    }
    
    ctx.restore();
  }, [transform]);
  
  // Отрисовка стран с Fog of War и оптимизацией
  const drawCountries = useCallback((ctx: CanvasRenderingContext2D) => {
    const canvas = ctx.canvas;
    
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.scale(transform.scale, transform.scale);
    ctx.translate(-transform.x, -transform.y);
    
    // Определяем видимую область и LOD
    const viewport = getMapViewport(canvas, transform);
    const visibleCountries = getVisibleCountries(worldCountries, viewport, transform.scale);
    const lodLevel = getLODLevel(transform.scale);
    
    // Обновляем FPS счетчик
    renderOptimizer.updateFrame();
    
    // Рендерим только видимые страны
    visibleCountries.forEach(country => {
      const progress = progressAnimator.getCurrent(`country_${country.id}`) || 0;
      
      // Определяем цвет на основе прогресса (Fog of War)
      let fillColor = FOG_OF_WAR_COLORS.UNEXPLORED;
      if (progress > 0.8) {
        fillColor = country.color;
      } else if (progress > 0.1) {
        fillColor = FOG_OF_WAR_COLORS.EXPLORING;
      }
      
      // Рисуем страну
      ctx.fillStyle = fillColor;
      ctx.globalAlpha = progress > 0 ? 1 : MAP_CONFIG.FOG_ALPHA;
      
      // Используем Path2D для лучшей производительности
      const path = new Path2D(getSimplifiedPath(country.id, lodLevel) || country.path);
      ctx.fill(path);
      
      // Обводка страны
      ctx.globalAlpha = 1;
      ctx.strokeStyle = country.id === selectedCountry?.id ? '#00ff00' : FOG_OF_WAR_COLORS.BORDER;
      ctx.lineWidth = (country.id === selectedCountry?.id ? 2 : 0.5) / transform.scale;
      ctx.stroke(path);
      
      // Название страны при большом зуме
      if (transform.scale > 2 && progress > 0.3) {
        ctx.fillStyle = progress > 0.5 ? '#fff' : '#333';
        ctx.font = `${Math.max(10, 12 / transform.scale)}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 2;
        ctx.fillText(country.nameRu, country.centroid[0], country.centroid[1]);
        ctx.shadowBlur = 0;
      }
      
      // Индикатор прогресса
      if (progress > 0 && progress < 1 && transform.scale > 1.5) {
        const barWidth = 60 / transform.scale;
        const barHeight = 6 / transform.scale;
        const barX = country.centroid[0] - barWidth / 2;
        const barY = country.centroid[1] + 20 / transform.scale;
        
        // Фон полосы
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(barX, barY, barWidth, barHeight);
        
        // Прогресс
        ctx.fillStyle = country.color;
        ctx.fillRect(barX, barY, barWidth * progress, barHeight);
        
        // Обводка
        ctx.strokeStyle = FOG_OF_WAR_COLORS.BORDER;
        ctx.lineWidth = 0.5 / transform.scale;
        ctx.strokeRect(barX, barY, barWidth, barHeight);
      }
    });
    
    ctx.restore();
  }, [worldCountries, transform, selectedCountry, progressAnimator]);
  
  // Отрисовка пикселей
  const drawPixels = useCallback((ctx: CanvasRenderingContext2D) => {
    const canvas = ctx.canvas;
    
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.scale(transform.scale, transform.scale);
    ctx.translate(-transform.x, -transform.y);
    
    // Рисуем пиксели только при достаточном зуме
    if (transform.scale > 3) {
      pixels.forEach(pixel => {
        ctx.fillStyle = pixel.color;
        ctx.fillRect(pixel.x, pixel.y, 1, 1);
      });
    }
    
    ctx.restore();
  }, [pixels, transform]);
  
  // Отрисовка эффектов
  const drawEffects = useCallback((ctx: CanvasRenderingContext2D) => {
    const canvas = ctx.canvas;
    
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.scale(transform.scale, transform.scale);
    ctx.translate(-transform.x, -transform.y);
    
    // Рисуем частицы
    particleSystem.render(ctx);
    
    // Рисуем ripple эффекты
    const now = performance.now();
    rippleEffects.forEach(ripple => {
      const elapsed = (now - ripple.startTime) / 1000;
      const progress = elapsed / (MAP_CONFIG.TAP_ANIMATION_DURATION / 1000);
      
      if (progress < 1) {
        const currentRadius = ripple.maxRadius * progress;
        const opacity = ripple.opacity * (1 - progress);
        
        RenderHelper.drawRippleEffect(
          ctx,
          ripple.x,
          ripple.y,
          currentRadius,
          opacity,
          ripple.color
        );
      }
    });
    
    ctx.restore();
  }, [transform, particleSystem, rippleEffects]);
  
  // Главный цикл рендеринга
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const backgroundCanvas = backgroundCanvasRef.current;
    const effectsCanvas = effectsCanvasRef.current;
    
    if (!canvas || !backgroundCanvas || !effectsCanvas) return;
    
    const mainCtx = canvas.getContext('2d');
    const bgCtx = backgroundCanvas.getContext('2d');
    const effectsCtx = effectsCanvas.getContext('2d');
    
    if (!mainCtx || !bgCtx || !effectsCtx) return;
    
    // Обновляем время кадра
    const deltaTime = PerformanceHelper.updateFrameTime() / 1000;
    
    // Обновляем анимации
    const hasProgressChanges = progressAnimator.update(deltaTime * 60);
    particleSystem.update(deltaTime);
    
    // Очистка эффектов
    effectsCtx.clearRect(0, 0, effectsCanvas.width, effectsCanvas.height);
    
    // Отрисовка фона (только при изменениях)
    if (hasProgressChanges || isDragging) {
      bgCtx.clearRect(0, 0, backgroundCanvas.width, backgroundCanvas.height);
      drawBackground(bgCtx);
      drawCountries(bgCtx);
      drawPixels(bgCtx);
    }
    
    // Копируем фон на основной canvas
    mainCtx.clearRect(0, 0, canvas.width, canvas.height);
    mainCtx.drawImage(backgroundCanvas, 0, 0);
    
    // Отрисовка эффектов
    drawEffects(effectsCtx);
    mainCtx.drawImage(effectsCanvas, 0, 0);
    
    // Очистка старых ripple эффектов
    const now = performance.now();
    setRippleEffects(prev => prev.filter(ripple => 
      (now - ripple.startTime) < MAP_CONFIG.TAP_ANIMATION_DURATION
    ));
    
  }, [drawBackground, drawCountries, drawPixels, drawEffects, isDragging, progressAnimator, particleSystem]);
  
  // Анимационный цикл
  useEffect(() => {
    const animate = () => {
      render();
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    
    if (!isLoading) {
      animate();
    }
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [render, isLoading]);
  
  // Обработка тапа
  const handleTap = useCallback(async (screenX: number, screenY: number) => {
    const canvas = canvasRef.current;
    if (!canvas || energy <= 0) {
      if (energy <= 0) {
        hapticFeedback('medium');
      }
      return;
    }
    
    const worldCoords = MapTransformHelper.screenToWorld(screenX, screenY, canvas, transform);
    
    // Находим страну под тапом с точным hit-testing
    const tappedCountry = worldCountries.find(country => {
      // Сначала быстрая проверка по bounds
      if (worldCoords.x < country.bounds.minX || worldCoords.x > country.bounds.maxX ||
          worldCoords.y < country.bounds.minY || worldCoords.y > country.bounds.maxY) {
        return false;
      }
      
      // Затем точная проверка с point-in-polygon
      const geoCoords = projection.invert && projection.invert([worldCoords.x, worldCoords.y]);
      if (!geoCoords) return false;
      
      return pointInPolygon([geoCoords[0], geoCoords[1]], country.coordinates);
    });
    
    if (!tappedCountry || !selectedCountry) {
      return;
    }
    
    // Создаем эффекты
    createTapEffects(worldCoords.x, worldCoords.y, selectedCountry.color);
    
    // Обновляем прогресс
    const currentProgress = progressAnimator.getTarget(`country_${tappedCountry.id}`) || 0;
    const newProgress = Math.min(1, currentProgress + 0.05);
    progressAnimator.setTarget(`country_${tappedCountry.id}`, newProgress);
    
    // Оптимистичное обновление
    const pixel: Pixel = {
      x: Math.floor(worldCoords.x),
      y: Math.floor(worldCoords.y),
      countryId: tappedCountry.id,
      color: selectedCountry.color,
      placedBy: 'current-user',
      placedAt: new Date(),
    };
    
    addPixel(pixel);
    decreaseEnergy();
    hapticFeedback('light');
    
    // Отправка на сервер
    try {
      const result = await gameAPI.placeTap(
        tappedCountry.id, 
        Math.floor(worldCoords.x), 
        Math.floor(worldCoords.y)
      );
      
      if (!result.success) {
        // Откат изменений
        decreaseEnergy(-1);
        progressAnimator.setTarget(`country_${tappedCountry.id}`, currentProgress);
      }
    } catch (error) {
      console.error('Ошибка тапа:', error);
      decreaseEnergy(-1);
      progressAnimator.setTarget(`country_${tappedCountry.id}`, currentProgress);
    }
    
    // Отправка через WebSocket
    wsService.sendTap(tappedCountry.id, Math.floor(worldCoords.x), Math.floor(worldCoords.y));
    
  }, [transform, worldCountries, selectedCountry, energy, progressAnimator, addPixel, decreaseEnergy, hapticFeedback]);
  
  // Создание эффектов тапа
  const createTapEffects = useCallback((x: number, y: number, color: string) => {
    // Создаем частицы
    particleSystem.createTapExplosion(x, y, color);
    
    // Создаем ripple эффект
    const ripple: RippleEffect = {
      id: `ripple_${Date.now()}_${Math.random()}`,
      x,
      y,
      radius: 0,
      maxRadius: 30,
      opacity: 0.8,
      color,
      startTime: performance.now()
    };
    
    setRippleEffects(prev => [...prev, ripple]);
  }, [particleSystem]);
  
  // Touch обработчики
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    
    const newTouches: TouchPoint[] = Array.from(e.touches).map(touch => ({
      id: touch.identifier,
      x: touch.clientX,
      y: touch.clientY,
      timestamp: Date.now()
    }));
    
    setTouches(newTouches);
    
    if (newTouches.length === 1) {
      setIsDragging(true);
    } else if (newTouches.length === 2) {
      const dx = newTouches[0].x - newTouches[1].x;
      const dy = newTouches[0].y - newTouches[1].y;
      setLastTouchDistance(Math.sqrt(dx * dx + dy * dy));
    }
  }, []);
  
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    
    const currentTouches: TouchPoint[] = Array.from(e.touches).map(touch => ({
      id: touch.identifier,
      x: touch.clientX,
      y: touch.clientY,
      timestamp: Date.now()
    }));
    
    if (currentTouches.length === 1 && touches.length === 1 && isDragging) {
      // Панорамирование
      const touch = currentTouches[0];
      const prevTouch = touches.find(t => t.id === touch.id);
      
      if (prevTouch) {
        const dx = (touch.x - prevTouch.x) / transform.scale;
        const dy = (touch.y - prevTouch.y) / transform.scale;
        
        const newTransform = MapTransformHelper.constrainTransform({
          x: transform.x - dx,
          y: transform.y - dy,
          scale: transform.scale
        });
        
        setTransform(newTransform);
        setMapView({ x: newTransform.x, y: newTransform.y }, newTransform.scale);
      }
    } else if (currentTouches.length === 2 && lastTouchDistance > 0) {
      // Зум
      const dx = currentTouches[0].x - currentTouches[1].x;
      const dy = currentTouches[0].y - currentTouches[1].y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      const scale = distance / lastTouchDistance;
      const newTransform = MapTransformHelper.constrainTransform({
        ...transform,
        scale: transform.scale * scale
      });
      
      setTransform(newTransform);
      setMapView({ x: newTransform.x, y: newTransform.y }, newTransform.scale);
      setLastTouchDistance(distance);
    }
    
    setTouches(currentTouches);
  }, [touches, transform, isDragging, lastTouchDistance]);
  
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    
    if (e.touches.length === 0) {
      // Проверяем, был ли это тап
      if (isDragging && e.changedTouches.length === 1) {
        const touch = e.changedTouches[0];
        const startTouch = touches.find(t => t.id === touch.identifier);
        
        if (startTouch) {
          const dx = Math.abs(touch.clientX - startTouch.x);
          const dy = Math.abs(touch.clientY - startTouch.y);
          const dt = Date.now() - startTouch.timestamp;
          
          // Если движение минимальное и время короткое - это тап
          if (dx < 10 && dy < 10 && dt < 300) {
            handleTap(touch.clientX, touch.clientY);
          }
        }
      }
      
      setIsDragging(false);
      setTouches([]);
      setLastTouchDistance(0);
    }
  }, [touches, isDragging, handleTap]);
  
  if (isLoading) {
    return (
      <motion.div 
        className="flex items-center justify-center h-full bg-gray-100"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка карты мира...</p>
        </div>
      </motion.div>
    );
  }
  
  return (
    <div className="relative w-full h-full overflow-hidden bg-gray-100">
      {/* Canvas слои */}
      <canvas
        ref={backgroundCanvasRef}
        className="absolute inset-0 pointer-events-none"
        style={{ zIndex: 1 }}
      />
      <canvas
        ref={effectsCanvasRef}
        className="absolute inset-0 pointer-events-none"
        style={{ zIndex: 2 }}
      />
      <canvas
        ref={canvasRef}
        className="absolute inset-0 touch-none select-none"
        style={{ 
          zIndex: 3,
          cursor: isDragging ? 'grabbing' : 'grab' 
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      />
      
      {/* UI оверлей */}
      <div className="absolute top-4 left-4 z-10 bg-black/50 text-white px-3 py-2 rounded">
        <div className="text-xs">
          <div>Zoom: {transform.scale.toFixed(2)}x</div>
          <div>FPS: {renderOptimizer.getFPS()}</div>
          <div>LOD: {getLODLevel(transform.scale)}</div>
          <div>Стран: {worldCountries.length}</div>
          <div>Видимо: {getVisibleCountries(worldCountries, getMapViewport(canvasRef.current || document.createElement('canvas'), transform), transform.scale).length}</div>
          <div>Частиц: {particleSystem.getParticleCount()}</div>
        </div>
      </div>
      
      {/* Zoom контролы */}
      <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-2">
        <button
          className="w-12 h-12 bg-white/90 rounded-full shadow-lg flex items-center justify-center text-xl font-bold"
          onClick={() => {
            const newTransform = MapTransformHelper.constrainTransform({
              ...transform,
              scale: transform.scale * 1.5
            });
            setTransform(newTransform);
            setMapView({ x: newTransform.x, y: newTransform.y }, newTransform.scale);
          }}
        >
          +
        </button>
        <button
          className="w-12 h-12 bg-white/90 rounded-full shadow-lg flex items-center justify-center text-xl font-bold"
          onClick={() => {
            const newTransform = MapTransformHelper.constrainTransform({
              ...transform,
              scale: transform.scale / 1.5
            });
            setTransform(newTransform);
            setMapView({ x: newTransform.x, y: newTransform.y }, newTransform.scale);
          }}
        >
          −
        </button>
      </div>
    </div>
  );
};