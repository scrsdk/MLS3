/**
 * Централизованный store для управления состоянием карты
 * Использует Zustand для эффективного управления состоянием
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { ViewportBounds, ChunkData } from '../utils/ChunkSystem';
import { ChunkSystem } from '../utils/ChunkSystem';
import { OffscreenRenderer } from '../utils/OffscreenRenderer';

export interface MapViewport {
  x: number;
  y: number;
  zoom: number;
  width: number;
  height: number;
}

export interface MapSettings {
  showGrid: boolean;
  showChunkBorders: boolean;
  enableSmoothScrolling: boolean;
  pixelatedRendering: boolean;
  preloadDistance: number;
  maxCacheSize: number;
}

export interface RenderPerformance {
  fps: number;
  frameTime: number;
  chunksLoaded: number;
  chunksVisible: number;
  memoryUsage: number;
}

interface MapState {
  // Viewport
  viewport: MapViewport;
  setViewport: (viewport: Partial<MapViewport>) => void;
  
  // Map bounds
  mapBounds: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  };
  
  // Системы рендеринга
  chunkSystem: ChunkSystem | null;
  offscreenRenderer: OffscreenRenderer | null;
  initializeRendering: (canvas: HTMLCanvasElement) => void;
  cleanupRendering: () => void;
  
  // Состояние загрузки
  isInitialized: boolean;
  isLoading: boolean;
  loadedChunks: Set<string>;
  visibleChunks: ChunkData[];
  
  // Настройки
  settings: MapSettings;
  updateSettings: (settings: Partial<MapSettings>) => void;
  
  // Производительность
  performance: RenderPerformance;
  updatePerformance: (perf: Partial<RenderPerformance>) => void;
  
  // Интерактивность
  isDragging: boolean;
  dragStartPosition: { x: number; y: number } | null;
  setDragging: (dragging: boolean, startPos?: { x: number; y: number }) => void;
  
  // Zoom ограничения
  minZoom: number;
  maxZoom: number;
  zoomSensitivity: number;
  
  // События мыши/touch
  handleWheel: (deltaY: number, centerX: number, centerY: number) => void;
  handlePan: (deltaX: number, deltaY: number) => void;
  handleClick: (x: number, y: number) => { worldX: number; worldY: number } | null;
  handleDoubleClick: (x: number, y: number) => void;
  
  // Утилиты
  screenToWorld: (screenX: number, screenY: number) => { x: number; y: number };
  worldToScreen: (worldX: number, worldY: number) => { x: number; y: number };
  isPointInBounds: (x: number, y: number) => boolean;
  
  // Pixel operations
  placePixel: (x: number, y: number, color: string) => void;
  invalidateRegion: (x: number, y: number, width?: number, height?: number) => void;
  
  // Метод для обновления видимых чанков
  updateVisibleChunks: () => void;
}

export const useMapStore = create<MapState>()(
  subscribeWithSelector((set, get) => ({
    // Начальное состояние viewport (центр карты)
    viewport: {
      x: 8192,
      y: 8192,
      zoom: 1,
      width: 800,
      height: 600
    },
    
    // Границы карты (16384x16384)
    mapBounds: {
      minX: 0,
      minY: 0,
      maxX: 16384,
      maxY: 16384
    },
    
    // Системы рендеринга
    chunkSystem: null,
    offscreenRenderer: null,
    
    isInitialized: false,
    isLoading: false,
    loadedChunks: new Set(),
    visibleChunks: [],
    
    // Настройки по умолчанию
    settings: {
      showGrid: true,
      showChunkBorders: false,
      enableSmoothScrolling: true,
      pixelatedRendering: true,
      preloadDistance: 2,
      maxCacheSize: 200
    },
    
    // Производительность
    performance: {
      fps: 60,
      frameTime: 16.67,
      chunksLoaded: 0,
      chunksVisible: 0,
      memoryUsage: 0
    },
    
    // Интерактивность
    isDragging: false,
    dragStartPosition: null,
    
    // Zoom настройки
    minZoom: 0.125,
    maxZoom: 16,
    zoomSensitivity: 0.001,
    
    setViewport: (newViewport) => {
      set((state) => {
        const updatedViewport = { ...state.viewport, ...newViewport };
        
        // Применяем ограничения
        updatedViewport.zoom = Math.max(
          state.minZoom, 
          Math.min(state.maxZoom, updatedViewport.zoom)
        );
        
        // Ограничиваем позицию в пределах карты
        const maxX = state.mapBounds.maxX - updatedViewport.width / updatedViewport.zoom;
        const maxY = state.mapBounds.maxY - updatedViewport.height / updatedViewport.zoom;
        
        updatedViewport.x = Math.max(
          state.mapBounds.minX, 
          Math.min(maxX, updatedViewport.x)
        );
        updatedViewport.y = Math.max(
          state.mapBounds.minY, 
          Math.min(maxY, updatedViewport.y)
        );
        
        return { viewport: updatedViewport };
      });
      
      // Обновляем рендеринг
      get().updateVisibleChunks();
    },
    
    initializeRendering: (canvas: HTMLCanvasElement) => {
      const state = get();
      
      if (state.isInitialized) {
        state.cleanupRendering();
      }
      
      try {
        const rect = canvas.getBoundingClientRect();
        const width = rect.width * window.devicePixelRatio;
        const height = rect.height * window.devicePixelRatio;
        
        const chunkSystem = new ChunkSystem();
        const offscreenRenderer = new OffscreenRenderer(width, height);
        
        set({
          chunkSystem,
          offscreenRenderer,
          isInitialized: true,
          viewport: {
            ...state.viewport,
            width: rect.width,
            height: rect.height
          }
        });
        
        // Запускаем обновление чанков
        get().updateVisibleChunks();
        
        console.log('Map rendering initialized successfully');
      } catch (error) {
        console.error('Failed to initialize map rendering:', error);
        set({ isInitialized: false });
      }
    },
    
    cleanupRendering: () => {
      try {
        const state = get();
        
        if (state.chunkSystem) {
          state.chunkSystem.cleanup();
        }
        if (state.offscreenRenderer) {
          state.offscreenRenderer.cleanup();
        }
        
        set({
          chunkSystem: null,
          offscreenRenderer: null,
          isInitialized: false,
          loadedChunks: new Set(),
          visibleChunks: []
        });
      } catch (error) {
        console.warn('Ошибка при очистке рендеринга:', error);
      }
    },
    
    updateSettings: (newSettings) => {
      set((state) => ({
        settings: { ...state.settings, ...newSettings }
      }));
    },
    
    updatePerformance: (perf) => {
      set((state) => ({
        performance: { ...state.performance, ...perf }
      }));
    },
    
    setDragging: (dragging, startPos) => {
      set({
        isDragging: dragging,
        dragStartPosition: startPos || null
      });
    },
    
    handleWheel: (deltaY, centerX, centerY) => {
      const state = get();
      const { viewport, zoomSensitivity } = state;
      
      // Вычисляем новый зум
      const zoomFactor = 1 + deltaY * zoomSensitivity;
      const newZoom = Math.max(
        state.minZoom, 
        Math.min(state.maxZoom, viewport.zoom * zoomFactor)
      );
      
      if (newZoom === viewport.zoom) return;
      
      // Вычисляем позицию мыши в мировых координатах
      const worldX = viewport.x + centerX / viewport.zoom;
      const worldY = viewport.y + centerY / viewport.zoom;
      
      // Корректируем позицию viewport для зума относительно курсора
      const newX = worldX - centerX / newZoom;
      const newY = worldY - centerY / newZoom;
      
      state.setViewport({
        x: newX,
        y: newY,
        zoom: newZoom
      });
    },
    
    handlePan: (deltaX, deltaY) => {
      const state = get();
      const { viewport } = state;
      
      const worldDeltaX = deltaX / viewport.zoom;
      const worldDeltaY = deltaY / viewport.zoom;
      
      state.setViewport({
        x: viewport.x - worldDeltaX,
        y: viewport.y - worldDeltaY
      });
    },
    
    handleClick: (screenX, screenY) => {
      const state = get();
      const world = state.screenToWorld(screenX, screenY);
      
      if (!state.isPointInBounds(world.x, world.y)) {
        return null;
      }
      
      return {
        worldX: Math.floor(world.x),
        worldY: Math.floor(world.y)
      };
    },
    
    handleDoubleClick: (screenX, screenY) => {
      const state = get();
      const world = state.screenToWorld(screenX, screenY);
      
      // Зум к точке при двойном клике
      const newZoom = Math.min(state.maxZoom, state.viewport.zoom * 2);
      
      state.setViewport({
        x: world.x - state.viewport.width / (2 * newZoom),
        y: world.y - state.viewport.height / (2 * newZoom),
        zoom: newZoom
      });
    },
    
    screenToWorld: (screenX, screenY) => {
      const { viewport } = get();
      return {
        x: viewport.x + screenX / viewport.zoom,
        y: viewport.y + screenY / viewport.zoom
      };
    },
    
    worldToScreen: (worldX, worldY) => {
      const { viewport } = get();
      return {
        x: (worldX - viewport.x) * viewport.zoom,
        y: (worldY - viewport.y) * viewport.zoom
      };
    },
    
    isPointInBounds: (x, y) => {
      const { mapBounds } = get();
      return (
        x >= mapBounds.minX && x < mapBounds.maxX &&
        y >= mapBounds.minY && y < mapBounds.maxY
      );
    },
    
    placePixel: (x, y, color) => {
      const state = get();
      
      if (!state.isPointInBounds(x, y) || !state.chunkSystem) {
        return;
      }
      
      // Обновляем пиксель в системе чанков
      state.chunkSystem.updatePixel(x, y, color);
      
      // Инвалидируем регион для перерисовки
      state.invalidateRegion(x, y, 1, 1);
      
      console.log(`Pixel placed at (${x}, ${y}) with color ${color}`);
    },
    
    invalidateRegion: (x, y, width = 1, height = 1) => {
      const state = get();
      
      if (!state.chunkSystem) return;
      
      // Инвалидируем все затронутые чанки
      const startChunkX = Math.floor(x / 256);
      const startChunkY = Math.floor(y / 256);
      const endChunkX = Math.floor((x + width - 1) / 256);
      const endChunkY = Math.floor((y + height - 1) / 256);
      
      for (let cy = startChunkY; cy <= endChunkY; cy++) {
        for (let cx = startChunkX; cx <= endChunkX; cx++) {
          state.chunkSystem.invalidateChunk(cx * 256, cy * 256);
        }
      }
      
      // Запускаем обновление
      state.updateVisibleChunks();
    },
    
    // Приватный метод для обновления видимых чанков
    updateVisibleChunks: () => {
      try {
        const state = get();
        
        if (!state.chunkSystem || !state.offscreenRenderer || !state.isInitialized) return;
        
        const { viewport } = state;
        if (!viewport || !isFinite(viewport.x) || !isFinite(viewport.y) || !isFinite(viewport.zoom)) {
          return;
        }
        
        const viewportBounds: ViewportBounds = {
          minX: viewport.x,
          minY: viewport.y,
          maxX: viewport.x + viewport.width / viewport.zoom,
          maxY: viewport.y + viewport.height / viewport.zoom,
          zoom: viewport.zoom
        };
        
        // Проверяем корректность bounds
        if (!isFinite(viewportBounds.maxX) || !isFinite(viewportBounds.maxY)) {
          return;
        }
        
        // Получаем необходимые чанки
        const chunks = state.chunkSystem.getRequiredChunks(viewportBounds);
        if (!chunks || !Array.isArray(chunks)) return;
        
        const loadedChunkIds = new Set(
          chunks
            .filter(chunk => chunk && chunk.imageData)
            .map(chunk => chunk.id)
        );
        
        set({
          visibleChunks: chunks,
          loadedChunks: loadedChunkIds
        });
        
        // Запускаем рендеринг
        if (state.offscreenRenderer && chunks.length > 0) {
          state.offscreenRenderer.queueRender(viewportBounds, chunks);
        }
        
        // Предзагружаем окружающие чанки
        if (state.chunkSystem) {
          state.chunkSystem.preloadSurroundingChunks(viewportBounds);
        }
        
        // Обновляем статистику производительности
        state.updatePerformance({
          chunksLoaded: loadedChunkIds.size,
          chunksVisible: chunks.length
        });
      } catch (error) {
        console.warn('Ошибка при обновлении чанков:', error);
      }
    }
  }))
);

// Подписка на изменения viewport для автоматического обновления чанков
useMapStore.subscribe(
  (state) => state.viewport,
  () => {
    const store = useMapStore.getState();
    if (store.isInitialized) {
      // Небольшая задержка для debouncing частых обновлений
      setTimeout(() => store.updateVisibleChunks(), 16);
    }
  },
  {
    equalityFn: (a, b) => 
      a.x === b.x && 
      a.y === b.y && 
      a.zoom === b.zoom && 
      a.width === b.width && 
      a.height === b.height
  }
);

// Подписка на изменения настроек
useMapStore.subscribe(
  (state) => state.settings,
  (settings) => {
    const store = useMapStore.getState();
    if (store.isInitialized) {
      console.log('Map settings updated:', settings);
      store.updateVisibleChunks();
    }
  }
);