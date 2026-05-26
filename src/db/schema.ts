import { pgTable, serial, text, doublePrecision, jsonb, timestamp, integer } from 'drizzle-orm/pg-core';
import type { Rates, RateSnapshot, Countdown, NewsItem } from '@/types';

export const games = pgTable('games', {
  id: serial('id').primaryKey(),
  status: text('status').notNull().default('waiting'),
  rates: jsonb('rates').notNull().$type<Rates>(),
  activeScenarios: jsonb('active_scenarios').notNull().$type<number[]>(),
  countdown: jsonb('countdown').$type<Countdown | null>(),
  rateHistory: jsonb('rate_history').notNull().$type<RateSnapshot[]>(),
  news: jsonb('news').notNull().$type<NewsItem[]>(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const players = pgTable('players', {
  id: serial('id').primaryKey(),
  gameId: integer('game_id').notNull(),
  name: text('name').notNull(),
  token: text('token').notNull(),
  bob: doublePrecision('bob').notNull().default(100000),
  usd: doublePrecision('usd').notNull().default(0),
  eur: doublePrecision('eur').notNull().default(0),
  cny: doublePrecision('cny').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

export const transactions = pgTable('transactions', {
  id: serial('id').primaryKey(),
  playerId: integer('player_id').notNull(),
  currency: text('currency').notNull(),
  action: text('action').notNull(),
  quantity: doublePrecision('quantity').notNull(),
  rate: doublePrecision('rate').notNull(),
  bobChange: doublePrecision('bob_change').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});
