import { io, Socket } from 'socket.io-client';
import { WebSocketMessage, Pixel, LeaderboardEntry } from '../types';
import { useGameStore } from '../store/gameStore';

class WebSocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private tapBatchTimer: NodeJS.Timeout | null = null;
  private tapBatch: any[] = [];

  connect(token: string) {
    const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3001';
    
    this.socket = io(WS_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: this.reconnectDelay,
    });

    this.setupEventListeners();
  }

  private setupEventListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
      useGameStore.getState().setConnected(true);
      useGameStore.getState().setError(null);
    });

    this.socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
      useGameStore.getState().setConnected(false);
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      this.reconnectAttempts++;
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        useGameStore.getState().setError('Не удается подключиться к серверу. Проверьте интернет-соединение.');
      }
    });

    // Игровые события
    this.socket.on('pixels', (data: { pixels: Pixel[] }) => {
      useGameStore.getState().addPixels(data.pixels);
    });

    this.socket.on('energy', (data: { current: number; max: number }) => {
      useGameStore.getState().setEnergy(data.current, data.max);
    });

    this.socket.on('leaderboard', (data: { entries: LeaderboardEntry[] }) => {
      useGameStore.getState().setLeaderboard(data.entries);
    });

    this.socket.on('error', (data: { message: string }) => {
      useGameStore.getState().setError(data.message);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    
    if (this.tapBatchTimer) {
      clearTimeout(this.tapBatchTimer);
      this.tapBatchTimer = null;
    }
  }

  subscribeToCountry(countryId: string) {
    this.socket?.emit('subscribe', { countryId });
  }

  unsubscribeFromCountry(countryId: string) {
    this.socket?.emit('unsubscribe', { countryId });
  }

  sendTap(countryId: string, x: number, y: number) {
    // Добавляем в батч
    this.tapBatch.push({ countryId, x, y, timestamp: Date.now() });
    
    // Запускаем таймер для отправки батча
    if (!this.tapBatchTimer) {
      this.tapBatchTimer = setTimeout(() => {
        this.flushTapBatch();
      }, 2000);
    }
    
    // Если батч слишком большой, отправляем сразу
    if (this.tapBatch.length >= 10) {
      this.flushTapBatch();
    }
  }

  private flushTapBatch() {
    if (this.tapBatch.length > 0 && this.socket?.connected) {
      this.socket.emit('taps', { taps: this.tapBatch });
      this.tapBatch = [];
    }
    
    if (this.tapBatchTimer) {
      clearTimeout(this.tapBatchTimer);
      this.tapBatchTimer = null;
    }
  }

  forceFlushTaps() {
    this.flushTapBatch();
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

export const wsService = new WebSocketService();
export default wsService;