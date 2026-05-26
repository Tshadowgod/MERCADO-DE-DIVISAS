export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { db } from '@/db';
import { players } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const schema = z.object({ playerId: z.number().int().positive() });

function isAdmin(req: NextRequest) {
  return req.headers.get('x-admin-password') === process.env.ADMIN_PASSWORD;
}

export async function DELETE(req: NextRequest) {
  if (!isAdmin(req)) return Response.json({ error: 'No autorizado' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return Response.json({ error: 'Datos inválidos' }, { status: 400 });

  await db.delete(players).where(eq(players.id, parsed.data.playerId));

  return Response.json({ ok: true });
}
