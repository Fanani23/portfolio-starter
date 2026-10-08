import { pgTable, text, timestamp, uuid, index, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

/**
 * Example table. Replace it per project, but keep the patterns:
 * - uuid primary key, so ids are not guessable and not sequential
 * - timestamptz, never bare timestamp
 * - CHECK constraints in the database, not only in application code
 * - an index on every column the contract filters or sorts by
 */
export const examples = pgTable(
  'examples',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull().unique(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('examples_created_at_idx').on(t.createdAt),
    check('examples_name_not_blank', sql`length(trim(${t.name})) > 0`),
  ],
);

export type Example = typeof examples.$inferSelect;
export type NewExample = typeof examples.$inferInsert;
