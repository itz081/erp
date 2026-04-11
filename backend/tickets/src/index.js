import Fastify from 'fastify';
import cors from '@fastify/cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import ticketsRoutes from './routes/tickets.js';
import comentariosRoutes from './routes/comentarios.js';
import historialRoutes from './routes/historial.js';
import catalogsRoutes from './routes/catalogs.js';
import testRoutes from './routes/test.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../../.env') });

const app = Fastify({ logger: false });

await app.register(cors, {
  origin: true,
  credentials: true,
});

app.register(ticketsRoutes, { prefix: '/tickets' });
app.register(comentariosRoutes, { prefix: '/comentarios' });
app.register(historialRoutes, { prefix: '/historial' });
app.register(catalogsRoutes, { prefix: '/catalogs' });
app.register(testRoutes, { prefix: '/test' });

app.get('/health', async () => ({ status: 'ok', service: 'tickets' }));

const PORT = parseInt(process.env.PORT_TICKETS || '3002');

app.listen({ port: PORT, host: '0.0.0.0' }, (err) => {
  if (err) {
    process.stderr.write(err.message + '\n');
    process.exit(1);
  }
  process.stdout.write(`Tickets service running on port ${PORT}\n`);
});
