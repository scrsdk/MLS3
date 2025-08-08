import axios from 'axios';
import type { User, Country, Pixel, LeaderboardEntry, EnergyPack } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Добавляем токен к каждому запросу
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Обработка ошибок
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.reload();
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  loginWithTelegram: async (initData: string): Promise<{ token: string; user: User }> => {
    console.log('📡 Calling /auth/telegram with data:', initData.substring(0, 50) + '...');
    console.log('API URL:', API_URL);
    const { data } = await api.post('/auth/telegram', { initData });
    console.log('✅ Auth response:', data);
    localStorage.setItem('token', data.token);
    return data;
  },
  
  logout: () => {
    localStorage.removeItem('token');
  },
};

export const gameAPI = {
  getCountries: async (): Promise<Country[]> => {
    console.log('📡 Fetching countries...');
    const { data } = await api.get('/game/countries');
    console.log('✅ Countries fetched:', data.length);
    return data;
  },
  
  selectCountry: async (countryId: string): Promise<User> => {
    const { data } = await api.post('/game/select-country', { countryId });
    return data;
  },
  
  getMapData: async (): Promise<{ countries: Country[]; pixels: Pixel[] }> => {
    console.log('📡 Fetching map data...');
    const { data } = await api.get('/game/map');
    console.log('✅ Map data fetched');
    return data;
  },
  
  placeTap: async (countryId: string, x: number, y: number): Promise<{ 
    success: boolean; 
    pixel?: Pixel; 
    energy: number;
    error?: string;
  }> => {
    const { data } = await api.post('/game/tap', { countryId, x, y });
    return data;
  },
  
  getLeaderboard: async (): Promise<LeaderboardEntry[]> => {
    const { data } = await api.get('/game/leaderboard');
    return data;
  },
  
  getUserStats: async (): Promise<{
    pixelsPlaced: number;
    countryRank: number;
    globalRank: number;
    achievements: any[];
  }> => {
    const { data } = await api.get('/game/user-stats');
    return data;
  },
};

export const energyAPI = {
  getStatus: async (): Promise<{
    current: number;
    max: number;
    nextRestore: Date;
  }> => {
    const { data } = await api.get('/energy/status');
    return data;
  },
  
  claimDaily: async (): Promise<{
    energy: number;
    nextClaim: Date;
  }> => {
    const { data } = await api.post('/energy/claim-daily');
    return data;
  },
  
  getPackages: async (): Promise<EnergyPack[]> => {
    const { data } = await api.get('/energy/packages');
    return data;
  },
  
  purchaseEnergy: async (packageId: string): Promise<{
    success: boolean;
    invoiceUrl?: string;
  }> => {
    const { data } = await api.post('/energy/purchase', { packageId });
    return data;
  },
};

export default api;