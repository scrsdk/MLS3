/**
 * Система чанков для эффективного управления загрузкой и кешированием тайлов карты
 * Реализует иерархическую загрузку и кеширование по принципу PixMap.fun
 */

export interface ChunkData {
  id: string;
  x: number;
  y: number;
  zoom: number;
  imageData: ImageData | null;
  isLoading: boolean;
  lastAccessed: number;
  priority: number;
}

export interface ViewportBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  zoom: number;
}

export class ChunkSystem {
  private chunks: Map<string, ChunkData> = new Map();
  private loadingQueue: Set<string> = new Set();
  private pendingRequests: Map<string, AbortController> = new Map();
  
  // Конфигурация
  private readonly CHUNK_SIZE = 256;
  private readonly CACHE_SIZE_LIMIT = 200;
  private readonly PRELOAD_DISTANCE = 2;
  private readonly ZOOM_LEVELS = [0, 1, 2, 3, 4]; // Уровни детализации
  private readonly LOAD_DEBOUNCE_MS = 100;
  
  // Отложенная загрузка
  private loadTimeout: number | null = null;
  private lastViewport: ViewportBounds | null = null;

  constructor() {
    // Периодическая очистка кеша
    setInterval(() => this.cleanupCache(), 30000);
  }

  /**
   * Получает необходимые чанки для текущего viewport с приоритетом загрузки
   */
  getRequiredChunks(viewport: ViewportBounds): ChunkData[] {
    const requiredChunks: ChunkData[] = [];
    const currentTime = Date.now();
    
    // Определяем оптимальный уровень зума
    const zoomLevel = this.getOptimalZoomLevel(viewport.zoom);
    
    // Вычисляем границы чанков для текущего viewport
    const chunkBounds = this.getChunkBounds(viewport, zoomLevel);
    
    // Создаем список чанков с приоритетами
    const chunksToLoad: { chunk: ChunkData; priority: number }[] = [];
    
    for (let cy = chunkBounds.minY; cy <= chunkBounds.maxY; cy++) {
      for (let cx = chunkBounds.minX; cx <= chunkBounds.maxX; cx++) {
        const chunkId = this.getChunkId(cx, cy, zoomLevel);
        let chunk = this.chunks.get(chunkId);
        
        if (!chunk) {
          chunk = this.createChunk(cx, cy, zoomLevel);
          this.chunks.set(chunkId, chunk);
        }
        
        // Обновляем время последнего доступа
        chunk.lastAccessed = currentTime;
        
        // Вычисляем приоритет (чем ближе к центру viewport, тем выше)
        const centerX = (viewport.minX + viewport.maxX) / 2;
        const centerY = (viewport.minY + viewport.maxY) / 2;
        const distance = Math.sqrt(
          Math.pow(cx * this.CHUNK_SIZE - centerX, 2) + 
          Math.pow(cy * this.CHUNK_SIZE - centerY, 2)
        );
        const priority = Math.max(1, 100 - distance / 100);
        
        chunk.priority = priority;
        chunksToLoad.push({ chunk, priority });
        requiredChunks.push(chunk);
      }
    }
    
    // Сортируем по приоритету и запускаем загрузку
    chunksToLoad.sort((a, b) => b.priority - a.priority);
    this.scheduleChunkLoading(chunksToLoad.slice(0, 20)); // Ограничиваем одновременные загрузки
    
    return requiredChunks;
  }

  /**
   * Получает чанк по ID, если он закеширован
   */
  getChunk(chunkId: string): ChunkData | null {
    const chunk = this.chunks.get(chunkId);
    if (chunk) {
      chunk.lastAccessed = Date.now();
      return chunk;
    }
    return null;
  }

  /**
   * Предварительная загрузка чанков вокруг viewport
   */
  preloadSurroundingChunks(viewport: ViewportBounds): void {
    // Откладываем загрузку для предотвращения избыточных запросов
    if (this.loadTimeout) {
      clearTimeout(this.loadTimeout);
    }
    
    this.loadTimeout = window.setTimeout(() => {
      if (this.hasViewportChanged(viewport)) {
        this.lastViewport = viewport;
        this.performPreload(viewport);
      }
    }, this.LOAD_DEBOUNCE_MS);
  }

  /**
   * Инвалидирует чанк для его повторной загрузки
   */
  invalidateChunk(x: number, y: number, zoomLevel?: number): void {
    if (zoomLevel !== undefined) {
      const chunkId = this.getChunkId(
        Math.floor(x / this.CHUNK_SIZE), 
        Math.floor(y / this.CHUNK_SIZE), 
        zoomLevel
      );
      this.chunks.delete(chunkId);
    } else {
      // Инвалидируем для всех уровней зума
      this.ZOOM_LEVELS.forEach(level => {
        const chunkId = this.getChunkId(
          Math.floor(x / this.CHUNK_SIZE), 
          Math.floor(y / this.CHUNK_SIZE), 
          level
        );
        this.chunks.delete(chunkId);
      });
    }
  }

  /**
   * Обновляет пиксель в соответствующих чанках
   */
  updatePixel(x: number, y: number, color: string): void {
    const rgb = this.hexToRgb(color);
    if (!rgb) return;

    this.ZOOM_LEVELS.forEach(zoomLevel => {
      const chunkX = Math.floor(x / this.CHUNK_SIZE);
      const chunkY = Math.floor(y / this.CHUNK_SIZE);
      const chunkId = this.getChunkId(chunkX, chunkY, zoomLevel);
      
      const chunk = this.chunks.get(chunkId);
      if (chunk && chunk.imageData) {
        const localX = x % this.CHUNK_SIZE;
        const localY = y % this.CHUNK_SIZE;
        const pixelIndex = (localY * this.CHUNK_SIZE + localX) * 4;
        
        chunk.imageData.data[pixelIndex] = rgb.r;
        chunk.imageData.data[pixelIndex + 1] = rgb.g;
        chunk.imageData.data[pixelIndex + 2] = rgb.b;
        chunk.imageData.data[pixelIndex + 3] = 255;
      }
    });
  }

  /**
   * Освобождает ресурсы
   */
  cleanup(): void {
    try {
      this.pendingRequests.forEach(controller => {
        try {
          controller.abort();
        } catch (error) {
          console.warn('Ошибка при отмене запроса:', error);
        }
      });
      this.pendingRequests.clear();
      this.chunks.clear();
      this.loadingQueue.clear();
      
      if (this.loadTimeout) {
        clearTimeout(this.loadTimeout);
        this.loadTimeout = null;
      }
    } catch (error) {
      console.warn('Ошибка при очистке ChunkSystem:', error);
    }
  }

  // Приватные методы

  private createChunk(x: number, y: number, zoomLevel: number): ChunkData {
    return {
      id: this.getChunkId(x, y, zoomLevel),
      x,
      y,
      zoom: zoomLevel,
      imageData: null,
      isLoading: false,
      lastAccessed: Date.now(),
      priority: 0
    };
  }

  private getChunkId(x: number, y: number, zoom: number): string {
    return `${x}_${y}_${zoom}`;
  }

  private getOptimalZoomLevel(zoom: number): number {
    if (zoom >= 4) return 4;
    if (zoom >= 2) return 3;
    if (zoom >= 1) return 2;
    if (zoom >= 0.5) return 1;
    return 0;
  }

  private getChunkBounds(viewport: ViewportBounds, zoomLevel: number) {
    const scaleFactor = Math.pow(2, zoomLevel);
    const effectiveChunkSize = this.CHUNK_SIZE / scaleFactor;
    
    return {
      minX: Math.floor(viewport.minX / effectiveChunkSize) - this.PRELOAD_DISTANCE,
      maxX: Math.floor(viewport.maxX / effectiveChunkSize) + this.PRELOAD_DISTANCE,
      minY: Math.floor(viewport.minY / effectiveChunkSize) - this.PRELOAD_DISTANCE,
      maxY: Math.floor(viewport.maxY / effectiveChunkSize) + this.PRELOAD_DISTANCE
    };
  }

  private scheduleChunkLoading(chunksToLoad: { chunk: ChunkData; priority: number }[]): void {
    chunksToLoad.forEach(({ chunk }) => {
      if (!chunk.imageData && !chunk.isLoading && !this.loadingQueue.has(chunk.id)) {
        this.loadingQueue.add(chunk.id);
        this.loadChunk(chunk);
      }
    });
  }

  private async loadChunk(chunk: ChunkData): Promise<void> {
    if (chunk.isLoading || chunk.imageData) return;
    
    chunk.isLoading = true;
    const controller = new AbortController();
    this.pendingRequests.set(chunk.id, controller);

    try {
      // Загружаем данные чанка
      const chunkData = await this.fetchChunkData(chunk.x, chunk.y, chunk.zoom, controller.signal);
      
      if (!controller.signal.aborted && chunkData) {
        chunk.imageData = chunkData;
        chunk.isLoading = false;
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        // Игнорируем AbortError - это нормальное поведение
        if (error instanceof Error && error.name === 'AbortError') {
          return;
        }
        
        console.warn(`Failed to load chunk ${chunk.id}:`, error);
        // Создаем пустой чанк для предотвращения повторных попыток
        try {
          chunk.imageData = new ImageData(this.CHUNK_SIZE, this.CHUNK_SIZE);
          this.generateFallbackTexture(chunk);
        } catch (fallbackError) {
          console.warn('Ошибка при создании fallback текстуры:', fallbackError);
        }
        chunk.isLoading = false;
      }
    } finally {
      this.loadingQueue.delete(chunk.id);
      this.pendingRequests.delete(chunk.id);
    }
  }

  private async fetchChunkData(
    chunkX: number, 
    chunkY: number, 
    zoomLevel: number, 
    signal: AbortSignal
  ): Promise<ImageData> {
    // Симулируем загрузку с сервера
    await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));
    
    if (signal.aborted) {
      throw new Error('Request aborted');
    }

    // Создаем процедурные данные для демо
    const imageData = new ImageData(this.CHUNK_SIZE, this.CHUNK_SIZE);
    this.generateChunkTexture(imageData, chunkX, chunkY, zoomLevel);
    
    return imageData;
  }

  private generateChunkTexture(imageData: ImageData, chunkX: number, chunkY: number, zoomLevel: number): void {
    const data = imageData.data;
    const scale = Math.pow(2, zoomLevel);
    
    for (let y = 0; y < this.CHUNK_SIZE; y++) {
      for (let x = 0; x < this.CHUNK_SIZE; x++) {
        const idx = (y * this.CHUNK_SIZE + x) * 4;
        const worldX = (chunkX * this.CHUNK_SIZE + x) / scale;
        const worldY = (chunkY * this.CHUNK_SIZE + y) / scale;
        
        // Улучшенная процедурная генерация
        const noise1 = this.noise(worldX * 0.01, worldY * 0.01);
        const noise2 = this.noise(worldX * 0.05, worldY * 0.05) * 0.5;
        const noise3 = this.noise(worldX * 0.1, worldY * 0.1) * 0.25;
        const combined = noise1 + noise2 + noise3;
        
        if (combined > 0.4) {
          // Горы - коричневый/серый
          data[idx] = 101 + Math.random() * 20;
          data[idx + 1] = 67 + Math.random() * 15;
          data[idx + 2] = 33 + Math.random() * 10;
        } else if (combined > 0.25) {
          // Суша - зеленый
          data[idx] = 34 + Math.random() * 30;
          data[idx + 1] = 139 + Math.random() * 30;
          data[idx + 2] = 34 + Math.random() * 20;
        } else if (combined > 0.1) {
          // Побережье - песочный
          data[idx] = 194 + Math.random() * 30;
          data[idx + 1] = 178 + Math.random() * 25;
          data[idx + 2] = 128 + Math.random() * 20;
        } else {
          // Океан - синий с глубиной
          const depth = Math.max(0, 0.1 - combined);
          data[idx] = Math.max(0, 20 - depth * 100);
          data[idx + 1] = Math.max(50, 119 - depth * 50);
          data[idx + 2] = Math.max(100, 190 - depth * 30);
        }
        
        data[idx + 3] = 255;
      }
    }
  }

  private generateFallbackTexture(chunk: ChunkData): void {
    if (!chunk.imageData) return;
    
    const data = chunk.imageData.data;
    // Простая серая текстура для ошибки загрузки
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 64;     // R
      data[i + 1] = 64;  // G
      data[i + 2] = 64;  // B
      data[i + 3] = 255; // A
    }
  }

  private noise(x: number, y: number): number {
    // Улучшенный шум с более естественным видом
    const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
    return Math.abs(n - Math.floor(n)) * 2 - 1;
  }

  private hasViewportChanged(viewport: ViewportBounds): boolean {
    if (!this.lastViewport) return true;
    
    const threshold = 50; // Порог изменения для предотвращения частых обновлений
    return (
      Math.abs(this.lastViewport.minX - viewport.minX) > threshold ||
      Math.abs(this.lastViewport.minY - viewport.minY) > threshold ||
      Math.abs(this.lastViewport.zoom - viewport.zoom) > 0.1
    );
  }

  private performPreload(viewport: ViewportBounds): void {
    const zoomLevel = this.getOptimalZoomLevel(viewport.zoom);
    const expandedBounds = {
      ...viewport,
      minX: viewport.minX - this.CHUNK_SIZE * this.PRELOAD_DISTANCE,
      maxX: viewport.maxX + this.CHUNK_SIZE * this.PRELOAD_DISTANCE,
      minY: viewport.minY - this.CHUNK_SIZE * this.PRELOAD_DISTANCE,
      maxY: viewport.maxY + this.CHUNK_SIZE * this.PRELOAD_DISTANCE
    };
    
    this.getRequiredChunks(expandedBounds);
  }

  private cleanupCache(): void {
    if (this.chunks.size <= this.CACHE_SIZE_LIMIT) return;
    
    const now = Date.now();
    const chunksToDelete: string[] = [];
    
    // Сортируем чанки по времени последнего доступа
    const sortedChunks = Array.from(this.chunks.entries())
      .sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);
    
    // Удаляем старые чанки
    const deleteCount = this.chunks.size - this.CACHE_SIZE_LIMIT + 10;
    for (let i = 0; i < deleteCount && i < sortedChunks.length; i++) {
      const [chunkId, chunk] = sortedChunks[i];
      
      // Не удаляем чанки, которые загружаются или недавно использовались
      if (!chunk.isLoading && now - chunk.lastAccessed > 60000) {
        chunksToDelete.push(chunkId);
      }
    }
    
    chunksToDelete.forEach(id => this.chunks.delete(id));
    
    if (chunksToDelete.length > 0) {
      console.log(`Cleaned up ${chunksToDelete.length} chunks from cache`);
    }
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }
}