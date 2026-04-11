import Fastify from 'fastify';
import cors from '@fastify/cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import authRoutes from './routes/auth.js';
import usersRoutes from './routes/users.js';
import permissionsRoutes from './routes/permissions.js';
import testRoutes from './routes/test.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../../.env') });

const app = Fastify({ logger: false });

await app.register(cors, {
  origin: true,
  credentials: true,
});

app.register(authRoutes, { prefix: '/auth' });
app.register(usersRoutes, { prefix: '/users' });
app.register(permissionsRoutes, { prefix: '/permissions' });
app.register(testRoutes, { prefix: '/test' });

app.get('/health', async () => ({ status: 'ok', service: 'users' }));

const PORT = parseInt(process.env.PORT_USERS || '3001');

app.listen({ port: PORT, host: '0.0.0.0' }, (err) => {
  if (err) {
    process.stderr.write(err.message + '\n');
    process.exit(1);
  }
  process.stdout.write(`Users service running on port ${PORT}\n`);
});
