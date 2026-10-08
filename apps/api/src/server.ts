import { buildApp } from './app.js';
import { db, closeDb } from './db/client.js';
import { env } from './env.js';
import { ExamplesRepository } from './examples/examples.repository.js';
import { ExamplesService } from './examples/examples.service.js';

const service = new ExamplesService(new ExamplesRepository(db));
const app = await buildApp({ logLevel: env.LOG_LEVEL, examplesService: service });

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, async () => {
    await app.close();
    await closeDb();
  });
}

try {
  await app.listen({ port: env.PORT, host: '0.0.0.0' });
} catch (err) {
  app.log.fatal({ err }, 'failed to start');
  process.exit(1);
}
