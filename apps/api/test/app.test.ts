import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { healthResponseSchema } from '@starter/shared';
import { buildApp } from '../src/app.js';
import { ExamplesService } from '../src/examples/examples.service.js';
import type { ExamplesRepository } from '../src/examples/examples.repository.js';
import type { AppInstance } from '../src/types.js';

const uniqueViolation = Object.assign(new Error('duplicate key'), { code: '23505' });

/** Fake repository: the service's error branches are unit-testable without a database. */
const fakeRepo = (overrides: Partial<ExamplesRepository> = {}) =>
  ({
    insert: async (v: { name: string }) => ({ id: '11111111-1111-4111-8111-111111111111', name: v.name, createdAt: new Date(0) }),
    findPage: async () => [],
    ...overrides,
  }) as unknown as ExamplesRepository;

describe('app', () => {
  let app: AppInstance;
  beforeAll(async () => {
    app = await buildApp({
      logLevel: 'silent',
      examplesService: new ExamplesService(
        fakeRepo({
          insert: async (v) => {
            if (v.name === 'taken') throw uniqueViolation;
            if (v.name === 'boom') throw new Error('database on fire: password=hunter2');
            return { id: '11111111-1111-4111-8111-111111111111', name: v.name, createdAt: new Date(0) };
          },
        }),
      ),
    });
    await app.ready();
  });
  afterAll(() => app.close());

  it('reports health', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    expect(healthResponseSchema.parse(res.json()).status).toBe('ok');
  });

  it('creates a resource', async () => {
    const res = await app.inject({ method: 'POST', url: '/examples', payload: { name: 'alpha' } });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({ name: 'alpha' });
  });

  it('rejects an invalid body with field-level detail', async () => {
    const res = await app.inject({ method: 'POST', url: '/examples', payload: { name: '  ' } });
    expect(res.statusCode).toBe(400);
    expect(res.json().details?.[0]?.path).toBe('name');
  });

  it('rejects an unknown query value', async () => {
    const res = await app.inject({ method: 'GET', url: '/examples?limit=999' });
    expect(res.statusCode).toBe(400);
  });

  it('maps a unique violation to 409, not 500', async () => {
    const res = await app.inject({ method: 'POST', url: '/examples', payload: { name: 'taken' } });
    expect(res.statusCode).toBe(409);
  });

  it('never leaks an internal error message', async () => {
    const res = await app.inject({ method: 'POST', url: '/examples', payload: { name: 'boom' } });
    expect(res.statusCode).toBe(500);
    expect(res.body).not.toContain('hunter2');
    expect(res.json().error).toBe('Internal Server Error');
  });

  it('sets security headers', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  it('returns 404 for an unknown route', async () => {
    const res = await app.inject({ method: 'GET', url: '/nope' });
    expect(res.statusCode).toBe(404);
  });
});

describe('ExamplesService.list', () => {
  it('returns a cursor only when a further page exists', async () => {
    const rows = Array.from({ length: 3 }, (_, i) => ({
      id: `1111111${i}-1111-4111-8111-111111111111`,
      name: `n${i}`,
      createdAt: new Date(0),
    }));
    const service = new ExamplesService(fakeRepo({ findPage: async () => rows }));
    const page = await service.list({ limit: 2 });
    expect(page.items).toHaveLength(2);
    expect(page.nextCursor).toBe('11111111-1111-4111-8111-111111111111');
  });

  it('returns a null cursor on the last page', async () => {
    const service = new ExamplesService(
      fakeRepo({ findPage: async () => [{ id: '11111110-1111-4111-8111-111111111111', name: 'n', createdAt: new Date(0) }] }),
    );
    expect((await service.list({ limit: 2 })).nextCursor).toBeNull();
  });
});
