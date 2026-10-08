import { z } from 'zod';

export const healthResponseSchema = z.object({
  status: z.literal('ok'),
  uptimeSeconds: z.number(),
});
export type HealthResponse = z.infer<typeof healthResponseSchema>;

/** Request contract. Parsed at the transport boundary; the interior sees only valid data. */
export const createExampleSchema = z.object({
  name: z.string().trim().min(1).max(120),
});
export type CreateExample = z.infer<typeof createExampleSchema>;

export const listExamplesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().uuid().optional(),
});
export type ListExamplesQuery = z.infer<typeof listExamplesQuerySchema>;

export const exampleSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  createdAt: z.string(),
});
export type ExampleDto = z.infer<typeof exampleSchema>;

export const listExamplesResponseSchema = z.object({
  items: z.array(exampleSchema),
  nextCursor: z.string().uuid().nullable(),
});

export const errorResponseSchema = z.object({
  error: z.string(),
  details: z.array(z.object({ path: z.string(), message: z.string() })).optional(),
});
