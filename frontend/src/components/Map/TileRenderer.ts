// Оптимизированный рендерер тайлов с LOD системой
export class TileRenderer {
  private tileCache: Map<string, HTMLCanvasElement>;
  private lodCache: Map<string, HTMLCanvasElement>;
  private workerPool: Worker[];
  private taskQueue: Array<any>;
  
  constructor() {
    this.tileCache = new Map();
    this.lodCache = new Map();
    this.workerPool = [];
    this.taskQueue = [];
    
    this.initializeWorkers();
  }
  
  private initializeWorkers() {
    // Создаем пул воркеров для параллельной обработки тайлов
    const workerCount = navigator.hardwareConcurrency || 4;
    
    for (let i = 0; i < Math.min(workerCount, 4); i++) {
      // Создаем inline worker для обработки тайлов
      const workerCode = `
        self.onmessage = function(e) {
          const { type, data } = e.data;
          
          if (type === 'generateTile') {
            const { tileX, tileY, size, zoom } = data;
            const imageData = new ImageData(size, size);
            
            // Генерация тайла
            for (let y = 0; y < size; y++) {
              for (let x = 0; x < size; x++) {
                const idx = (y * size + x) * 4;
                
                // Простая процедурная генерация
                const worldX = tileX * size + x;
                const worldY = tileY * size + y;
                
                const noise = Math.sin(worldX * 0.01) * Math.cos(worldY * 0.01);
                
                if (noise > 0.2) {
                  // Земля
                  imageData.data[idx] = 34;
                  imageData.data[idx + 1] = 139;
                  imageData.data[idx + 2] = 34;
                } else {
                  // Вода
                  imageData.data[idx] = 0;
                  imageData.data[idx + 1] = 119;
                  imageData.data[idx + 2] = 190;
                }
                imageData.data[idx + 3] = 255;
              }
            }
            
            self.postMessage({
              type: 'tileGenerated',
              tileX,
              tileY,
              imageData: imageData.data.buffer
            }, [imageData.data.buffer]);
          }
        };
      `;
      
      const blob = new Blob([workerCode], { type: 'application/javascript' });
      const worker = new Worker(URL.createObjectURL(blob));
      
      worker.onmessage = (e) => {
        this.handleWorkerMessage(e.data);
      };
      
      this.workerPool.push(worker);
    }
  }
  
  private handleWorkerMessage(data: any) {
    if (data.type === 'tileGenerated') {
      const { tileX, tileY, imageData } = data;
      const key = `${tileX},${tileY}`;
      
      // Создаем canvas для тайла
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        const imgData = new ImageData(new Uint8ClampedArray(imageData), 256, 256);
        ctx.putImageData(imgData, 0, 0);
        this.tileCache.set(key, canvas);
      }
    }
  }
  
  // Получение тайла с учетом LOD
  getTile(tileX: number, tileY: number, zoom: number): HTMLCanvasElement | null {
    const key = `${tileX},${tileY}`;
    
    // Определяем уровень детализации
    const lodLevel = this.calculateLOD(zoom);
    const lodKey = `${key}:${lodLevel}`;
    
    // Проверяем LOD кеш
    if (this.lodCache.has(lodKey)) {
      return this.lodCache.get(lodKey)!;
    }
    
    // Проверяем основной кеш
    if (this.tileCache.has(key)) {
      const originalTile = this.tileCache.get(key)!;
      
      if (lodLevel === 0) {
        return originalTile;
      }
      
      // Создаем LOD версию
      const lodTile = this.createLODTile(originalTile, lodLevel);
      this.lodCache.set(lodKey, lodTile);
      
      // Ограничиваем размер LOD кеша
      if (this.lodCache.size > 50) {
        const firstKey = this.lodCache.keys().next().value;
        if (firstKey) {
          this.lodCache.delete(firstKey);
        }
      }
      
      return lodTile;
    }
    
    // Запускаем генерацию тайла
    this.requestTileGeneration(tileX, tileY);
    return null;
  }
  
  private calculateLOD(zoom: number): number {
    if (zoom >= 4) return 0;    // Полная детализация
    if (zoom >= 2) return 1;    // Средняя детализация
    if (zoom >= 1) return 2;    // Низкая детализация
    if (zoom >= 0.5) return 3;  // Очень низкая
    return 4;                    // Минимальная
  }
  
  private createLODTile(originalTile: HTMLCanvasElement, lodLevel: number): HTMLCanvasElement {
    const scale = Math.pow(2, lodLevel);
    const size = Math.floor(256 / scale);
    
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      // Уменьшаем и увеличиваем обратно для pixelated эффекта
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(originalTile, 0, 0, 256, 256, 0, 0, size, size);
      
      // Создаем временный canvas для увеличения
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = size;
      tempCanvas.height = size;
      const tempCtx = tempCanvas.getContext('2d');
      
      if (tempCtx) {
        tempCtx.drawImage(canvas, 0, 0, size, size);
        
        ctx.clearRect(0, 0, 256, 256);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(tempCanvas, 0, 0, size, size, 0, 0, 256, 256);
      }
    }
    
    return canvas;
  }
  
  private requestTileGeneration(tileX: number, tileY: number) {
    // Находим свободный воркер
    const worker = this.workerPool[Math.floor(Math.random() * this.workerPool.length)];
    
    worker.postMessage({
      type: 'generateTile',
      data: {
        tileX,
        tileY,
        size: 256,
        zoom: 1
      }
    });
  }
  
  // Предзагрузка тайлов вокруг viewport
  preloadTiles(centerX: number, centerY: number, radius: number = 2) {
    const startX = centerX - radius;
    const endX = centerX + radius;
    const startY = centerY - radius;
    const endY = centerY + radius;
    
    for (let x = startX; x <= endX; x++) {
      for (let y = startY; y <= endY; y++) {
        const key = `${x},${y}`;
        if (!this.tileCache.has(key)) {
          this.requestTileGeneration(x, y);
        }
      }
    }
  }
  
  // Очистка кеша
  clearCache() {
    // Сохраняем последние использованные тайлы
    const recentTiles = new Map<string, HTMLCanvasElement>();
    let count = 0;
    
    for (const [key, tile] of this.tileCache) {
      if (count < 50) {
        recentTiles.set(key, tile);
        count++;
      } else {
        break;
      }
    }
    
    this.tileCache = recentTiles;
    this.lodCache.clear();
  }
  
  // Освобождение ресурсов
  cleanup() {
    this.workerPool.forEach(worker => worker.terminate());
    this.workerPool = [];
    this.tileCache.clear();
    this.lodCache.clear();
  }
}

// Экспортируем синглтон
export const tileRenderer = new TileRenderer();