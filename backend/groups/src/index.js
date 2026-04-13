import Fastify from 'fastify';
import cors from '@fastify/cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import groupsRoutes from './routes/groups.js';
import membersRoutes from './routes/members.js';
import testRoutes from './routes/test.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../../.env') });

const app = Fastify({ logger: false });
app.setErrorHandler(function (error, request, reply) {
  reply.status(500).send({ ok: false, error: error.message, stack: error.stack })
});

await app.register(cors, {
  origin: true,
  credentials: true,
});

app.register(groupsRoutes, { prefix: '/groups' });
app.register(membersRoutes, { prefix: '/members' });
app.register(testRoutes, { prefix: '/test' });

app.get('/health', async () => ({ status: 'ok', service: 'groups' }));

const PORT = parseInt(process.env.PORT_GROUPS || '3003');

app.listen({ port: PORT, host: '0.0.0.0' }, (err) => {
  if (err) {
    process.stderr.write(err.message + '\n');
    process.exit(1);
  }
  process.stdout.write(`Groups service running on port ${PORT}\n`);
});
