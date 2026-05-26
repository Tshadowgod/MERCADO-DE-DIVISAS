export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { db } from '@/db';
import { games, players, transactions } from '@/db/schema';
import { eq, ne, desc } from 'drizzle-orm';
import { z } from 'zod';
import type { Rates } from '@/types';

const schema = z.object({
  currency: z.enum(['usd', 'eur', 'cny']),
  action: z.enum(['buy', 'sell']),
  quantity: z.number().positive(),
});

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return Response.json({ error: 'Sin autenticación' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return Response.json({ error: 'Datos inválidos' }, { status: 400 });

  const { currency, action, quantity } = parsed.data;

  const gameRows = await db
    .select()
    .from(games)
    .where(ne(games.status, 'ended'))
    .orderBy(desc(games.id))
    .limit(1);

  const game = gameRows[0];
  if (!game || game.status !== 'running') {
    return Response.json({ error: 'La partida no está activa' }, { status: 400 });
  }

  const playerRows = await db.select().from(players).where(eq(players.token, token)).limit(1);
  const player = playerRows[0];
  if (!player || player.gameId !== game.id) {
    return Response.json({ error: 'Jugador no encontrado' }, { status: 404 });
  }

  const rates = game.rates as Rates;
  const rate = rates[currency];
  const bobChange = quantity * rate;

  let newBob = player.bob;
  let newCurrency = player[currency];

  if (action === 'buy') {
    if (player.bob < bobChange) {
      return Response.json({ error: `Bs insuficientes. Necesitas Bs ${bobChange.toFixed(2)}` });
    }
    newBob = player.bob - bobChange;
    newCurrency = player[currency] + quantity;
  } else {
    if (player[currency] < quantity) {
      return Response.json({ error: `No tienes suficiente ${currency.toUpperCase()}` });
    }
    newBob = player.bob + bobChange;
    newCurrency = player[currency] - quantity;
  }

  const updated = await db
    .update(players)
    .set({ bob: newBob, [currency]: newCurrency })
    .where(eq(players.id, player.id))
    .returning();

  await db.insert(transactions).values({
    playerId: player.id,
    currency,
    action,
    quantity,
    rate,
    bobChange: action === 'buy' ? -bobChange : bobChange,
  });

  const label = action === 'buy' ? 'Compraste' : 'Vendiste';
  return Response.json({
    success: true,
    message: `${label} ${quantity} ${currency.toUpperCase()} por Bs ${bobChange.toFixed(2)}`,
    portfolio: { bob: updated[0].bob, usd: updated[0].usd, eur: updated[0].eur, cny: updated[0].cny },
  });
}
