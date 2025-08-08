/**
 * Offscreen рендерер для плавной отрисовки карты без блокировки UI
 * Использует OffscreenCanvas для рендеринга в Web Worker или основном потоке
 */

import type { ChunkData, ViewportBounds } from './ChunkSystem';

export interface RenderTask {
  id: string;
  viewport: ViewportBounds;
  chunks: ChunkData[];
  timestamp: number;
  priority: number;
}

export interface RenderResult {
  taskId: string;
  imageData: ImageData;
  viewport: ViewportBounds;
  timestamp: number;
}

export class OffscreenRenderer {
  private offscreenCanvas!: OffscreenCanvas | HTMLCanvasElement;
  private ctx!: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D;
  private renderQueue: RenderTask[] = [];
  private isRendering = false;
  private currentTask: RenderTask | null = null;
  
  // Буферы для плавности
  private frontBuffer: ImageData | null = null;
  private backBuffer: ImageData | null = null;
  private bufferWidth = 0;
  private bufferHeight = 0;
  
  // Настройки рендеринга
  private readonly RENDER_THROTTLE_MS = 16; // 60 FPS
  private readonly MAX_RENDER_TIME_MS = 8; // Максимальное время рендеринга за кадр
  private readonly GRID_OPACITY = 0.1;
  private readonly CHUNK_BORDER_COLOR = 'rgba(255, 255, 255, 0.05)';
  
  private lastRenderTime = 0;
  private renderStats = {
    averageRenderTime: 0,
    framesRendered: 0,
    droppedFrames: 0
  };

  constructor(width: number, height: number) {
    this.initializeCanvas(width, height);
  }

  private initializeCanvas(width: number, height: number): void {
    try {
      // Пытаемся создать OffscreenCanvas для лучшей производительности
      if (typeof OffscreenCanvas !== 'undefined') {
        this.offscreenCanvas = new OffscreenCanvas(width, height);
        this.ctx = this.offscreenCanvas.getContext('2d', {
          alpha: false,
          desynchronized: true
        })!;
      } else {
        // Fallback на обычный canvas
        this.offscreenCanvas = document.createElement('canvas');
        this.offscreenCanvas.width = width;
        this.offscreenCanvas.height = height;
        this.ctx = this.offscreenCanvas.getContext('2d', {
          alpha: false,
          desynchronized: true
        })!;
      }
    } catch (error) {
      console.warn('OffscreenCanvas не поддерживается, используем fallback:', error);
      this.offscreenCanvas = document.createElement('canvas');
      this.offscreenCanvas.width = width;
      this.offscreenCanvas.height = height;
      this.ctx = this.offscreenCanvas.getContext('2d')!;
    }

    this.initializeBuffers(width, height);
  }

  private initializeBuffers(width: number, height: number): void {
    try {
      // Ограничиваем размеры разумными пределами
      const maxSize = 2048; // Уменьшаем для стабильности
      const minSize = 100;
      
      const safeWidth = Math.min(Math.max(minSize, Math.floor(width)), maxSize);
      const safeHeight = Math.min(Math.max(minSize, Math.floor(height)), maxSize);
      
      // Проверяем, что размеры корректны
      if (!isFinite(safeWidth) || !isFinite(safeHeight)) {
        console.warn('Некорректные размеры буфера, используем значения по умолчанию');
        this.bufferWidth = 800;
        this.bufferHeight = 600;
        this.frontBuffer = new ImageData(800, 600);
        this.backBuffer = new ImageData(800, 600);
        return;
      }
      
      // Проверяем, действительно ли нужно пересоздавать буферы
      if (this.bufferWidth === safeWidth && this.bufferHeight === safeHeight) {
        return;
      }
      
      this.bufferWidth = safeWidth;
      this.bufferHeight = safeHeight;
      this.frontBuffer = new ImageData(this.bufferWidth, this.bufferHeight);
      this.backBuffer = new ImageData(this.bufferWidth, this.bufferHeight);
    } catch (error) {
      console.error('Ошибка при создании буферов:', error);
      this.bufferWidth = 800;
      this.bufferHeight = 600;
      this.frontBuffer = new ImageData(800, 600);
      this.backBuffer = new ImageData(800, 600);
    }
  }

  /**
   * Добавляет задачу рендеринга в очередь
   */
  queueRender(viewport: ViewportBounds, chunks: ChunkData[]): string {
    const taskId = `render_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const priority = this.calculatePriority(viewport);
    
    const task: RenderTask = {
      id: taskId,
      viewport: { ...viewport },
      chunks: [...chunks],
      timestamp: performance.now(),
      priority
    };

    // Удаляем старые задачи для той же области
    this.renderQueue = this.renderQueue.filter(t => 
      !this.isViewportSimilar(t.viewport, viewport)
    );
    
    this.renderQueue.push(task);
    this.renderQueue.sort((a, b) => b.priority - a.priority);
    
    this.scheduleRender();
    return taskId;
  }

  /**
   * Изменяет размер рендерера
   */
  resize(width: number, height: number): void {
    try {
      // Ограничиваем размеры
      const maxSize = 2048;
      const minSize = 100;
      
      const safeWidth = Math.min(Math.max(minSize, Math.floor(width)), maxSize);
      const safeHeight = Math.min(Math.max(minSize, Math.floor(height)), maxSize);
      
      // Проверяем, действительно ли нужен resize
      if (this.bufferWidth === safeWidth && this.bufferHeight === safeHeight) {
        return;
      }
      
      // Проверяем корректность размеров
      if (!isFinite(safeWidth) || !isFinite(safeHeight)) {
        return;
      }
      
      this.offscreenCanvas.width = safeWidth;
      this.offscreenCanvas.height = safeHeight;
      this.initializeBuffers(safeWidth, safeHeight);
      
      // Отменяем текущие задачи, так как размер изменился
      this.renderQueue = [];
      this.currentTask = null;
    } catch (error) {
      console.error('Ошибка при изменении размера:', error);
    }
  }

  /**
   * Получает текущий результат рендеринга
   */
  getCurrentFrame(): ImageData | null {
    return this.frontBuffer;
  }

  /**
   * Получает статистику рендеринга
   */
  getRenderStats() {
    return { ...this.renderStats };
  }

  /**
   * Рендерит содержимое на целевой canvas
   */
  renderToCanvas(targetCanvas: HTMLCanvasElement): void {
    try {
      if (!this.frontBuffer || !targetCanvas) return;
      
      const targetCtx = targetCanvas.getContext('2d');
      if (!targetCtx) return;
      
      // Проверяем размеры
      if (targetCanvas.width === 0 || targetCanvas.height === 0) return;
      if (this.bufferWidth === 0 || this.bufferHeight === 0) return;
      
      // Создаем временный canvas для ImageData
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = this.bufferWidth;
      tempCanvas.height = this.bufferHeight;
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) return;
      
      tempCtx.putImageData(this.frontBuffer, 0, 0);
      
      // Отрисовываем с масштабированием на целевой canvas
      targetCtx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
      targetCtx.drawImage(
        tempCanvas,
        0, 0, this.bufferWidth, this.bufferHeight,
        0, 0, targetCanvas.width, targetCanvas.height
      );
    } catch (error) {
      console.warn('Ошибка при рендере на canvas:', error);
    }
  }

  /**
   * Освобождает ресурсы
   */
  cleanup(): void {
    this.renderQueue = [];
    this.currentTask = null;
    this.isRendering = false;
    this.frontBuffer = null;
    this.backBuffer = null;
  }

  // Приватные методы рендеринга

  private scheduleRender(): void {
    if (this.isRendering) return;
    
    const now = performance.now();
    const timeSinceLastRender = now - this.lastRenderTime;
    
    if (timeSinceLastRender >= this.RENDER_THROTTLE_MS) {
      this.performRender();
    } else {
      setTimeout(() => this.performRender(), this.RENDER_THROTTLE_MS - timeSinceLastRender);
    }
  }

  private performRender(): void {
    if (this.isRendering || this.renderQueue.length === 0) return;
    
    this.isRendering = true;
    this.currentTask = this.renderQueue.shift()!;
    const renderStartTime = performance.now();
    
    try {
      this.renderTask(this.currentTask);
      
      // Обновляем статистику
      const renderTime = performance.now() - renderStartTime;
      this.updateRenderStats(renderTime);
      
      // Меняем буферы местами
      this.swapBuffers();
      
    } catch (error) {
      console.error('Ошибка при рендеринге:', error);
      this.renderStats.droppedFrames++;
    } finally {
      this.isRendering = false;
      this.currentTask = null;
      this.lastRenderTime = performance.now();
      
      // Обрабатываем следующую задачу, если есть
      if (this.renderQueue.length > 0) {
        this.scheduleRender();
      }
    }
  }

  private renderTask(task: RenderTask): void {
    try {
      if (!this.backBuffer || !task) return;
      
      const { viewport, chunks } = task;
      if (!viewport || !chunks) return;
      
      const imageData = this.backBuffer;
      const data = imageData.data;
      
      if (!data || data.length === 0) return;
      
      // Очищаем буфер
      data.fill(0);
      
      // Заливаем фон космическим цветом
      this.fillBackground(data, '#0a0e27');
      
      // Рендерим чанки
      if (chunks.length > 0) {
        this.renderChunks(data, chunks, viewport);
      }
      
      // Добавляем сетку при большом зуме
      if (viewport.zoom > 4) {
        this.renderGrid(data, viewport);
      }
      
      // Добавляем границы чанков в debug режиме
      if (process.env.NODE_ENV === 'development' && chunks.length > 0) {
        this.renderChunkBorders(data, chunks, viewport);
      }
    } catch (error) {
      console.warn('Ошибка в renderTask:', error);
    }
  }

  private fillBackground(data: Uint8ClampedArray, color: string): void {
    const rgb = this.hexToRgb(color);
    if (!rgb) return;
    
    for (let i = 0; i < data.length; i += 4) {
      data[i] = rgb.r;
      data[i + 1] = rgb.g;
      data[i + 2] = rgb.b;
      data[i + 3] = 255;
    }
  }

  private renderChunks(data: Uint8ClampedArray, chunks: ChunkData[], viewport: ViewportBounds): void {
    for (const chunk of chunks) {
      if (!chunk.imageData) continue;
      
      this.renderChunk(data, chunk, viewport);
    }
  }

  private renderChunk(data: Uint8ClampedArray, chunk: ChunkData, viewport: ViewportBounds): void {
    if (!chunk.imageData) return;
    
    const chunkSize = 256; // Размер чанка
    const scaleFactor = Math.pow(2, chunk.zoom);
    const effectiveSize = chunkSize / scaleFactor;
    
    // Вычисляем позицию чанка в viewport
    const chunkWorldX = chunk.x * effectiveSize;
    const chunkWorldY = chunk.y * effectiveSize;
    
    // Проверяем пересечение с viewport
    if (chunkWorldX + effectiveSize < viewport.minX || chunkWorldX > viewport.maxX ||
        chunkWorldY + effectiveSize < viewport.minY || chunkWorldY > viewport.maxY) {
      return;
    }
    
    // Вычисляем координаты отрисовки
    const screenX = Math.floor((chunkWorldX - viewport.minX) * viewport.zoom);
    const screenY = Math.floor((chunkWorldY - viewport.minY) * viewport.zoom);
    const screenWidth = Math.ceil(effectiveSize * viewport.zoom);
    const screenHeight = Math.ceil(effectiveSize * viewport.zoom);
    
    // Копируем пиксели с масштабированием
    this.blitScaled(
      chunk.imageData.data, chunkSize, chunkSize,
      data, this.bufferWidth, this.bufferHeight,
      screenX, screenY, screenWidth, screenHeight
    );
  }

  private blitScaled(
    srcData: Uint8ClampedArray, srcWidth: number, srcHeight: number,
    dstData: Uint8ClampedArray, dstWidth: number, dstHeight: number,
    dstX: number, dstY: number, dstW: number, dstH: number
  ): void {
    // Оптимизированное масштабирование с ближайшим соседом
    const scaleX = srcWidth / dstW;
    const scaleY = srcHeight / dstH;
    
    for (let y = 0; y < dstH; y++) {
      if (dstY + y < 0 || dstY + y >= dstHeight) continue;
      
      const srcY = Math.floor(y * scaleY);
      if (srcY >= srcHeight) break;
      
      for (let x = 0; x < dstW; x++) {
        if (dstX + x < 0 || dstX + x >= dstWidth) continue;
        
        const srcX = Math.floor(x * scaleX);
        if (srcX >= srcWidth) break;
        
        const srcIdx = (srcY * srcWidth + srcX) * 4;
        const dstIdx = ((dstY + y) * dstWidth + (dstX + x)) * 4;
        
        dstData[dstIdx] = srcData[srcIdx];
        dstData[dstIdx + 1] = srcData[srcIdx + 1];
        dstData[dstIdx + 2] = srcData[srcIdx + 2];
        dstData[dstIdx + 3] = srcData[srcIdx + 3];
      }
    }
  }

  private renderGrid(data: Uint8ClampedArray, viewport: ViewportBounds): void {
    const gridColor = { r: 255, g: 255, b: 255, a: Math.floor(255 * this.GRID_OPACITY) };
    
    // Вертикальные линии
    const startX = Math.floor(viewport.minX);
    const endX = Math.floor(viewport.maxX);
    
    for (let worldX = startX; worldX <= endX; worldX++) {
      const screenX = Math.floor((worldX - viewport.minX) * viewport.zoom);
      if (screenX >= 0 && screenX < this.bufferWidth) {
        this.drawVerticalLine(data, screenX, gridColor);
      }
    }
    
    // Горизонтальные линии
    const startY = Math.floor(viewport.minY);
    const endY = Math.floor(viewport.maxY);
    
    for (let worldY = startY; worldY <= endY; worldY++) {
      const screenY = Math.floor((worldY - viewport.minY) * viewport.zoom);
      if (screenY >= 0 && screenY < this.bufferHeight) {
        this.drawHorizontalLine(data, screenY, gridColor);
      }
    }
  }

  private renderChunkBorders(data: Uint8ClampedArray, chunks: ChunkData[], viewport: ViewportBounds): void {
    const borderRgb = this.hexToRgb(this.CHUNK_BORDER_COLOR);
    if (!borderRgb) return;
    
    const borderColor = { r: borderRgb.r, g: borderRgb.g, b: borderRgb.b, a: 50 };
    
    for (const chunk of chunks) {
      const chunkSize = 256;
      const scaleFactor = Math.pow(2, chunk.zoom);
      const effectiveSize = chunkSize / scaleFactor;
      
      const chunkWorldX = chunk.x * effectiveSize;
      const chunkWorldY = chunk.y * effectiveSize;
      
      const screenX = Math.floor((chunkWorldX - viewport.minX) * viewport.zoom);
      const screenY = Math.floor((chunkWorldY - viewport.minY) * viewport.zoom);
      const screenW = Math.ceil(effectiveSize * viewport.zoom);
      const screenH = Math.ceil(effectiveSize * viewport.zoom);
      
      // Рисуем границы чанка
      this.drawRectBorder(data, screenX, screenY, screenW, screenH, borderColor);
    }
  }

  private drawVerticalLine(data: Uint8ClampedArray, x: number, color: any): void {
    for (let y = 0; y < this.bufferHeight; y++) {
      const idx = (y * this.bufferWidth + x) * 4;
      this.blendPixel(data, idx, color);
    }
  }

  private drawHorizontalLine(data: Uint8ClampedArray, y: number, color: any): void {
    for (let x = 0; x < this.bufferWidth; x++) {
      const idx = (y * this.bufferWidth + x) * 4;
      this.blendPixel(data, idx, color);
    }
  }

  private drawRectBorder(data: Uint8ClampedArray, x: number, y: number, w: number, h: number, color: any): void {
    // Верхняя и нижняя границы
    for (let i = 0; i < w; i++) {
      if (x + i >= 0 && x + i < this.bufferWidth) {
        if (y >= 0 && y < this.bufferHeight) {
          const idx = (y * this.bufferWidth + (x + i)) * 4;
          this.blendPixel(data, idx, color);
        }
        if (y + h - 1 >= 0 && y + h - 1 < this.bufferHeight) {
          const idx = ((y + h - 1) * this.bufferWidth + (x + i)) * 4;
          this.blendPixel(data, idx, color);
        }
      }
    }
    
    // Левая и правая границы
    for (let i = 0; i < h; i++) {
      if (y + i >= 0 && y + i < this.bufferHeight) {
        if (x >= 0 && x < this.bufferWidth) {
          const idx = ((y + i) * this.bufferWidth + x) * 4;
          this.blendPixel(data, idx, color);
        }
        if (x + w - 1 >= 0 && x + w - 1 < this.bufferWidth) {
          const idx = ((y + i) * this.bufferWidth + (x + w - 1)) * 4;
          this.blendPixel(data, idx, color);
        }
      }
    }
  }

  private blendPixel(data: Uint8ClampedArray, idx: number, color: any): void {
    const alpha = color.a / 255;
    const invAlpha = 1 - alpha;
    
    data[idx] = data[idx] * invAlpha + color.r * alpha;
    data[idx + 1] = data[idx + 1] * invAlpha + color.g * alpha;
    data[idx + 2] = data[idx + 2] * invAlpha + color.b * alpha;
    // data[idx + 3] остается 255
  }

  private swapBuffers(): void {
    const temp = this.frontBuffer;
    this.frontBuffer = this.backBuffer;
    this.backBuffer = temp;
  }

  private calculatePriority(viewport: ViewportBounds): number {
    // Приоритет основан на зуме и времени
    return viewport.zoom * 10 + (performance.now() % 1000) / 1000;
  }

  private isViewportSimilar(a: ViewportBounds, b: ViewportBounds): boolean {
    const threshold = 10;
    return (
      Math.abs(a.minX - b.minX) < threshold &&
      Math.abs(a.minY - b.minY) < threshold &&
      Math.abs(a.zoom - b.zoom) < 0.1
    );
  }

  private updateRenderStats(renderTime: number): void {
    this.renderStats.framesRendered++;
    this.renderStats.averageRenderTime = 
      (this.renderStats.averageRenderTime * 0.9) + (renderTime * 0.1);
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    if (hex.startsWith('rgba')) {
      const match = hex.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      return match ? {
        r: parseInt(match[1]),
        g: parseInt(match[2]),
        b: parseInt(match[3])
      } : null;
    }
    
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }
}