export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { db } from '@/db';
import { games } from '@/db/schema';
import { ne, desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { SCENARIOS, COUNTDOWN_DURATION } from '@/lib/scenarios';
import { calculateRates } from '@/lib/game-logic';
import type { Countdown, RateSnapshot, Rates } from '@/types';

const schema = z.object({
  scenarioId: z.number().int().min(1).max(10),
  action: z.enum(['activate', 'deactivate']),
});

function isAdmin(req: NextRequest) {
  const pw = req.headers.get('x-admin-password');
  return pw === process.env.ADMIN_PASSWORD;
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return Response.json({ error: 'No autorizado' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return Response.json({ error: 'Datos inválidos' }, { status: 400 });

  const { scenarioId, action } = parsed.data;

  const gameRows = await db
    .select()
    .from(games)
    .where(ne(games.status, 'ended'))
    .orderBy(desc(games.id))
    .limit(1);

  const game = gameRows[0];
  if (!game) return Response.json({ error: 'Sin partida activa' }, { status: 404 });

  const active = game.activeScenarios as number[];
  const cd = game.countdown as Countdown | null;

  if (action === 'activate') {
    if (cd && !cd.applied) {
      return Response.json({ error: 'Hay un evento en curso, espera a que termine' }, { status: 400 });
    }
    if (active.includes(scenarioId)) {
      return Response.json({ error: 'Este evento ya está aplicado' }, { status: 400 });
    }

    const countdown: Countdown = {
      scenarioId,
      startedAt: new Date().toISOString(),
      duration: COUNTDOWN_DURATION,
      applied: false,
    };

    await db.update(games).set({ countdown, updatedAt: new Date() }).where(eq(games.id, game.id));
    return Response.json({ ok: true, countdown });
  }

  // deactivate
  if (!active.includes(scenarioId)) {
    return Response.json({ error: 'Ese evento no está activo' }, { status: 400 });
  }

  const newActive = active.filter((id) => id !== scenarioId);
  const newRates: Rates = calculateRates(newActive);
  const history = game.rateHistory as RateSnapshot[];
  const newHistory: RateSnapshot[] = [
    ...history,
    { label: `E${history.length}`, ...newRates, timestamp: new Date().toISOString() },
  ];

  await db
    .update(games)
    .set({ activeScenarios: newActive, rates: newRates, rateHistory: newHistory, updatedAt: new Date() })
    .where(eq(games.id, game.id));

  return Response.json({ ok: true, rates: newRates });
}
