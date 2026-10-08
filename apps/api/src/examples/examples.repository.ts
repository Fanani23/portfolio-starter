import { asc, gt } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { examples, type Example, type NewExample } from '../db/schema.js';

/** Data access only. No business rules, no HTTP concepts. */
export class ExamplesRepository {
  constructor(private readonly db: Db) {}

  async insert(value: NewExample): Promise<Example> {
    const [row] = await this.db.insert(examples).values(value).returning();
    if (!row) throw new Error('insert returned no row');
    return row;
  }

  async findPage(limit: number, cursor?: string): Promise<Example[]> {
    const where = cursor ? gt(examples.id, cursor) : undefined;
    return this.db.select().from(examples).where(where).orderBy(asc(examples.id)).limit(limit);
  }
}
