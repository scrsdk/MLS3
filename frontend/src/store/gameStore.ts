import { create } from 'zustand';
import { User, Country, Pixel, LeaderboardEntry, TapEvent } from '../types';

interface GameState {
  // User
  user: User | null;
  setUser: (user: User | null) => void;
  
  // Countries
  countries: Country[];
  selectedCountry: Country | null;
  setCountries: (countries: Country[]) => void;
  setSelectedCountry: (country: Country | null) => void;
  
  // Pixels
  pixels: Map<string, Pixel>;
  addPixel: (pixel: Pixel) => void;
  addPixels: (pixels: Pixel[]) => void;
  clearPixels: () => void;
  
  // Energy
  energy: number;
  maxEnergy: number;
  nextEnergyRestore: Date | null;
  setEnergy: (energy: number, maxEnergy?: number) => void;
  decreaseEnergy: (amount?: number) => void;
  
  // Leaderboard
  leaderboard: LeaderboardEntry[];
  setLeaderboard: (entries: LeaderboardEntry[]) => void;
  
  // Game state
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  setConnected: (connected: boolean) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Tap queue
  tapQueue: TapEvent[];
  addTap: (tap: TapEvent) => void;
  clearTapQueue: () => void;
  
  // Map view
  mapCenter: { x: number; y: number };
  mapZoom: number;
  setMapView: (center: { x: number; y: number }, zoom: number) => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  // User
  user: null,
  setUser: (user) => set({ user }),
  
  // Countries
  countries: [],
  selectedCountry: null,
  setCountries: (countries) => set({ countries }),
  setSelectedCountry: (country) => set({ selectedCountry: country }),
  
  // Pixels
  pixels: new Map(),
  addPixel: (pixel) => set((state) => {
    const newPixels = new Map(state.pixels);
    const key = `${pixel.x}_${pixel.y}`;
    newPixels.set(key, pixel);
    return { pixels: newPixels };
  }),
  addPixels: (pixels) => set((state) => {
    const newPixels = new Map(state.pixels);
    pixels.forEach((pixel) => {
      const key = `${pixel.x}_${pixel.y}`;
      newPixels.set(key, pixel);
    });
    return { pixels: newPixels };
  }),
  clearPixels: () => set({ pixels: new Map() }),
  
  // Energy
  energy: 50,
  maxEnergy: 100,
  nextEnergyRestore: null,
  setEnergy: (energy, maxEnergy) => set((state) => ({
    energy,
    maxEnergy: maxEnergy ?? state.maxEnergy,
  })),
  decreaseEnergy: (amount = 1) => set((state) => ({
    energy: Math.max(0, state.energy - amount),
  })),
  
  // Leaderboard
  leaderboard: [],
  setLeaderboard: (entries) => set({ leaderboard: entries }),
  
  // Game state
  isConnected: false,
  isLoading: true,
  error: null,
  setConnected: (connected) => set({ isConnected: connected }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  
  // Tap queue
  tapQueue: [],
  addTap: (tap) => set((state) => ({
    tapQueue: [...state.tapQueue, tap],
  })),
  clearTapQueue: () => set({ tapQueue: [] }),
  
  // Map view
  mapCenter: { x: 0, y: 0 },
  mapZoom: 1,
  setMapView: (center, zoom) => set({ mapCenter: center, mapZoom: zoom }),
}));