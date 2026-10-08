import { buildApp } from './app.js';
import { ExamplesRepository } from './examples/examples.repository.js';
import { ExamplesService } from './examples/examples.service.js';
import type { Db } from './db/client.js';

/**
 * Emits the OpenAPI document without opening a database connection.
 * The service is injected purely so every route registers and appears in the spec;
 * no handler runs, so the stub is never called.
 */
const unusedDb = null as unknown as Db;

const app = await buildApp({
  logLevel: 'silent',
  examplesService: new ExamplesService(new ExamplesRepository(unusedDb)),
});

await app.ready();
process.stdout.write(`${JSON.stringify(app.swagger(), null, 2)}\n`);
await app.close();
