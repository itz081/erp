import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../../.env') });

const app = Fastify({ logger: false });

const SERVICES = {
  users: `http://localhost:${process.env.PORT_USERS || 3001}`,
  tickets: `http://localhost:${process.env.PORT_TICKETS || 3002}`,
  groups: `http://localhost:${process.env.PORT_GROUPS || 3003}`,
};

const JWT_SECRET = process.env.JWT_SECRET || 'ana_secret';

await app.register(cors, {
  origin: (origin, cb) => cb(null, true),
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
});

await app.register(cookie, {
  secret: JWT_SECRET,
});

await app.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute',
  errorResponseBuilder: () => ({
    statusCode: 429,
    intOpCode: 'SxGW429',
    error: 'Demasiadas solicitudes. Intenta nuevamente en 1 minuto.',
  }),
});

function extractToken(request) {
  const authHeader = request.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.split(' ')[1];
  }
  if (request.cookies && request.cookies.token) {
    return request.cookies.token;
  }
  return null;
}

function verifyJwt(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

async function proxyRequest(targetUrl, request, reply) {
  const method = request.method;
  const headers = {
    'Content-Type': 'application/json',
  };

  const token = extractToken(request);
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const options = { method, headers };

  if (['POST', 'PUT', 'PATCH'].includes(method) && request.body) {
    options.body = JSON.stringify(request.body);
  }

  const response = await fetch(targetUrl, options);
  const data = await response.json();

  reply.code(response.status).send(data);
}

const PUBLIC_ROUTES = [
  { method: 'POST', path: '/api/auth/login' },
  { method: 'POST', path: '/api/auth/register' },
  { method: 'GET', path: '/health' },
  { method: 'GET', path: '/api/health' },
  { method: 'GET', path: '/api/gateway/status' },
  { method: 'GET', path: /^\/api\/tickets\/catalogs\// },
  { method: 'GET', path: /^\/api\/(user|tickets|groups)\/test\// },
];

function isPublicRoute(method, path) {
  if (method === 'OPTIONS') return true;
  return PUBLIC_ROUTES.some((r) => {
    const methodMatch = r.method === method || r.method === '*';
    const pathMatch = r.path instanceof RegExp ? r.path.test(path) : path.includes(r.path);
    return methodMatch && pathMatch;
  });
}

app.addHook('preHandler', async (request, reply) => {
  if (isPublicRoute(request.method, request.routerPath || request.url)) return;

  const token = extractToken(request);
  if (!token) {
    reply.code(401).send({
      statusCode: 401,
      intOpCode: 'SxGW401',
      error: 'Autenticación requerida',
    });
    return;
  }

  const payload = verifyJwt(token);
  if (!payload) {
    reply.code(401).send({
      statusCode: 401,
      intOpCode: 'SxGW401',
      error: 'Token inválido o expirado',
    });
    return;
  }

  request.jwtPayload = payload;
  request.headers['authorization'] = `Bearer ${token}`;
});

// ─── AUTH ROUTES ────────────────────────────────────────────────
app.post('/api/auth/register', async (request, reply) => {
  await proxyRequest(`${SERVICES.users}/auth/register`, request, reply);
});

app.post('/api/auth/login', async (request, reply) => {
  const targetUrl = `${SERVICES.users}/auth/login`;
  const response = await fetch(targetUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request.body),
  });

  const data = await response.json();

  if (response.ok && data?.data?.token) {
    reply.setCookie('token', data.data.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 8,
      path: '/',
    });
  }

  reply.code(response.status).send(data);
});

app.post('/api/auth/logout', async (request, reply) => {
  reply.clearCookie('token', { path: '/' });
  reply.send({ statusCode: 200, intOpCode: 'SxGW200', data: { message: 'Sesión cerrada' } });
});

app.get('/api/auth/me', async (request, reply) => {
  await proxyRequest(`${SERVICES.users}/auth/me`, request, reply);
});

// ─── USERS ROUTES ───────────────────────────────────────────────
app.get('/api/users', async (request, reply) => {
  await proxyRequest(`${SERVICES.users}/users`, request, reply);
});

app.get('/api/users/:id', async (request, reply) => {
  await proxyRequest(`${SERVICES.users}/users/${request.params.id}`, request, reply);
});

app.put('/api/users/:id', async (request, reply) => {
  await proxyRequest(`${SERVICES.users}/users/${request.params.id}`, request, reply);
});

app.put('/api/users/:id/permisos', async (request, reply) => {
  await proxyRequest(`${SERVICES.users}/users/${request.params.id}/permisos`, request, reply);
});

app.put('/api/users/:id/password', async (request, reply) => {
  await proxyRequest(`${SERVICES.users}/users/${request.params.id}/password`, request, reply);
});

app.delete('/api/users/:id', async (request, reply) => {
  await proxyRequest(`${SERVICES.users}/users/${request.params.id}`, request, reply);
});

// ─── PERMISSIONS ROUTES ─────────────────────────────────────────
app.get('/api/permissions', async (request, reply) => {
  await proxyRequest(`${SERVICES.users}/permissions`, request, reply);
});

app.get('/api/permissions/grupo/:grupoId/usuario/:usuarioId', async (request, reply) => {
  const { grupoId, usuarioId } = request.params;
  await proxyRequest(`${SERVICES.users}/permissions/grupo/${grupoId}/usuario/${usuarioId}`, request, reply);
});

app.post('/api/permissions/grupo/:grupoId/usuario/:usuarioId', async (request, reply) => {
  const { grupoId, usuarioId } = request.params;
  await proxyRequest(`${SERVICES.users}/permissions/grupo/${grupoId}/usuario/${usuarioId}`, request, reply);
});

// ─── TICKETS ROUTES ─────────────────────────────────────────────
app.get('/api/tickets', async (request, reply) => {
  const qs = new URLSearchParams(request.query).toString();
  await proxyRequest(`${SERVICES.tickets}/tickets${qs ? '?' + qs : ''}`, request, reply);
});

app.get('/api/tickets/catalogs/estados', async (request, reply) => {
  await proxyRequest(`${SERVICES.tickets}/catalogs/estados`, request, reply);
});

app.get('/api/tickets/catalogs/prioridades', async (request, reply) => {
  await proxyRequest(`${SERVICES.tickets}/catalogs/prioridades`, request, reply);
});

app.get('/api/tickets/:id', async (request, reply) => {
  await proxyRequest(`${SERVICES.tickets}/tickets/${request.params.id}`, request, reply);
});

app.post('/api/tickets', async (request, reply) => {
  await proxyRequest(`${SERVICES.tickets}/tickets`, request, reply);
});

app.put('/api/tickets/:id', async (request, reply) => {
  await proxyRequest(`${SERVICES.tickets}/tickets/${request.params.id}`, request, reply);
});

app.delete('/api/tickets/:id', async (request, reply) => {
  await proxyRequest(`${SERVICES.tickets}/tickets/${request.params.id}`, request, reply);
});

// ─── COMENTARIOS ROUTES ─────────────────────────────────────────
app.get('/api/comentarios/ticket/:ticketId', async (request, reply) => {
  await proxyRequest(`${SERVICES.tickets}/comentarios/ticket/${request.params.ticketId}`, request, reply);
});

app.post('/api/comentarios/ticket/:ticketId', async (request, reply) => {
  await proxyRequest(`${SERVICES.tickets}/comentarios/ticket/${request.params.ticketId}`, request, reply);
});

app.delete('/api/comentarios/:id', async (request, reply) => {
  await proxyRequest(`${SERVICES.tickets}/comentarios/${request.params.id}`, request, reply);
});

// ─── HISTORIAL ROUTES ───────────────────────────────────────────
app.get('/api/historial/ticket/:ticketId', async (request, reply) => {
  await proxyRequest(`${SERVICES.tickets}/historial/ticket/${request.params.ticketId}`, request, reply);
});

// ─── GROUPS ROUTES ──────────────────────────────────────────────
app.get('/api/groups', async (request, reply) => {
  const qs = new URLSearchParams(request.query).toString();
  await proxyRequest(`${SERVICES.groups}/groups${qs ? '?' + qs : ''}`, request, reply);
});

app.get('/api/groups/:id', async (request, reply) => {
  await proxyRequest(`${SERVICES.groups}/groups/${request.params.id}`, request, reply);
});

app.post('/api/groups', async (request, reply) => {
  await proxyRequest(`${SERVICES.groups}/groups`, request, reply);
});

app.put('/api/groups/:id', async (request, reply) => {
  await proxyRequest(`${SERVICES.groups}/groups/${request.params.id}`, request, reply);
});

app.delete('/api/groups/:id', async (request, reply) => {
  await proxyRequest(`${SERVICES.groups}/groups/${request.params.id}`, request, reply);
});

app.get('/api/groups/:id/stats', async (request, reply) => {
  await proxyRequest(`${SERVICES.groups}/groups/${request.params.id}/stats`, request, reply);
});

// ─── MEMBERS ROUTES ─────────────────────────────────────────────
app.get('/api/members/grupo/:grupoId', async (request, reply) => {
  await proxyRequest(`${SERVICES.groups}/members/grupo/${request.params.grupoId}`, request, reply);
});

app.post('/api/members/grupo/:grupoId/usuario/:usuarioId', async (request, reply) => {
  const { grupoId, usuarioId } = request.params;
  await proxyRequest(`${SERVICES.groups}/members/grupo/${grupoId}/usuario/${usuarioId}`, request, reply);
});

app.delete('/api/members/grupo/:grupoId/usuario/:usuarioId', async (request, reply) => {
  const { grupoId, usuarioId } = request.params;
  await proxyRequest(`${SERVICES.groups}/members/grupo/${grupoId}/usuario/${usuarioId}`, request, reply);
});

app.get('/api/members/grupo/:grupoId/usuario/:usuarioId/permisos', async (request, reply) => {
  const { grupoId, usuarioId } = request.params;
  await proxyRequest(`${SERVICES.groups}/members/grupo/${grupoId}/usuario/${usuarioId}/permisos`, request, reply);
});

app.put('/api/members/grupo/:grupoId/usuario/:usuarioId/permisos', async (request, reply) => {
  const { grupoId, usuarioId } = request.params;
  await proxyRequest(`${SERVICES.groups}/members/grupo/${grupoId}/usuario/${usuarioId}/permisos`, request, reply);
});

// ─── HEALTH & STATUS ────────────────────────────────────────────
app.get('/health', async () => ({
  statusCode: 200,
  intOpCode: 'SxGW200',
  data: { status: 'ok', service: 'apigateway', services: Object.keys(SERVICES) },
}));

app.get('/api/health', async () => ({
  statusCode: 200,
  intOpCode: 'TEST200',
  data: { status: 'ok', service: 'apigateway', timestamp: new Date().toISOString() },
}));

app.get('/api/gateway/status', async (request, reply) => {
  const checks = await Promise.all(
    Object.entries(SERVICES).map(async ([name, url]) => {
      const start = Date.now();
      try {
        const res = await fetch(`${url}/health`, { signal: AbortSignal.timeout(3000) });
        const latency = Date.now() - start;
        return { service: name, status: res.ok ? 'up' : 'degraded', latency_ms: latency, url };
      } catch {
        return { service: name, status: 'down', latency_ms: null, url };
      }
    })
  );

  const allUp = checks.every((c) => c.status === 'up');
  return {
    statusCode: 200,
    intOpCode: 'TEST200',
    data: {
      gateway: 'up',
      timestamp: new Date().toISOString(),
      overall: allUp ? 'healthy' : 'degraded',
      services: checks,
    },
  };
});

// ─── TEST PROXY ROUTES (sin JWT) ────────────────────────────────
app.get('/api/user/test/ping', async (request, reply) => {
  await proxyRequest(`${SERVICES.users}/test/ping`, request, reply);
});

app.get('/api/user/test/db', async (request, reply) => {
  await proxyRequest(`${SERVICES.users}/test/db`, request, reply);
});

app.get('/api/user/test/tables', async (request, reply) => {
  await proxyRequest(`${SERVICES.users}/test/tables`, request, reply);
});

app.get('/api/user/test/counts', async (request, reply) => {
  await proxyRequest(`${SERVICES.users}/test/counts`, request, reply);
});

app.get('/api/tickets/test/ping', async (request, reply) => {
  await proxyRequest(`${SERVICES.tickets}/test/ping`, request, reply);
});

app.get('/api/tickets/test/db', async (request, reply) => {
  await proxyRequest(`${SERVICES.tickets}/test/db`, request, reply);
});

app.get('/api/tickets/test/tables', async (request, reply) => {
  await proxyRequest(`${SERVICES.tickets}/test/tables`, request, reply);
});

app.get('/api/tickets/test/counts', async (request, reply) => {
  await proxyRequest(`${SERVICES.tickets}/test/counts`, request, reply);
});

app.get('/api/groups/test/ping', async (request, reply) => {
  await proxyRequest(`${SERVICES.groups}/test/ping`, request, reply);
});

app.get('/api/groups/test/db', async (request, reply) => {
  await proxyRequest(`${SERVICES.groups}/test/db`, request, reply);
});

app.get('/api/groups/test/tables', async (request, reply) => {
  await proxyRequest(`${SERVICES.groups}/test/tables`, request, reply);
});

app.get('/api/groups/test/counts', async (request, reply) => {
  await proxyRequest(`${SERVICES.groups}/test/counts`, request, reply);
});

const PORT = parseInt(process.env.PORT_GATEWAY || '3000');

app.listen({ port: PORT, host: '0.0.0.0' }, (err) => {
  if (err) {
    process.stderr.write(err.message + '\n');
    process.exit(1);
  }
  process.stdout.write(`API Gateway running on port ${PORT}\n`);
});
