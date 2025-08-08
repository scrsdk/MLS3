import { geoContains, geoPath } from 'd3-geo';
import type { Feature, Polygon } from 'geojson';
// Импорт будет добавлен после создания worldData
// import { worldCountryData } from './worldData';

/**
 * Определяет, находится ли точка внутри полигона (Point-in-Polygon алгоритм)
 * Оптимизированная версия Ray Casting Algorithm
 */
export function pointInPolygon(point: [number, number], polygon: number[][]): boolean {
  const x = point[0], y = point[1];
  let inside = false;
  
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];
    
    if (((yi > y) !== (yj > y)) &&
        (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  
  return inside;
}

/**
 * Вычисляет центроид полигона
 */
export function calculateCentroid(coordinates: number[][]): [number, number] {
  let x = 0, y = 0;
  const length = coordinates.length;
  
  for (const coord of coordinates) {
    x += coord[0];
    y += coord[1];
  }
  
  return [x / length, y / length];
}

/**
 * Вычисляет границы (bounding box) полигона
 */
export function calculateBounds(coordinates: number[][]): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
} {
  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;
  
  for (const coord of coordinates) {
    minX = Math.min(minX, coord[0]);
    maxX = Math.max(maxX, coord[0]);
    minY = Math.min(minY, coord[1]);
    maxY = Math.max(maxY, coord[1]);
  }
  
  return { minX, minY, maxX, maxY };
}

/**
 * Упрощает геометрию для улучшения производительности
 * Использует Douglas-Peucker алгоритм
 */
export function simplifyPolygon(coordinates: number[][], tolerance = 0.5): number[][] {
  if (coordinates.length < 3) return coordinates;
  
  const simplified = douglasPeucker(coordinates, tolerance);
  return simplified.length < 3 ? coordinates : simplified;
}

/**
 * Douglas-Peucker алгоритм упрощения полигона
 */
function douglasPeucker(points: number[][], tolerance: number): number[][] {
  if (points.length <= 2) return points;
  
  let maxDistance = 0;
  let maxIndex = 0;
  
  const start = points[0];
  const end = points[points.length - 1];
  
  for (let i = 1; i < points.length - 1; i++) {
    const distance = perpendicularDistance(points[i], start, end);
    if (distance > maxDistance) {
      maxDistance = distance;
      maxIndex = i;
    }
  }
  
  if (maxDistance > tolerance) {
    const left = douglasPeucker(points.slice(0, maxIndex + 1), tolerance);
    const right = douglasPeucker(points.slice(maxIndex), tolerance);
    return [...left.slice(0, -1), ...right];
  }
  
  return [start, end];
}

/**
 * Вычисляет перпендикулярное расстояние от точки до линии
 */
function perpendicularDistance(
  point: number[], 
  lineStart: number[], 
  lineEnd: number[]
): number {
  const [x, y] = point;
  const [x1, y1] = lineStart;
  const [x2, y2] = lineEnd;
  
  const A = x - x1;
  const B = y - y1;
  const C = x2 - x1;
  const D = y2 - y1;
  
  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  
  if (lenSq === 0) return Math.sqrt(A * A + B * B);
  
  const param = dot / lenSq;
  
  let xx, yy;
  if (param < 0) {
    xx = x1;
    yy = y1;
  } else if (param > 1) {
    xx = x2;
    yy = y2;
  } else {
    xx = x1 + param * C;
    yy = y1 + param * D;
  }
  
  const dx = x - xx;
  const dy = y - yy;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Spatial indexing для быстрого поиска стран
 * Использует простую grid-based систему
 */
class SpatialIndex {
  private grid: Map<string, string[]> = new Map();
  private cellSize: number;
  private bounds: { minX: number; minY: number; maxX: number; maxY: number };
  private countries: any[] = [];
  
  constructor(cellSize = 10) {
    this.cellSize = cellSize;
    this.bounds = { minX: -180, minY: -90, maxX: 180, maxY: 90 };
  }
  
  buildIndex(countries: Array<{ id: string; bounds: { minX: number; minY: number; maxX: number; maxY: number } }>) {
    this.countries = countries;
    this.grid.clear();
    
    countries.forEach(country => {
      const bounds = country.bounds;
      
      const minCellX = Math.floor(bounds.minX / this.cellSize);
      const maxCellX = Math.floor(bounds.maxX / this.cellSize);
      const minCellY = Math.floor(bounds.minY / this.cellSize);
      const maxCellY = Math.floor(bounds.maxY / this.cellSize);
      
      for (let x = minCellX; x <= maxCellX; x++) {
        for (let y = minCellY; y <= maxCellY; y++) {
          const key = `${x},${y}`;
          if (!this.grid.has(key)) {
            this.grid.set(key, []);
          }
          this.grid.get(key)!.push(country.id);
        }
      }
    });
  }
  
  /**
   * Находит потенциальные страны для точки
   */
  getCandidates(x: number, y: number): string[] {
    const cellX = Math.floor(x / this.cellSize);
    const cellY = Math.floor(y / this.cellSize);
    const key = `${cellX},${cellY}`;
    
    return this.grid.get(key) || [];
  }
}

export const spatialIndex = new SpatialIndex();

/**
 * Находит страну по координатам с использованием spatial indexing
 * Оптимизированная версия для высокой производительности
 */
export function getCountryByCoordinates(
  longitude: number, 
  latitude: number,
  countries: Array<{ id: string; bounds: { minX: number; minY: number; maxX: number; maxY: number }; coordinates: number[][] }>
): string | null {
  // Сначала используем spatial index для получения кандидатов
  const candidates = spatialIndex.getCandidates(longitude, latitude);
  
  // Проверяем каждого кандидата
  for (const countryId of candidates) {
    const country = countries.find(c => c.id === countryId);
    if (!country) continue;
    
    // Быстрая проверка по bounds
    if (longitude < country.bounds.minX || longitude > country.bounds.maxX ||
        latitude < country.bounds.minY || latitude > country.bounds.maxY) {
      continue;
    }
    
    // Точная проверка с помощью point-in-polygon
    if (pointInPolygon([longitude, latitude], country.coordinates)) {
      return countryId;
    }
  }
  
  return null;
}

/**
 * Преобразует географические координаты в координаты проекции
 */
export function geoToProjection(
  longitude: number, 
  latitude: number, 
  projection: any
): [number, number] {
  return projection([longitude, latitude]) || [0, 0];
}

/**
 * Преобразует координаты проекции в географические
 */
export function projectionToGeo(
  x: number, 
  y: number, 
  projection: any
): [number, number] {
  return projection.invert([x, y]) || [0, 0];
}

/**
 * Level of Detail - определяет уровень детализации для рендеринга
 */
export function getLODLevel(scale: number): number {
  if (scale < 1) return 0; // Очень низкая детализация
  if (scale < 2) return 1; // Низкая детализация
  if (scale < 4) return 2; // Средняя детализация
  if (scale < 8) return 3; // Высокая детализация
  return 4; // Максимальная детализация
}

/**
 * Определяет, видна ли страна в текущем viewport
 */
export function isCountryVisible(
  country: { bounds: { minX: number; minY: number; maxX: number; maxY: number } },
  viewport: { minX: number; minY: number; maxX: number; maxY: number }
): boolean {
  return !(
    country.bounds.maxX < viewport.minX ||
    country.bounds.minX > viewport.maxX ||
    country.bounds.maxY < viewport.minY ||
    country.bounds.minY > viewport.maxY
  );
}

/**
 * Кеш для обработанных путей по уровням детализации
 */
class PathCache {
  private cache = new Map<string, string>();
  
  get(countryId: string, lodLevel: number): string | undefined {
    return this.cache.get(`${countryId}-${lodLevel}`);
  }
  
  set(countryId: string, lodLevel: number, path: string): void {
    this.cache.set(`${countryId}-${lodLevel}`, path);
  }
  
  clear(): void {
    this.cache.clear();
  }
}

export const pathCache = new PathCache();

/**
 * Обработчик жестов для зума и панорамирования
 */
export class GestureHandler {
  private lastTouchDistance = 0;
  private initialPinchScale = 1;
  private isPinching = false;
  
  handleTouchStart(touches: Touch[]): void {
    if (touches.length === 2) {
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      this.lastTouchDistance = Math.sqrt(dx * dx + dy * dy);
      this.isPinching = true;
    }
  }
  
  handleTouchMove(
    touches: Touch[], 
    currentScale: number,
    onZoom: (scale: number, centerX: number, centerY: number) => void,
    onPan: (deltaX: number, deltaY: number) => void
  ): void {
    if (touches.length === 2 && this.isPinching) {
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (this.lastTouchDistance > 0) {
        const scale = distance / this.lastTouchDistance;
        const centerX = (touches[0].clientX + touches[1].clientX) / 2;
        const centerY = (touches[0].clientY + touches[1].clientY) / 2;
        
        onZoom(currentScale * scale, centerX, centerY);
      }
      
      this.lastTouchDistance = distance;
    }
  }
  
  handleTouchEnd(): void {
    this.isPinching = false;
    this.lastTouchDistance = 0;
  }
}

/**
 * Debounce функция для оптимизации производительности
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    
    timeout = setTimeout(() => {
      func.apply(null, args);
      timeout = null;
    }, wait);
  };
}

/**
 * Throttle функция для ограничения частоты вызовов
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func.apply(null, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}