import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { sql } from 'drizzle-orm';
import postgres from 'postgres';
import { buildApp } from '../src/app.js';
import * as schema from '../src/db/schema.js';
import { examples } from '../src/db/schema.js';
import { ExamplesRepository } from '../src/examples/examples.repository.js';
import { ExamplesService } from '../src/examples/examples.service.js';
import type { AppInstance } from '../src/types.js';

const url = process.env.DATABASE_URL ?? 'postgres://starter:starter@localhost:5432/starter';
const client = postgres(url, { max: 1 });
const db = drizzle(client, { schema });

let app: AppInstance;

beforeAll(async () => {
  // Proves the generated migration applies to an empty database.
  await migrate(db, { migrationsFolder: './drizzle' });
  app = await buildApp({
    logLevel: 'silent',
    examplesService: new ExamplesService(new ExamplesRepository(db)),
  });
  await app.ready();
});

afterAll(async () => {
  await app.close();
  await client.end();
});

describe('examples against real postgres', () => {
  it('round-trips a row through the full stack', async () => {
    const name = `alpha-${Date.now()}`;
    const created = await app.inject({ method: 'POST', url: '/examples', payload: { name } });
    expect(created.statusCode).toBe(201);

    const listed = await app.inject({ method: 'GET', url: '/examples?limit=100' });
    expect(listed.statusCode).toBe(200);
    expect(listed.json().items.map((i: { name: string }) => i.name)).toContain(name);
  });

  it('enforces the UNIQUE constraint as a 409, not a 500', async () => {
    const name = `dup-${Date.now()}`;
    expect((await app.inject({ method: 'POST', url: '/examples', payload: { name } })).statusCode).toBe(201);
    expect((await app.inject({ method: 'POST', url: '/examples', payload: { name } })).statusCode).toBe(409);
  });

  it('enforces the CHECK constraint in the database, not only in Zod', async () => {
    // Bypasses the API so only the database constraint can reject this.
    await expect(db.insert(examples).values({ name: '   ' })).rejects.toThrow();
  });

  it('stores created_at as timestamptz', async () => {
    const [row] = await db.execute<{ data_type: string }>(sql`
      SELECT data_type FROM information_schema.columns
      WHERE table_name = 'examples' AND column_name = 'created_at'
    `);
    expect(row?.data_type).toBe('timestamp with time zone');
  });

  it('paginates with a stable cursor', async () => {
    const prefix = `page-${Date.now()}`;
    for (let i = 0; i < 3; i++) {
      await app.inject({ method: 'POST', url: '/examples', payload: { name: `${prefix}-${i}` } });
    }
    const first = await app.inject({ method: 'GET', url: '/examples?limit=2' });
    expect(first.json().items).toHaveLength(2);
    expect(first.json().nextCursor).toBeTruthy();

    const second = await app.inject({
      method: 'GET',
      url: `/examples?limit=2&cursor=${first.json().nextCursor}`,
    });
    expect(second.statusCode).toBe(200);
    const firstIds = first.json().items.map((i: { id: string }) => i.id);
    const secondIds = second.json().items.map((i: { id: string }) => i.id);
    expect(secondIds.some((id: string) => firstIds.includes(id))).toBe(false);
  });
});
