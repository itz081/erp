import jwt from 'jsonwebtoken';
import pool from '../db.js';
import { reply, replyError } from '../response.js';

async function verifyToken(request, res) {
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
}

export default async function permissionsRoutes(fastify) {
  fastify.get('/', { preHandler: verifyToken }, async () => {
    const { rows } = await pool.query(
      'SELECT id, nombre, descripcion FROM permisos ORDER BY nombre'
    );
    return reply(200, 'SxUS200', { permisos: rows });
  });

  fastify.get('/grupo/:grupoId/usuario/:usuarioId', { preHandler: verifyToken }, async (request) => {
    const { grupoId, usuarioId } = request.params;
    const { rows } = await pool.query(
      `SELECT p.id, p.nombre FROM permisos p
       INNER JOIN grupo_usuario_permisos gup ON gup.permiso_id = p.id
       WHERE gup.grupo_id = $1 AND gup.usuario_id = $2`,
      [grupoId, usuarioId]
    );
    return reply(200, 'SxUS200', { permisos: rows });
  });

  fastify.post('/grupo/:grupoId/usuario/:usuarioId', { preHandler: verifyToken }, async (request, res) => {
    const { grupoId, usuarioId } = request.params;
    const { permiso_ids } = request.body;

    const callerPerms = request.jwtUser.permisos || [];
    if (!callerPerms.includes('groups:manage')) {
      res.code(403);
      return replyError(403, 'SxUS403', 'Sin permiso para gestionar permisos de grupo');
    }

    await pool.query(
      'DELETE FROM grupo_usuario_permisos WHERE grupo_id = $1 AND usuario_id = $2',
      [grupoId, usuarioId]
    );

    for (const permiso_id of permiso_ids) {
      await pool.query(
        'INSERT INTO grupo_usuario_permisos (grupo_id, usuario_id, permiso_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
        [grupoId, usuarioId, permiso_id]
      );
    }

    return reply(200, 'SxUS200', { message: 'Permisos de grupo actualizados' });
  });
}
