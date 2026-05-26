import { BASE_RATES, SCENARIOS } from './scenarios';
import type { Rates, Portfolio } from '@/types';

export function calculateRates(activeScenarioIds: number[]): Rates {
  const rates = { ...BASE_RATES };
  for (const id of activeScenarioIds) {
    const scenario = SCENARIOS.find((s) => s.id === id);
    if (!scenario) continue;
    if (scenario.effects.usd) rates.usd *= 1 + scenario.effects.usd / 100;
    if (scenario.effects.eur) rates.eur *= 1 + scenario.effects.eur / 100;
    if (scenario.effects.cny) rates.cny *= 1 + scenario.effects.cny / 100;
  }
  return {
    usd: parseFloat(rates.usd.toFixed(4)),
    eur: parseFloat(rates.eur.toFixed(4)),
    cny: parseFloat(rates.cny.toFixed(4)),
  };
}

export function portfolioValue(portfolio: Portfolio, rates: Rates): number {
  return (
    portfolio.bob +
    portfolio.usd * rates.usd +
    portfolio.eur * rates.eur +
    portfolio.cny * rates.cny
  );
}

export function pctChange(current: number, base: number): number {
  return ((current - base) / base) * 100;
}
