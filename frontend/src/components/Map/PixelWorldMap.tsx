import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useGameStore } from '../../store/gameStore';
import { TileRenderer } from './TileRenderer';
import { PixelMapController } from '../../utils/PixelMapController';

interface ViewportState {
  x: number;
  y: number;
  zoom: number;
  width: number;
  height: number;
}

export const PixelWorldMap: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const controllerRef = useRef<PixelMapController | null>(null);
  
  const [viewport, setViewport] = useState<ViewportState>({
    x: 8192, // Центр карты
    y: 8192,
    zoom: 1,
    width: 0,
    height: 0
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [loadedTiles, setLoadedTiles] = useState(new Set<string>());
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [lastTapTime, setLastTapTime] = useState(0);
  
  const { 
    selectedCountry, 
    energy,
    decreaseEnergy,
  } = useGameStore();

  // Инициализация контроллера
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d', { 
      alpha: false,
      desynchronized: true 
    });
    if (!ctx) return;
    
    // Создаем offscreen canvas для буферизации
    offscreenCanvasRef.current = document.createElement('canvas');
    offscreenCanvasRef.current.width = canvas.width;
    offscreenCanvasRef.current.height = canvas.height;
    
    // Инициализируем контроллер
    controllerRef.current = new PixelMapController(canvas, ctx);
    controllerRef.current.initialize();
    
    setIsLoading(false);
    
    return () => {
      controllerRef.current?.cleanup();
    };
  }, []);

  // Обновление размеров canvas
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      
      if (offscreenCanvasRef.current) {
        offscreenCanvasRef.current.width = canvas.width;
        offscreenCanvasRef.current.height = canvas.height;
      }
      
      setViewport(prev => ({
        ...prev,
        width: rect.width,
        height: rect.height
      }));
      
      renderFrame();
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Основной рендер
  const renderFrame = useCallback(() => {
    const controller = controllerRef.current;
    if (!controller) return;
    
    controller.render(viewport, loadedTiles);
  }, [viewport, loadedTiles]);

  // Обработка масштабирования
  const handleZoom = useCallback((delta: number, centerX: number, centerY: number) => {
    setViewport(prev => {
      const newZoom = Math.max(0.125, Math.min(8, prev.zoom * (1 + delta * 0.001)));
      
      // Корректируем позицию для зума относительно курсора
      const scaleFactor = newZoom / prev.zoom;
      const newX = centerX - (centerX - prev.x) * scaleFactor;
      const newY = centerY - (centerY - prev.y) * scaleFactor;
      
      return {
        ...prev,
        zoom: newZoom,
        x: Math.max(0, Math.min(16384, newX)),
        y: Math.max(0, Math.min(16384, newY))
      };
    });
  }, []);

  // Обработка колесика мыши
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const mouseX = viewport.x + (e.clientX - rect.left) / viewport.zoom;
    const mouseY = viewport.y + (e.clientY - rect.top) / viewport.zoom;
    
    handleZoom(-e.deltaY, mouseX, mouseY);
  }, [viewport, handleZoom]);

  // Обработка начала перетаскивания
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  }, []);

  // Обработка перемещения мыши
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    
    const deltaX = (e.clientX - dragStart.x) / viewport.zoom;
    const deltaY = (e.clientY - dragStart.y) / viewport.zoom;
    
    setViewport(prev => ({
      ...prev,
      x: Math.max(0, Math.min(16384 - prev.width / prev.zoom, prev.x - deltaX)),
      y: Math.max(0, Math.min(16384 - prev.height / prev.zoom, prev.y - deltaY))
    }));
    
    setDragStart({ x: e.clientX, y: e.clientY });
  }, [isDragging, dragStart, viewport]);

  // Обработка окончания перетаскивания
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Обработка клика (размещение пикселя)
  const handleClick = useCallback((e: React.MouseEvent) => {
    if (energy <= 0) return;
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const worldX = Math.floor(viewport.x + (e.clientX - rect.left) / viewport.zoom);
    const worldY = Math.floor(viewport.y + (e.clientY - rect.top) / viewport.zoom);
    
    if (worldX >= 0 && worldX < 16384 && worldY >= 0 && worldY < 16384) {
      // Отправляем пиксель на сервер
      controllerRef.current?.placePixel(worldX, worldY, selectedCountry?.color || '#FF0000');
      decreaseEnergy();
      
      // Визуальный эффект
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (ctx) {
        const canvasX = (worldX - viewport.x) * viewport.zoom;
        const canvasY = (worldY - viewport.y) * viewport.zoom;
        
        // Анимация пульсации
        let radius = 0;
        const animate = () => {
          ctx.save();
          ctx.globalAlpha = Math.max(0, 1 - radius / 30);
          ctx.strokeStyle = selectedCountry?.color || '#FF0000';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(canvasX, canvasY, radius, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
          
          radius += 2;
          if (radius < 30) {
            requestAnimationFrame(animate);
          } else {
            renderFrame();
          }
        };
        animate();
      }
    }
  }, [viewport, energy, selectedCountry, decreaseEnergy, renderFrame]);

  // Touch события для мобильных
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const now = Date.now();
    const touch = e.touches[0];
    
    // Обработка двойного тапа для зума
    if (now - lastTapTime < 300 && e.touches.length === 1) {
      e.preventDefault();
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      
      const worldX = viewport.x + (touch.clientX - rect.left) / viewport.zoom;
      const worldY = viewport.y + (touch.clientY - rect.top) / viewport.zoom;
      handleZoom(500, worldX, worldY);
    }
    
    setLastTapTime(now);
    
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({ x: touch.clientX, y: touch.clientY });
    }
  }, [lastTapTime, viewport, handleZoom]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    e.preventDefault();
    
    const touch = e.touches[0];
    const deltaX = (touch.clientX - dragStart.x) / viewport.zoom;
    const deltaY = (touch.clientY - dragStart.y) / viewport.zoom;
    
    setViewport(prev => ({
      ...prev,
      x: Math.max(0, Math.min(16384 - prev.width / prev.zoom, prev.x - deltaX)),
      y: Math.max(0, Math.min(16384 - prev.height / prev.zoom, prev.y - deltaY))
    }));
    
    setDragStart({ x: touch.clientX, y: touch.clientY });
  }, [isDragging, dragStart, viewport]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Рендер при изменении viewport
  useEffect(() => {
    renderFrame();
  }, [viewport, renderFrame]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <canvas
        ref={canvasRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          width: '100%',
          height: '100%',
          cursor: isDragging ? 'grabbing' : 'grab',
          touchAction: 'none',
          imageRendering: viewport.zoom > 4 ? 'pixelated' : 'auto'
        }}
      />
      
      {/* HUD */}
      <div style={{
        position: 'absolute',
        top: 10,
        left: 10,
        padding: '10px',
        background: 'rgba(0, 0, 0, 0.7)',
        borderRadius: '8px',
        color: 'white',
        fontSize: '12px',
        pointerEvents: 'none',
        fontFamily: 'monospace'
      }}>
        <div>Zoom: {viewport.zoom.toFixed(2)}x</div>
        <div>Position: {Math.floor(viewport.x)}, {Math.floor(viewport.y)}</div>
        <div>Energy: {energy}</div>
        <div>Tiles: {loadedTiles.size}</div>
      </div>
      
      {/* Мини-карта */}
      <div style={{
        position: 'absolute',
        bottom: 10,
        right: 10,
        width: '150px',
        height: '150px',
        background: 'rgba(0, 0, 0, 0.8)',
        border: '2px solid #00d4ff',
        borderRadius: '8px',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute',
          left: `${(viewport.x / 16384) * 100}%`,
          top: `${(viewport.y / 16384) * 100}%`,
          width: `${(viewport.width / viewport.zoom / 16384) * 100}%`,
          height: `${(viewport.height / viewport.zoom / 16384) * 100}%`,
          border: '2px solid #00d4ff',
          background: 'rgba(0, 212, 255, 0.2)',
          transform: 'translate(-50%, -50%)'
        }} />
      </div>
      
      {isLoading && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: 'white',
          fontSize: '20px',
          textShadow: '0 0 10px rgba(0, 212, 255, 0.8)'
        }}>
          Loading World Map...
        </div>
      )}
    </div>
  );
};