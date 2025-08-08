import { geoPath, geoMercator, GeoProjection, geoTransform } from 'd3-geo';
import { Feature, FeatureCollection, Polygon, MultiPolygon } from 'geojson';
import { simplifyPolygon, calculateCentroid, calculateBounds } from './geoHelpers';

// Импорт реальных данных карты мира
import worldGeoJSON from '../data/world-countries.json';

export interface WorldCountry {
  id: string;
  code: string;
  name: string;
  nameRu: string;
  color: string;
  path: string;
  centroid: [number, number];
  bounds: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  };
  coordinates: number[][]; // Реальные координаты для точного hit-testing
  progress: number; // 0-1, прогресс закрашивания
}

export interface TerritoryPixel {
  x: number;
  y: number;
  countryId: string;
  color: string;
  progress: number; // 0-1, анимированный прогресс
  targetProgress: number; // целевой прогресс
  placedAt: Date;
  priority: number; // Приоритет для рендеринга (0 - высокий, 1 - низкий)
}

// Оптимизированная проекция Mercator для web-карт
export const projection = geoMercator()
  .scale(200)
  .translate([800, 400])
  .center([0, 20]); // Смещение центра для лучшего отображения суши

export const pathGenerator = geoPath(projection);

// Кеш для обработанных стран
let processedCountries: WorldCountry[] | null = null;
const pathCache = new Map<string, Map<number, string>>();

// Цвета для стран
const COUNTRY_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#F7931E', '#96CEB4', 
  '#FECA57', '#FF9FF3', '#54A0FF', '#5F27CD', '#00D2D3',
  '#FD79A8', '#A29BFE', '#6C5CE7', '#74B9FF', '#0984E3',
  '#00B894', '#00CEC9', '#E17055', '#FDCB6E', '#E84393'
];

// Обработанные данные стран из GeoJSON
export let worldCountryData: WorldCountry[] = [];

/**
 * Обрабатывает GeoJSON данные в формат WorldCountry с оптимизацией
 */
function processGeoJSONData(): WorldCountry[] {
  if (processedCountries) {
    return processedCountries;
  }

  const countries: WorldCountry[] = [];
  const features = (worldGeoJSON as FeatureCollection).features;

  features.forEach((feature, index) => {
    const props = feature.properties!;
    const geometry = feature.geometry as Polygon | MultiPolygon;
    
    if (!geometry || !props.id) return;
    
    // Получаем координаты (берем первый полигон для MultiPolygon)
    let coordinates: number[][];
    if (geometry.type === 'Polygon') {
      coordinates = geometry.coordinates[0] as number[][];
    } else if (geometry.type === 'MultiPolygon') {
      coordinates = geometry.coordinates[0][0] as number[][];
    } else {
      return;
    }
    
    // Упрощаем геометрию для производительности
    const simplifiedCoords = simplifyPolygon(coordinates, 0.1);
    
    // Проецируем координаты
    const projectedCoords = simplifiedCoords.map(coord => {
      const projected = projection([coord[0], coord[1]]);
      return projected || [0, 0];
    });
    
    // Вычисляем centroid и bounds
    const centroid = calculateCentroid(projectedCoords);
    const bounds = calculateBounds(projectedCoords);
    
    // Создаем SVG path
    const pathData = createSVGPath(projectedCoords);
    
    countries.push({
      id: props.id,
      code: props.iso_a2 || props.id,
      name: props.name,
      nameRu: props.nameRu || props.name,
      color: COUNTRY_COLORS[index % COUNTRY_COLORS.length],
      path: pathData,
      centroid: centroid as [number, number],
      bounds,
      coordinates: simplifiedCoords,
      progress: 0
    });
  });
  
  processedCountries = countries;
  return countries;
}

/**
 * Создает SVG path из координат
 */
function createSVGPath(coordinates: number[][]): string {
  if (coordinates.length === 0) return '';
  
  const pathCommands: string[] = [];
  pathCommands.push(`M${coordinates[0][0]},${coordinates[0][1]}`);
  
  for (let i = 1; i < coordinates.length; i++) {
    pathCommands.push(`L${coordinates[i][0]},${coordinates[i][1]}`);
  }
  
  pathCommands.push('Z');
  return pathCommands.join(' ');
}

/**
 * Загружает и обрабатывает данные карты мира с оптимизацией производительности
 */
export const loadWorldTopology = async (): Promise<WorldCountry[]> => {
  try {
    // Обрабатываем GeoJSON данные
    const countries = processGeoJSONData();
    worldCountryData = countries;
    
    // Кешируем обработанные пути для разных уровней детализации
    countries.forEach(country => {
      if (!pathCache.has(country.id)) {
        pathCache.set(country.id, new Map());
      }
    });
    
    return countries;
  } catch (error) {
    console.error('Ошибка загрузки данных карты:', error);
    // Возвращаем пустой массив в случае ошибки
    return [];
  }
};

/**
 * Возвращает упрощенную версию пути для определенного уровня детализации
 */
export function getSimplifiedPath(countryId: string, lodLevel: number): string {
  const countryCache = pathCache.get(countryId);
  if (countryCache?.has(lodLevel)) {
    return countryCache.get(lodLevel)!;
  }
  
  const country = worldCountryData.find(c => c.id === countryId);
  if (!country) return '';
  
  // Определяем уровень упрощения на основе LOD
  const tolerances = [2.0, 1.0, 0.5, 0.2, 0.1];
  const tolerance = tolerances[Math.min(lodLevel, tolerances.length - 1)];
  
  // Упрощаем координаты
  const simplified = simplifyPolygon(country.coordinates, tolerance);
  
  // Проецируем и создаем путь
  const projected = simplified.map(coord => {
    const proj = projection([coord[0], coord[1]]);
    return proj || [0, 0];
  });
  
  const path = createSVGPath(projected);
  
  // Кешируем результат
  if (!pathCache.has(countryId)) {
    pathCache.set(countryId, new Map());
  }
  pathCache.get(countryId)!.set(lodLevel, path);
  
  return path;
}

/**
 * Проверяет, находится ли точка внутри границ страны (быстрая проверка)
 */
export const isPointInCountryBounds = (x: number, y: number, country: WorldCountry): boolean => {
  const { minX, minY, maxX, maxY } = country.bounds;
  return x >= minX && x <= maxX && y >= minY && y <= maxY;
};

/**
 * Точная проверка принадлежности точки стране с использованием point-in-polygon
 */
export const isPointInCountry = (x: number, y: number, country: WorldCountry): boolean => {
  // Сначала быстрая проверка по bounds
  if (!isPointInCountryBounds(x, y, country)) {
    return false;
  }
  
  // Преобразуем экранные координаты обратно в географические
  const geoCoords = projection.invert ? projection.invert([x, y]) : null;
  if (!geoCoords) return false;
  
  // Проверяем с помощью point-in-polygon алгоритма
  return pointInPolygon([geoCoords[0], geoCoords[1]], country.coordinates);
};

/**
 * Находит страну по координатам с оптимизацией производительности
 */
export const getCountryByPoint = (
  x: number, 
  y: number, 
  countries: WorldCountry[]
): WorldCountry | null => {
  // Сначала фильтруем по bounds для производительности
  const candidates = countries.filter(country => 
    isPointInCountryBounds(x, y, country)
  );
  
  // Затем точная проверка
  for (const country of candidates) {
    if (isPointInCountry(x, y, country)) {
      return country;
    }
  }
  
  return null;
};

/**
 * Point-in-polygon алгоритм (Ray casting)
 */
function pointInPolygon(point: [number, number], polygon: number[][]): boolean {
  const [x, y] = point;
  let inside = false;
  
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    
    if (((yi > y) !== (yj > y)) &&
        (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  
  return inside;
}

/**
 * Преобразует экранные координаты в координаты карты с учетом трансформации
 */
export const screenToMapCoords = (
  screenX: number,
  screenY: number,
  canvas: HTMLCanvasElement,
  transform: { x: number; y: number; scale: number }
): { x: number; y: number } => {
  const rect = canvas.getBoundingClientRect();
  const canvasX = (screenX - rect.left) * window.devicePixelRatio;
  const canvasY = (screenY - rect.top) * window.devicePixelRatio;
  
  // Применяем обратную трансформацию
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  
  const mapX = (canvasX - centerX) / transform.scale + transform.x;
  const mapY = (canvasY - centerY) / transform.scale + transform.y;
  
  return { x: mapX, y: mapY };
};

/**
 * Преобразует координаты карты в экранные координаты
 */
export const mapToScreenCoords = (
  mapX: number,
  mapY: number,
  canvas: HTMLCanvasElement,
  transform: { x: number; y: number; scale: number }
): { x: number; y: number } => {
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  
  const screenX = (mapX - transform.x) * transform.scale + centerX;
  const screenY = (mapY - transform.y) * transform.scale + centerY;
  
  return { x: screenX, y: screenY };
};

/**
 * Вычисляет видимую область карты (viewport) в географических координатах
 */
export const getMapViewport = (
  canvas: HTMLCanvasElement,
  transform: { x: number; y: number; scale: number }
) => {
  const halfWidth = canvas.width / 2 / transform.scale;
  const halfHeight = canvas.height / 2 / transform.scale;
  
  return {
    minX: transform.x - halfWidth,
    maxX: transform.x + halfWidth,
    minY: transform.y - halfHeight,
    maxY: transform.y + halfHeight
  };
};

// Цвета для Fog of War с оптимизацией для Canvas
export const FOG_OF_WAR_COLORS = {
  UNEXPLORED: '#C0C0C0',    // Серый для неисследованных территорий
  EXPLORING: '#D0D0D0',     // Светло-серый для исследуемых
  EXPLORED: '#FFFFFF',      // Белый для исследованных
  OCEAN: '#A0C4FF',         // Синий для океанов
  BORDER: '#808080'         // Темно-серый для границ
};

/**
 * Менеджер производительности для оптимизации рендеринга
 */
export class RenderOptimizer {
  private lastFrameTime = 0;
  private frameCount = 0;
  private fps = 60;
  private frameTimeBuffer: number[] = [];
  private readonly bufferSize = 60;
  
  updateFrame(): number {
    const now = performance.now();
    const deltaTime = now - this.lastFrameTime;
    this.lastFrameTime = now;
    
    this.frameTimeBuffer.push(deltaTime);
    if (this.frameTimeBuffer.length > this.bufferSize) {
      this.frameTimeBuffer.shift();
    }
    
    // Вычисляем средний FPS
    if (this.frameCount % 10 === 0) {
      const avgFrameTime = this.frameTimeBuffer.reduce((a, b) => a + b, 0) / this.frameTimeBuffer.length;
      this.fps = 1000 / avgFrameTime;
    }
    
    this.frameCount++;
    return deltaTime;
  }
  
  getFPS(): number {
    return Math.round(this.fps);
  }
  
  shouldSkipFrame(): boolean {
    return this.fps < MAP_CONFIG.TARGET_FPS * 0.8; // Пропускаем кадры если FPS < 48
  }
  
  getOptimalLOD(scale: number): number {
    // Адаптивный LOD на основе производительности
    const baseLOD = scale < 1 ? 0 : scale < 2 ? 1 : scale < 4 ? 2 : 3;
    
    if (this.fps < 30) {
      return Math.max(0, baseLOD - 1); // Понижаем качество при низком FPS
    }
    
    return baseLOD;
  }
}

// Глобальный экземпляр оптимизатора
export const renderOptimizer = new RenderOptimizer();

/**
 * Lazy loading для больших наборов данных
 */
export class DataLoader {
  private loadedChunks = new Set<string>();
  private chunkSize = 100;
  
  async loadChunk(chunkId: string): Promise<WorldCountry[]> {
    if (this.loadedChunks.has(chunkId)) {
      return [];
    }
    
    // Имитация загрузки данных
    await new Promise(resolve => setTimeout(resolve, 10));
    
    this.loadedChunks.add(chunkId);
    return [];
  }
  
  getChunkId(x: number, y: number): string {
    const chunkX = Math.floor(x / this.chunkSize);
    const chunkY = Math.floor(y / this.chunkSize);
    return `${chunkX},${chunkY}`;
  }
}

/**
 * Viewport culling - определяет какие страны нужно рендерить
 */
export function getVisibleCountries(
  countries: WorldCountry[],
  viewport: { minX: number; maxX: number; minY: number; maxY: number },
  scale: number
): WorldCountry[] {
  const padding = MAP_CONFIG.CULL_PADDING / scale;
  const expandedViewport = {
    minX: viewport.minX - padding,
    maxX: viewport.maxX + padding,
    minY: viewport.minY - padding,
    maxY: viewport.maxY + padding
  };
  
  return countries.filter(country => {
    const bounds = country.bounds;
    
    // Проверяем пересечение с viewport
    if (bounds.maxX < expandedViewport.minX || 
        bounds.minX > expandedViewport.maxX ||
        bounds.maxY < expandedViewport.minY || 
        bounds.minY > expandedViewport.maxY) {
      return false;
    }
    
    // Проверяем минимальный размер на экране
    const screenWidth = (bounds.maxX - bounds.minX) * scale;
    const screenHeight = (bounds.maxY - bounds.minY) * scale;
    
    return screenWidth > MAP_CONFIG.MIN_COUNTRY_SIZE && 
           screenHeight > MAP_CONFIG.MIN_COUNTRY_SIZE;
  });
}

// Конфигурация карты с оптимизацией производительности
export const MAP_CONFIG = {
  // Размеры мирового полотна
  WORLD_WIDTH: 2048,
  WORLD_HEIGHT: 1024,
  
  // Зум
  MIN_ZOOM: 0.3,
  MAX_ZOOM: 12,
  INITIAL_CENTER: { x: 1024, y: 512 }, // Центр мира
  INITIAL_ZOOM: 0.8,
  
  // Производительность
  TARGET_FPS: 60,
  FRAME_TIME_MS: 1000 / 60,
  MAX_COUNTRIES_PER_FRAME: 50, // Максимум стран для рендеринга за кадр
  
  // Анимации
  TAP_ANIMATION_DURATION: 600,
  PROGRESS_ANIMATION_SPEED: 0.03,
  PARTICLE_COUNT: 8, // Уменьшено для производительности
  
  // Fog of War
  FOG_ALPHA: 0.85,
  FOG_COLOR: '#C0C0C0', // Серый цвет для неисследованных территорий
  EXPLORED_ALPHA: 0.3,
  PROGRESS_SEGMENTS: 16, // Оптимизировано для производительности
  
  // Level of Detail
  LOD_THRESHOLDS: {
    VERY_LOW: 0.5,
    LOW: 1.0,
    MEDIUM: 2.0,
    HIGH: 4.0,
    VERY_HIGH: 8.0
  },
  
  // Оптимизация рендеринга
  CULL_PADDING: 100, // Отступ для culling (в пикселях)
  MIN_COUNTRY_SIZE: 2, // Минимальный размер страны в пикселях для отображения
  SIMPLIFICATION_TOLERANCE: 0.5,
};