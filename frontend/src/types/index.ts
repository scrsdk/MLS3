export interface User {
  id: string;
  telegramId: string;
  username?: string;
  firstName: string;
  lastName?: string;
  countryId?: string;
  energy: number;
  maxEnergy: number;
  lastEnergyUpdate: Date;
  pixelsPlaced: number;
  isVip: boolean;
  level: number;
  experience: number;
  coins: number;
  createdAt: Date;
}

export interface Country {
  id: string;
  code: string;
  name: string;
  nameRu: string;
  flagSvg?: string;
  color: string;
  totalPixels: number;
  filledPixels: number;
  players: number;
  bounds: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  };
  geoJson?: any;
}

export interface Pixel {
  x: number;
  y: number;
  countryId: string;
  color: string;
  placedBy: string;
  placedAt: Date;
}

export interface TapEvent {
  countryId: string;
  x: number;
  y: number;
  isAttack: boolean;
}

export interface LeaderboardEntry {
  rank: number;
  country: Country;
  progress: number;
  players: number;
  pixelsToday: number;
}

export interface EnergyPack {
  id: string;
  amount: number;
  price: number;
  bonus?: number;
}

export interface GameStats {
  totalPixels: number;
  totalPlayers: number;
  topCountries: LeaderboardEntry[];
  recentActivity: TapEvent[];
}

export interface WebSocketMessage {
  type: 'tap' | 'energy' | 'leaderboard' | 'pixels' | 'error';
  data: any;
}

export interface TelegramWebApp {
  initData: string;
  initDataUnsafe: {
    user?: {
      id: number;
      first_name: string;
      last_name?: string;
      username?: string;
      language_code?: string;
    };
  };
  ready: () => void;
  expand: () => void;
  close: () => void;
  MainButton: {
    text: string;
    color: string;
    textColor: string;
    isVisible: boolean;
    isActive: boolean;
    isProgressVisible: boolean;
    show: () => void;
    hide: () => void;
    enable: () => void;
    disable: () => void;
    showProgress: (leaveActive: boolean) => void;
    hideProgress: () => void;
    setText: (text: string) => void;
    onClick: (callback: () => void) => void;
    offClick: (callback: () => void) => void;
  };
  BackButton: {
    isVisible: boolean;
    show: () => void;
    hide: () => void;
    onClick: (callback: () => void) => void;
    offClick: (callback: () => void) => void;
  };
  HapticFeedback: {
    impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
    notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
    selectionChanged: () => void;
  };
  openInvoice: (url: string, callback?: (status: string) => void) => void;
  showPopup: (params: {
    title?: string;
    message: string;
    buttons?: Array<{
      id?: string;
      type?: 'default' | 'ok' | 'close' | 'cancel' | 'destructive';
      text?: string;
    }>;
  }, callback?: (buttonId: string) => void) => void;
  showAlert: (message: string, callback?: () => void) => void;
  showConfirm: (message: string, callback?: (confirmed: boolean) => void) => void;
  setHeaderColor: (color: string) => void;
  setBackgroundColor: (color: string) => void;
  enableClosingConfirmation: () => void;
  disableClosingConfirmation: () => void;
  onEvent: (eventType: string, callback: () => void) => void;
  offEvent: (eventType: string, callback: () => void) => void;
  sendData: (data: string) => void;
  switchInlineQuery: (query: string, choose_chat_types?: string[]) => void;
  openLink: (url: string, options?: { try_instant_view?: boolean }) => void;
  openTelegramLink: (url: string) => void;
  isVersionAtLeast: (version: string) => boolean;
}