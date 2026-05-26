export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { db } from '@/db';
import { games } from '@/db/schema';
import { eq, ne, desc } from 'drizzle-orm';
import { z } from 'zod';
import { BASE_RATES } from '@/lib/scenarios';
import type { RateSnapshot } from '@/types';

const schema = z.object({ action: z.enum(['start', 'end', 'reset']) });

function isAdmin(req: NextRequest) {
  return req.headers.get('x-admin-password') === process.env.ADMIN_PASSWORD;
}

async function findActiveGame() {
  const rows = await db
    .select()
    .from(games)
    .where(ne(games.status, 'ended'))
    .orderBy(desc(games.id))
    .limit(1);
  return rows[0] ?? null;
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return Response.json({ error: 'No autorizado' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return Response.json({ error: 'Acción inválida' }, { status: 400 });

  const { action } = parsed.data;

  if (action === 'reset') {
    await db.update(games).set({ status: 'ended', updatedAt: new Date() }).where(ne(games.status, 'ended'));

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

    return Response.json({ ok: true, game: inserted[0] });
  }

  const game = await findActiveGame();
  if (!game) return Response.json({ error: 'Sin partida activa' }, { status: 404 });

  const newStatus = action === 'start' ? 'running' : 'ended';
  const updated = await db
    .update(games)
    .set({ status: newStatus, updatedAt: new Date() })
    .where(eq(games.id, game.id))
    .returning();

  return Response.json({ ok: true, status: updated[0].status });
}

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return Response.json({ error: 'No autorizado' }, { status: 401 });
  const game = await findActiveGame();
  return Response.json({ game: game ?? null });
}
