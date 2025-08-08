// Контроллер для управления пиксельной картой
export class PixelMapController {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private tileCache: Map<string, ImageData>;
  private pendingTiles: Set<string>;
  private worldData: Uint8ClampedArray;
  private dirtyRegions: Set<string>;
  private ws: WebSocket | null = null;
  
  // Константы
  private readonly MAP_SIZE = 16384;
  private readonly TILE_SIZE = 256;
  private readonly CACHE_LIMIT = 100;
  
  constructor(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.tileCache = new Map();
    this.pendingTiles = new Set();
    this.dirtyRegions = new Set();
    
    // Инициализируем пустую карту
    this.worldData = new Uint8ClampedArray(this.MAP_SIZE * this.MAP_SIZE * 4);
    this.initializeWorld();
  }
  
  private initializeWorld() {
    // Заполняем мир серым цветом (Fog of War)
    for (let i = 0; i < this.worldData.length; i += 4) {
      this.worldData[i] = 40;     // R
      this.worldData[i + 1] = 40;  // G
      this.worldData[i + 2] = 50;  // B
      this.worldData[i + 3] = 255; // A
    }
  }
  
  initialize() {
    // Подключаемся к WebSocket для real-time обновлений
    this.connectWebSocket();
    
    // Загружаем начальные тайлы
    this.loadInitialTiles();
  }
  
  private connectWebSocket() {
    try {
      this.ws = new WebSocket(import.meta.env.VITE_WS_URL || 'ws://localhost:3001');
      
      this.ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'pixel_update') {
          this.updatePixel(data.x, data.y, data.color);
        } else if (data.type === 'tile_update') {
          this.invalidateTile(data.tileX, data.tileY);
        }
      };
      
      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
    }
  }
  
  private loadInitialTiles() {
    // Загружаем центральные тайлы
    const centerTileX = Math.floor(this.MAP_SIZE / 2 / this.TILE_SIZE);
    const centerTileY = Math.floor(this.MAP_SIZE / 2 / this.TILE_SIZE);
    
    for (let dx = -2; dx <= 2; dx++) {
      for (let dy = -2; dy <= 2; dy++) {
        this.loadTile(centerTileX + dx, centerTileY + dy);
      }
    }
  }
  
  private async loadTile(tileX: number, tileY: number) {
    const key = `${tileX},${tileY}`;
    
    if (this.tileCache.has(key) || this.pendingTiles.has(key)) {
      return;
    }
    
    this.pendingTiles.add(key);
    
    try {
      // Симуляция загрузки тайла с сервера
      const tileData = await this.fetchTileData(tileX, tileY);
      
      // Создаем ImageData для тайла
      const imageData = new ImageData(this.TILE_SIZE, this.TILE_SIZE);
      
      // Генерируем процедурную текстуру для демо
      this.generateTileTexture(imageData, tileX, tileY);
      
      // Кешируем тайл
      this.tileCache.set(key, imageData);
      
      // Управление размером кеша
      if (this.tileCache.size > this.CACHE_LIMIT) {
        const firstKey = this.tileCache.keys().next().value;
        if (firstKey) {
          this.tileCache.delete(firstKey);
        }
      }
    } catch (error) {
      console.error(`Failed to load tile ${key}:`, error);
    } finally {
      this.pendingTiles.delete(key);
    }
  }
  
  private async fetchTileData(tileX: number, tileY: number): Promise<ArrayBuffer> {
    // Заглушка для загрузки с сервера
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(new ArrayBuffer(this.TILE_SIZE * this.TILE_SIZE * 4));
      }, 50);
    });
  }
  
  private generateTileTexture(imageData: ImageData, tileX: number, tileY: number) {
    const data = imageData.data;
    const seed = tileX * 1000 + tileY;
    
    // Генерируем процедурную карту мира
    for (let y = 0; y < this.TILE_SIZE; y++) {
      for (let x = 0; x < this.TILE_SIZE; x++) {
        const idx = (y * this.TILE_SIZE + x) * 4;
        const worldX = tileX * this.TILE_SIZE + x;
        const worldY = tileY * this.TILE_SIZE + y;
        
        // Простая процедурная генерация континентов
        const noise = this.perlinNoise(worldX * 0.01, worldY * 0.01, seed);
        
        if (noise > 0.3) {
          // Суша - зеленоватый
          data[idx] = 34 + Math.random() * 20;
          data[idx + 1] = 139 + Math.random() * 20;
          data[idx + 2] = 34 + Math.random() * 20;
        } else if (noise > 0.1) {
          // Побережье - песочный
          data[idx] = 194 + Math.random() * 20;
          data[idx + 1] = 178 + Math.random() * 20;
          data[idx + 2] = 128 + Math.random() * 20;
        } else {
          // Океан - синий
          data[idx] = 0 + Math.random() * 30;
          data[idx + 1] = 119 + Math.random() * 20;
          data[idx + 2] = 190 + Math.random() * 20;
        }
        data[idx + 3] = 255;
      }
    }
  }
  
  private perlinNoise(x: number, y: number, seed: number): number {
    // Упрощенный Perlin noise для генерации карты
    const n = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453;
    return (n - Math.floor(n));
  }
  
  render(viewport: any, loadedTiles: Set<string>) {
    const { x, y, zoom, width, height } = viewport;
    
    // Очищаем canvas
    this.ctx.fillStyle = '#0a0e27';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Вычисляем видимые тайлы
    const startTileX = Math.floor(x / this.TILE_SIZE);
    const startTileY = Math.floor(y / this.TILE_SIZE);
    const endTileX = Math.ceil((x + width / zoom) / this.TILE_SIZE);
    const endTileY = Math.ceil((y + height / zoom) / this.TILE_SIZE);
    
    // Рендерим видимые тайлы
    for (let tileY = startTileY; tileY <= endTileY; tileY++) {
      for (let tileX = startTileX; tileX <= endTileX; tileX++) {
        if (tileX < 0 || tileY < 0 || 
            tileX >= this.MAP_SIZE / this.TILE_SIZE || 
            tileY >= this.MAP_SIZE / this.TILE_SIZE) {
          continue;
        }
        
        const key = `${tileX},${tileY}`;
        
        // Загружаем тайл если его нет
        if (!this.tileCache.has(key)) {
          this.loadTile(tileX, tileY);
          
          // Рисуем placeholder
          this.ctx.fillStyle = '#1a1a2e';
          this.ctx.fillRect(
            (tileX * this.TILE_SIZE - x) * zoom,
            (tileY * this.TILE_SIZE - y) * zoom,
            this.TILE_SIZE * zoom,
            this.TILE_SIZE * zoom
          );
          continue;
        }
        
        // Рендерим тайл из кеша
        const tileData = this.tileCache.get(key);
        if (tileData) {
          const destX = (tileX * this.TILE_SIZE - x) * zoom;
          const destY = (tileY * this.TILE_SIZE - y) * zoom;
          
          // Создаем временный canvas для тайла
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = this.TILE_SIZE;
          tempCanvas.height = this.TILE_SIZE;
          const tempCtx = tempCanvas.getContext('2d');
          
          if (tempCtx) {
            tempCtx.putImageData(tileData, 0, 0);
            
            // Рисуем с учетом масштаба
            this.ctx.imageSmoothingEnabled = zoom < 2;
            this.ctx.drawImage(
              tempCanvas,
              0, 0, this.TILE_SIZE, this.TILE_SIZE,
              destX, destY, this.TILE_SIZE * zoom, this.TILE_SIZE * zoom
            );
          }
          
          loadedTiles.add(key);
        }
      }
    }
    
    // Рисуем сетку при большом зуме
    if (zoom > 4) {
      this.drawGrid(viewport);
    }
  }
  
  private drawGrid(viewport: any) {
    const { x, y, zoom, width, height } = viewport;
    
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    this.ctx.lineWidth = 1;
    
    // Вертикальные линии
    const startX = Math.floor(x);
    const endX = Math.ceil(x + width / zoom);
    
    for (let wx = startX; wx <= endX; wx++) {
      const screenX = (wx - x) * zoom;
      this.ctx.beginPath();
      this.ctx.moveTo(screenX, 0);
      this.ctx.lineTo(screenX, height);
      this.ctx.stroke();
    }
    
    // Горизонтальные линии
    const startY = Math.floor(y);
    const endY = Math.ceil(y + height / zoom);
    
    for (let wy = startY; wy <= endY; wy++) {
      const screenY = (wy - y) * zoom;
      this.ctx.beginPath();
      this.ctx.moveTo(0, screenY);
      this.ctx.lineTo(width, screenY);
      this.ctx.stroke();
    }
  }
  
  placePixel(x: number, y: number, color: string) {
    // Обновляем локальные данные
    this.updatePixel(x, y, color);
    
    // Отправляем на сервер
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'place_pixel',
        x,
        y,
        color
      }));
    }
    
    // Помечаем тайл как требующий обновления
    const tileX = Math.floor(x / this.TILE_SIZE);
    const tileY = Math.floor(y / this.TILE_SIZE);
    this.invalidateTile(tileX, tileY);
  }
  
  private updatePixel(x: number, y: number, color: string) {
    if (x < 0 || y < 0 || x >= this.MAP_SIZE || y >= this.MAP_SIZE) {
      return;
    }
    
    // Парсим цвет
    const rgb = this.hexToRgb(color);
    if (!rgb) return;
    
    // Обновляем пиксель в мировых данных
    const idx = (y * this.MAP_SIZE + x) * 4;
    this.worldData[idx] = rgb.r;
    this.worldData[idx + 1] = rgb.g;
    this.worldData[idx + 2] = rgb.b;
    this.worldData[idx + 3] = 255;
    
    // Обновляем соответствующий тайл в кеше
    const tileX = Math.floor(x / this.TILE_SIZE);
    const tileY = Math.floor(y / this.TILE_SIZE);
    const key = `${tileX},${tileY}`;
    
    if (this.tileCache.has(key)) {
      const tile = this.tileCache.get(key)!;
      const localX = x % this.TILE_SIZE;
      const localY = y % this.TILE_SIZE;
      const tileIdx = (localY * this.TILE_SIZE + localX) * 4;
      
      tile.data[tileIdx] = rgb.r;
      tile.data[tileIdx + 1] = rgb.g;
      tile.data[tileIdx + 2] = rgb.b;
      tile.data[tileIdx + 3] = 255;
    }
  }
  
  private invalidateTile(tileX: number, tileY: number) {
    const key = `${tileX},${tileY}`;
    this.dirtyRegions.add(key);
    
    // Перезагружаем тайл
    this.tileCache.delete(key);
    this.loadTile(tileX, tileY);
  }
  
  private hexToRgb(hex: string): { r: number, g: number, b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }
  
  cleanup() {
    if (this.ws) {
      this.ws.close();
    }
    this.tileCache.clear();
    this.pendingTiles.clear();
    this.dirtyRegions.clear();
  }
}