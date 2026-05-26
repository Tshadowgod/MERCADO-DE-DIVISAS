export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { db } from '@/db';
import { games, players } from '@/db/schema';
import { eq, ne, desc, and } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';
import { z } from 'zod';
import { INITIAL_BOB } from '@/lib/scenarios';

const schema = z.object({ name: z.string().min(1).max(30).trim() });

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return Response.json({ error: 'Nombre inválido' }, { status: 400 });

  const { name } = parsed.data;

  const gameRows = await db
    .select()
    .from(games)
    .where(ne(games.status, 'ended'))
    .orderBy(desc(games.id))
    .limit(1);

  const game = gameRows[0];
  if (!game) return Response.json({ error: 'No hay partida activa' }, { status: 404 });

  const existingRows = await db
    .select()
    .from(players)
    .where(and(eq(players.gameId, game.id), eq(players.name, name)))
    .limit(1);

  if (existingRows.length > 0) {
    const p = existingRows[0];
    return Response.json({
      token: p.token,
      name: p.name,
      portfolio: { bob: p.bob, usd: p.usd, eur: p.eur, cny: p.cny },
    });
  }

  const token = uuid();
  const inserted = await db
    .insert(players)
    .values({ gameId: game.id, name, token, bob: INITIAL_BOB, usd: 0, eur: 0, cny: 0 })
    .returning();

  const player = inserted[0];
  return Response.json({
    token: player.token,
    name: player.name,
    portfolio: { bob: player.bob, usd: player.usd, eur: player.eur, cny: player.cny },
  });
}
