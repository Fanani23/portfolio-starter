import type { AppInstance } from '../types.js';
import {
  createExampleSchema,
  errorResponseSchema,
  exampleSchema,
  listExamplesQuerySchema,
  listExamplesResponseSchema,
} from '@starter/shared';
import type { ExamplesService } from './examples.service.js';

/**
 * Transport only: parse the request, call the service, shape the reply.
 * Authorization note: these routes are public by design in the template.
 * Each project replaces this comment with the rule it enforces, and adds a preHandler.
 */
export function registerExampleRoutes(app: AppInstance, service: ExamplesService): void {
  app.post(
    '/examples',
    {
      schema: {
        body: createExampleSchema,
        response: { 201: exampleSchema, 409: errorResponseSchema },
      },
    },
    async (req, reply) => reply.code(201).send(await service.create(req.body)),
  );

  app.get(
    '/examples',
    {
      schema: {
        querystring: listExamplesQuerySchema,
        response: { 200: listExamplesResponseSchema },
      },
    },
    async (req) => service.list(req.query),
  );
}
