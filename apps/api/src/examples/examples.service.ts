import type { CreateExample, ExampleDto, ListExamplesQuery } from '@starter/shared';
import type { Example } from '../db/schema.js';
import type { ExamplesRepository } from './examples.repository.js';

export class ConflictError extends Error {
  readonly statusCode = 409;
}

const toDto = (row: Example): ExampleDto => ({
  id: row.id,
  name: row.name,
  createdAt: row.createdAt.toISOString(),
});

/** Business rules live here. Knows nothing about HTTP or SQL dialects. */
export class ExamplesService {
  constructor(private readonly repo: ExamplesRepository) {}

  async create(input: CreateExample): Promise<ExampleDto> {
    try {
      return toDto(await this.repo.insert({ name: input.name }));
    } catch (err) {
      if (isUniqueViolation(err)) throw new ConflictError('name already exists');
      throw err;
    }
  }

  async list(query: ListExamplesQuery): Promise<{ items: ExampleDto[]; nextCursor: string | null }> {
    // Fetch one extra row to learn whether another page exists, without a second COUNT query.
    const rows = await this.repo.findPage(query.limit + 1, query.cursor);
    const page = rows.slice(0, query.limit);
    const nextCursor = rows.length > query.limit ? (page.at(-1)?.id ?? null) : null;
    return { items: page.map(toDto), nextCursor };
  }
}

const isUniqueViolation = (err: unknown): boolean =>
  typeof err === 'object' && err !== null && 'code' in err && err.code === '23505';
