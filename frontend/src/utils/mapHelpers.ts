import { WorldCountry, TerritoryPixel, MAP_CONFIG } from './worldData';

// Типы для работы с картой
export interface MapTransform {
  x: number;
  y: number;
  scale: number;
}

export interface TapResult {
  success: boolean;
  country?: WorldCountry;
  pixel?: TerritoryPixel;
  error?: string;
}

// Утилиты для трансформации координат
export class MapTransformHelper {
  static screenToWorld(
    screenX: number,
    screenY: number,
    canvas: HTMLCanvasElement,
    transform: MapTransform
  ): { x: number; y: number } {
    const rect = canvas.getBoundingClientRect();
    const canvasX = screenX - rect.left;
    const canvasY = screenY - rect.top;
    
    const worldX = (canvasX - canvas.width / 2) / transform.scale + transform.x;
    const worldY = (canvasY - canvas.height / 2) / transform.scale + transform.y;
    
    return { x: worldX, y: worldY };
  }
  
  static worldToScreen(
    worldX: number,
    worldY: number,
    canvas: HTMLCanvasElement,
    transform: MapTransform
  ): { x: number; y: number } {
    const screenX = (worldX - transform.x) * transform.scale + canvas.width / 2;
    const screenY = (worldY - transform.y) * transform.scale + canvas.height / 2;
    
    return { x: screenX, y: screenY };
  }
  
  static constrainTransform(transform: MapTransform): MapTransform {
    const scale = Math.max(MAP_CONFIG.MIN_ZOOM, Math.min(MAP_CONFIG.MAX_ZOOM, transform.scale));
    
    // Ограничиваем панорамирование границами карты
    const maxX = MAP_CONFIG.WORLD_WIDTH / 2;
    const maxY = MAP_CONFIG.WORLD_HEIGHT / 2;
    const x = Math.max(-maxX, Math.min(maxX, transform.x));
    const y = Math.max(-maxY, Math.min(maxY, transform.y));
    
    return { x, y, scale };
  }
}

// Класс для работы с Fog of War
export class FogOfWarManager {
  private exploredAreas: Map<string, number> = new Map(); // key: "x_y", value: progress (0-1)
  
  setProgress(x: number, y: number, progress: number): void {
    const key = `${Math.floor(x)}_${Math.floor(y)}`;
    this.exploredAreas.set(key, Math.max(0, Math.min(1, progress)));
  }
  
  getProgress(x: number, y: number): number {
    const key = `${Math.floor(x)}_${Math.floor(y)}`;
    return this.exploredAreas.get(key) || 0;
  }
  
  isExplored(x: number, y: number, threshold = 0.1): boolean {
    return this.getProgress(x, y) >= threshold;
  }
  
  isFullyExplored(x: number, y: number): boolean {
    return this.getProgress(x, y) >= 1;
  }
  
  addExploration(x: number, y: number, amount = 0.1): void {
    const current = this.getProgress(x, y);
    this.setProgress(x, y, current + amount);
  }
  
  getExploredAreas(): Map<string, number> {
    return new Map(this.exploredAreas);
  }
  
  clear(): void {
    this.exploredAreas.clear();
  }
  
  // Получить области для рендеринга с интерполяцией
  getInterpolatedProgress(x: number, y: number, radius = 2): number {
    let totalProgress = 0;
    let count = 0;
    
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance <= radius) {
          const weight = 1 - (distance / radius);
          totalProgress += this.getProgress(x + dx, y + dy) * weight;
          count += weight;
        }
      }
    }
    
    return count > 0 ? totalProgress / count : 0;
  }
}

// Класс для анимации прогресса закрашивания
export class ProgressAnimator {
  private animatedProgress: Map<string, number> = new Map();
  private targetProgress: Map<string, number> = new Map();
  
  setTarget(key: string, progress: number): void {
    this.targetProgress.set(key, Math.max(0, Math.min(1, progress)));
    if (!this.animatedProgress.has(key)) {
      this.animatedProgress.set(key, 0);
    }
  }
  
  getCurrent(key: string): number {
    return this.animatedProgress.get(key) || 0;
  }
  
  getTarget(key: string): number {
    return this.targetProgress.get(key) || 0;
  }
  
  update(deltaTime: number): boolean {
    let hasChanges = false;
    
    for (const [key, target] of this.targetProgress.entries()) {
      const current = this.animatedProgress.get(key) || 0;
      
      if (Math.abs(current - target) > 0.001) {
        const speed = MAP_CONFIG.PROGRESS_ANIMATION_SPEED * deltaTime;
        const newProgress = current + (target - current) * speed;
        this.animatedProgress.set(key, newProgress);
        hasChanges = true;
      } else {
        this.animatedProgress.set(key, target);
      }
    }
    
    return hasChanges;
  }
  
  getAllAnimated(): Map<string, number> {
    return new Map(this.animatedProgress);
  }
}

// Утилиты для рендеринга
export class RenderHelper {
  static drawCountryOutline(
    ctx: CanvasRenderingContext2D,
    country: WorldCountry,
    strokeColor = '#666',
    lineWidth = 1
  ): void {
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = lineWidth;
    
    // Используем Path2D для лучшей производительности
    const path = new Path2D(country.path);
    ctx.stroke(path);
  }
  
  static fillCountryWithProgress(
    ctx: CanvasRenderingContext2D,
    country: WorldCountry,
    progress: number,
    fogColor = '#E5E5E5'
  ): void {
    // Заполняем базовым цветом страны с учетом прогресса
    ctx.fillStyle = this.interpolateColor(fogColor, country.color, progress);
    const path = new Path2D(country.path);
    ctx.fill(path);
  }
  
  static drawFogOfWar(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    fogManager: FogOfWarManager
  ): void {
    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;
    
    for (let py = 0; py < height; py++) {
      for (let px = 0; px < width; px++) {
        const worldX = x + px;
        const worldY = y + py;
        const progress = fogManager.getInterpolatedProgress(worldX, worldY);
        
        const index = (py * width + px) * 4;
        const alpha = (1 - progress) * MAP_CONFIG.FOG_ALPHA * 255;
        
        data[index] = 229;     // R - серый цвет тумана
        data[index + 1] = 229; // G
        data[index + 2] = 229; // B
        data[index + 3] = alpha; // A
      }
    }
    
    ctx.putImageData(imageData, x, y);
  }
  
  static interpolateColor(color1: string, color2: string, factor: number): string {
    const c1 = this.hexToRgb(color1);
    const c2 = this.hexToRgb(color2);
    
    if (!c1 || !c2) return color1;
    
    const r = Math.round(c1.r + (c2.r - c1.r) * factor);
    const g = Math.round(c1.g + (c2.g - c1.g) * factor);
    const b = Math.round(c1.b + (c2.b - c1.b) * factor);
    
    return `rgb(${r}, ${g}, ${b})`;
  }
  
  private static hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }
  
  // Рендеринг ripple эффекта
  static drawRippleEffect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    radius: number,
    opacity: number,
    color = '#00ff00'
  ): void {
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.setLineDash([5, 5]);
    
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.stroke();
    
    ctx.restore();
  }
  
  // Оптимизированная отрисовка больших областей
  static drawTiledRegion(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    tileSize: number,
    drawTile: (tileX: number, tileY: number, tileCtx: CanvasRenderingContext2D) => void
  ): void {
    const tilesX = Math.ceil(width / tileSize);
    const tilesY = Math.ceil(height / tileSize);
    
    for (let ty = 0; ty < tilesY; ty++) {
      for (let tx = 0; tx < tilesX; tx++) {
        const tileX = x + tx * tileSize;
        const tileY = y + ty * tileSize;
        const tileW = Math.min(tileSize, width - tx * tileSize);
        const tileH = Math.min(tileSize, height - ty * tileSize);
        
        ctx.save();
        ctx.beginPath();
        ctx.rect(tileX, tileY, tileW, tileH);
        ctx.clip();
        
        drawTile(tileX, tileY, ctx);
        
        ctx.restore();
      }
    }
  }
}

// Утилиты для производительности
export class PerformanceHelper {
  private static frameTime = 0;
  private static lastFrameTime = 0;
  
  static updateFrameTime(): number {
    const now = performance.now();
    this.frameTime = now - this.lastFrameTime;
    this.lastFrameTime = now;
    return this.frameTime;
  }
  
  static getFrameTime(): number {
    return this.frameTime;
  }
  
  static getFPS(): number {
    return this.frameTime > 0 ? 1000 / this.frameTime : 0;
  }
  
  // Throttling для обработчиков событий
  static throttle<T extends (...args: unknown[]) => unknown>(
    func: T,
    delay: number
  ): (...args: Parameters<T>) => void {
    let lastCall = 0;
    return (...args: Parameters<T>) => {
      const now = Date.now();
      if (now - lastCall >= delay) {
        lastCall = now;
        func(...args);
      }
    };
  }
  
  // Debouncing для ресурсоемких операций
  static debounce<T extends (...args: unknown[]) => unknown>(
    func: T,
    delay: number
  ): (...args: Parameters<T>) => void {
    let timeoutId: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    };
  }
}