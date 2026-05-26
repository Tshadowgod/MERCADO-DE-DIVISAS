export type Currency = 'usd' | 'eur' | 'cny';

export interface Rates {
  usd: number;
  eur: number;
  cny: number;
}

export interface Portfolio {
  bob: number;
  usd: number;
  eur: number;
  cny: number;
}

export interface RateSnapshot {
  label: string;
  usd: number;
  eur: number;
  cny: number;
  timestamp: string;
}

export interface Countdown {
  scenarioId: number;
  startedAt: string;
  duration: number;
  applied: boolean;
}

export interface NewsItem {
  id: string;
  time: string;
  title: string;
  description: string;
  concept: string;
  icon: string;
}

export interface GameState {
  id: number;
  status: 'waiting' | 'running' | 'ended';
  rates: Rates;
  activeScenarios: number[];
  countdown: Countdown | null;
  rateHistory: RateSnapshot[];
  news: NewsItem[];
}

export interface LeaderboardEntry {
  id: number;
  name: string;
  totalBob: number;
  portfolio: Portfolio;
}

export interface MarketIndicator {
  currency: Currency;
  direction: 'up' | 'down' | 'neutral';
  intensity: 1 | 2 | 3;
}

export interface Scenario {
  id: number;
  title: string;
  description: string;
  concept: string;
  icon: string;
  effects: Partial<Record<Currency, number>>;
  indicators: MarketIndicator[];
  question: string;
}
