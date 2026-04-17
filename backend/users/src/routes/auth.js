import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../db.js';
import { reply, replyError } from '../response.js';

const SALT_ROUNDS = 10;

export default async function authRoutes(fastify) {
  fastify.post('/register', {
    schema: {
      body: {
        type: 'object',
        required: ['nombre_completo', 'username', 'email', 'password'],
        properties: {
          nombre_completo: { type: 'string', minLength: 2, maxLength: 255 },
          username: { type: 'string', minLength: 3, maxLength: 50 },
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 6 },
          direccion: { type: 'string' },
          telefono: { type: 'string' },
        },
      },
    },
    handler: async (request, res) => {
      const { nombre_completo, username, email, password, direccion, telefono } = request.body;

      const exists = await pool.query(
        'SELECT id FROM usuarios WHERE email = $1 OR username = $2',
        [email.toLowerCase(), username.toLowerCase()]
      );
      if (exists.rowCount > 0) {
        res.code(409);
        return replyError(409, 'SxUS409', 'El email o username ya existe');
      }

      const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

      const { rows } = await pool.query(
        `INSERT INTO usuarios (nombre_completo, username, email, password_hash, direccion, telefono, fecha_inicio)
         VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE)
         RETURNING id, nombre_completo, username, email, creado_en`,
        [nombre_completo, username.toLowerCase(), email.toLowerCase(), password_hash, direccion || null, telefono || null]
      );

      const user = rows[0];

      const defaultPerms = await pool.query(
        `SELECT id FROM permisos WHERE nombre IN ('tickets:add', 'tickets:comment')`,
      );

      if (defaultPerms.rowCount > 0) {
        const permIds = defaultPerms.rows.map((p) => p.id);
        await pool.query(
          `UPDATE usuarios SET permisos_globales = $1 WHERE id = $2`,
          [permIds, user.id]
        );
        user.permisos_globales = permIds;
      }

      res.code(201);
      return reply(201, 'SxUS201', { user });
    },
  });

  fastify.post('/login', {
    schema: {
      body: {
        type: 'object',
        required: ['password'],
        properties: {
          email: { type: 'string' },
          username: { type: 'string' },
          password: { type: 'string' },
        },
      },
    },
    handler: async (request, res) => {
      const { email, username, password } = request.body;

      if (!email && !username) {
        res.code(400);
        return replyError(400, 'SxUS400', 'Se requiere email o username');
      }

      const field = email ? 'email' : 'username';
      const value = email ? email.toLowerCase() : username.toLowerCase();

      const { rows } = await pool.query(
        `SELECT u.id, u.nombre_completo, u.username, u.email, u.password_hash, 
                u.permisos_globales, u.direccion, u.telefono, u.fecha_inicio
         FROM usuarios u WHERE u.${field} = $1`,
        [value]
      );

      if (rows.length === 0) {
        res.code(401);
        return replyError(401, 'SxUS401', 'Credenciales inválidas');
      }

      const user = rows[0];
      const valid = await bcrypt.compare(password, user.password_hash);

      if (!valid) {
        res.code(401);
        return replyError(401, 'SxUS401', 'Credenciales inválidas');
      }

      await pool.query(
        'UPDATE usuarios SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
        [user.id]
      );

      const permsData = await pool.query(
        `SELECT p.id, p.nombre FROM permisos p
         WHERE p.id = ANY($1::uuid[])`,
        [user.permisos_globales || []]
      );

      const token = jwt.sign(
        {
          sub: user.id,
          username: user.username,
          email: user.email,
          permisos: permsData.rows.map((p) => p.nombre),
        },
       process.env.JWT_SECRET || 'seguridad_jwt_secret_super_seguro' , 
        { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
      );

      const { password_hash, ...safeUser } = user;
      safeUser.permisos = permsData.rows;

      return reply(200, 'SxUS200', { token, user: safeUser });
    },
  });

  fastify.get('/me', {
    preHandler: async (request, res) => {
      const auth = request.headers.authorization;
      if (!auth || !auth.startsWith('Bearer ')) {
        res.code(401).send(replyError(401, 'SxUS401', 'Token requerido'));
        return;
      }
      try {
        request.jwtUser = jwt.verify(
          auth.split(' ')[1],
          process.env.JWT_SECRET || 'seguridad_jwt_secret_super_seguro'
        );
      } catch {
        res.code(401).send(replyError(401, 'SxUS401', 'Token inválido'));
      }
    },
    handler: async (request) => {
      const { rows } = await pool.query(
        `SELECT u.id, u.nombre_completo, u.username, u.email, u.permisos_globales,
                u.direccion, u.telefono, u.fecha_inicio, u.last_login, u.creado_en
         FROM usuarios u WHERE u.id = $1`,
        [request.jwtUser.sub]
      );

      if (rows.length === 0) return replyError(404, 'SxUS404', 'Usuario no encontrado');

      const user = rows[0];
      const permsData = await pool.query(
        `SELECT p.id, p.nombre FROM permisos p WHERE p.id = ANY($1::uuid[])`,
        [user.permisos_globales || []]
      );
      user.permisos = permsData.rows;

      return reply(200, 'SxUS200', { user });
    },
  });
}
