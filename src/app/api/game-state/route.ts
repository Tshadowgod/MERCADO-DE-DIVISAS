export const dynamic = 'force-dynamic';

import { db } from '@/db';
import { games, players } from '@/db/schema';
import { eq, ne, desc, and, sql } from 'drizzle-orm';
import { BASE_RATES, SCENARIOS, INITIAL_BOB } from '@/lib/scenarios';
import { calculateRates, portfolioValue } from '@/lib/game-logic';
import type { Countdown, RateSnapshot, NewsItem, Rates } from '@/types';

async function getOrCreateGame() {
  const rows = await db
    .select()
    .from(games)
    .where(ne(games.status, 'ended'))
    .orderBy(desc(games.id))
    .limit(1);

  if (rows.length > 0) return rows[0];

  const initialHistory: RateSnapshot[] = [
    { label: 'Inicio', ...BASE_RATES, timestamp: new Date().toISOString() },
  ];
  const inserted = await db
    .insert(games)
    .values({
      status: 'waiting',
      rates: BASE_RATES,
      activeScenarios: [],
      countdown: null,
      rateHistory: initialHistory,
      news: [],
    })
    .returning();
  return inserted[0];
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  let game = await getOrCreateGame();

  // Auto-apply countdown when it expires
  const cd = game.countdown as Countdown | null;
  if (cd && !cd.applied) {
    const elapsed = (Date.now() - new Date(cd.startedAt).getTime()) / 1000;
    if (elapsed >= cd.duration) {
      const newActive = [...(game.activeScenarios as number[]), cd.scenarioId];
      const newRates = calculateRates(newActive);
      const history = game.rateHistory as RateSnapshot[];
      const newHistory: RateSnapshot[] = [
        ...history,
        { label: `E${history.length}`, ...newRates, timestamp: new Date().toISOString() },
      ];
      const scenario = SCENARIOS.find((s) => s.id === cd.scenarioId);
      const newsItem: NewsItem = {
        id: String(cd.scenarioId),
        time: new Date().toLocaleTimeString('es-BO'),
        title: scenario?.title ?? '',
        description: scenario?.description ?? '',
        concept: scenario?.concept ?? '',
        icon: scenario?.icon ?? '📰',
      };
      const prevNews = (game.news as NewsItem[]).filter((n) => n.id !== newsItem.id);
      const newNews: NewsItem[] = [newsItem, ...prevNews].slice(0, 10);

      const updated = await db
        .update(games)
        .set({
          activeScenarios: newActive,
          rates: newRates,
          rateHistory: newHistory,
          news: newNews,
          countdown: { ...cd, applied: true },
          updatedAt: new Date(),
        })
        .where(
          and(eq(games.id, game.id), sql`(countdown->>'applied')::boolean = false`),
        )
        .returning();

      if (updated.length > 0) {
        game = updated[0];
      } else {
        const refetch = await db.select().from(games).where(eq(games.id, game.id)).limit(1);
        if (refetch.length > 0) game = refetch[0];
      }
    }
  }

  // Resolve player
  let playerData: { name: string; portfolio: { bob: number; usd: number; eur: number; cny: number } } | null = null;
  if (token) {
    const playerRows = await db.select().from(players).where(eq(players.token, token)).limit(1);
    const player = playerRows[0];
    if (player && player.gameId === game.id) {
      playerData = {
        name: player.name,
        portfolio: { bob: player.bob, usd: player.usd, eur: player.eur, cny: player.cny },
      };
    }
  }

  // Leaderboard
  const allPlayers = await db.select().from(players).where(eq(players.gameId, game.id));
  const rates = game.rates as Rates;
  const leaderboard = allPlayers
    .map((p) => ({
      id: p.id,
      name: p.name,
      totalBob: parseFloat(
        portfolioValue({ bob: p.bob, usd: p.usd, eur: p.eur, cny: p.cny }, rates).toFixed(2),
      ),
      portfolio: { bob: p.bob, usd: p.usd, eur: p.eur, cny: p.cny },
    }))
    .sort((a, b) => b.totalBob - a.totalBob);

  return Response.json({
    game: {
      id: game.id,
      status: game.status,
      rates: game.rates,
      activeScenarios: game.activeScenarios,
      countdown: game.countdown,
      rateHistory: game.rateHistory,
      news: game.news,
    },
    player: playerData,
    leaderboard,
    playerCount: allPlayers.length,
    initialBob: INITIAL_BOB,
  });
}
