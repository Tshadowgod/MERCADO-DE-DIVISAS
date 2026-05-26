import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

type DbInstance = ReturnType<typeof drizzle<typeof schema>>;

let _db: DbInstance | null = null;

function getInstance(): DbInstance {
  if (!_db) {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL no configurada');
    _db = drizzle(neon(process.env.DATABASE_URL, { fetchOptions: { cache: 'no-store' } }), { schema });
  }
  return _db;
}

export const db = new Proxy({} as DbInstance, {
  get(_target, prop: string) {
    const instance = getInstance();
    const value = (instance as unknown as Record<string, unknown>)[prop];
    if (typeof value === 'function') {
      return (value as (...args: unknown[]) => unknown).bind(instance);
    }
    return value;
  },
});
