import jwt from 'jsonwebtoken';
import pool from '../db.js';
import { reply, replyError } from '../response.js';

async function verifyToken(request, res) {
  const auth = request.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    res.code(401).send(replyError(401, 'SxGP401', 'Token requerido'));
    return;
  }
  try {
    request.jwtUser = jwt.verify(
      auth.split(' ')[1],
      process.env.JWT_SECRET || 'ana_secret'
    );
  } catch {
    res.code(401).send(replyError(401, 'SxGP401', 'Token inválido'));
  }
}

export default async function membersRoutes(fastify) {
  fastify.get('/grupo/:grupoId', { preHandler: verifyToken }, async (request) => {
    const { grupoId } = request.params;

    const { rows } = await pool.query(
      `SELECT u.id, u.nombre_completo, u.username, u.email, gm.fecha_unido
       FROM usuarios u
       INNER JOIN grupo_miembros gm ON gm.usuario_id = u.id
       WHERE gm.grupo_id = $1 ORDER BY u.nombre_completo`,
      [grupoId]
    );

    return reply(200, 'SxGP200', { miembros: rows });
  });

  fastify.post('/grupo/:grupoId/usuario/:usuarioId', { preHandler: verifyToken }, async (request, res) => {
    const { grupoId, usuarioId } = request.params;
    const permisos = request.jwtUser.permisos || [];

    if (!permisos.includes('groups:member-add')) {
      res.code(403);
      return replyError(403, 'SxGP403', 'Sin permiso para agregar miembros');
    }

    await pool.query(
      'INSERT INTO grupo_miembros (grupo_id, usuario_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [grupoId, usuarioId]
    );

    return reply(200, 'SxGP200', { message: 'Miembro agregado al grupo' });
  });

  fastify.delete('/grupo/:grupoId/usuario/:usuarioId', { preHandler: verifyToken }, async (request, res) => {
    const { grupoId, usuarioId } = request.params;
    const callerId = request.jwtUser.sub;
    const permisos = request.jwtUser.permisos || [];

    if (callerId !== usuarioId && !permisos.includes('groups:member-delete')) {
      res.code(403);
      return replyError(403, 'SxGP403', 'Sin permiso para eliminar miembros');
    }

    await pool.query(
      'DELETE FROM grupo_miembros WHERE grupo_id = $1 AND usuario_id = $2',
      [grupoId, usuarioId]
    );

    return reply(200, 'SxGP200', { message: 'Miembro eliminado del grupo' });
  });

  fastify.get('/grupo/:grupoId/usuario/:usuarioId/permisos', { preHandler: verifyToken }, async (request) => {
    const { grupoId, usuarioId } = request.params;

    const { rows } = await pool.query(
      `SELECT p.id, p.nombre, p.descripcion
       FROM permisos p
       INNER JOIN grupo_usuario_permisos gup ON gup.permiso_id = p.id
       WHERE gup.grupo_id = $1 AND gup.usuario_id = $2`,
      [grupoId, usuarioId]
    );

    return reply(200, 'SxGP200', { permisos: rows });
  });

  fastify.put('/grupo/:grupoId/usuario/:usuarioId/permisos', { preHandler: verifyToken }, async (request, res) => {
    const { grupoId, usuarioId } = request.params;
    const { permiso_ids } = request.body;
    const permisos = request.jwtUser.permisos || [];

    if (!permisos.includes('users:manage')) {
      res.code(403);
      return replyError(403, 'SxGP403', 'Sin permiso para gestionar permisos de grupo');
    }

    await pool.query(
      'DELETE FROM grupo_usuario_permisos WHERE grupo_id = $1 AND usuario_id = $2',
      [grupoId, usuarioId]
    );

    for (const permiso_id of (permiso_ids || [])) {
      await pool.query(
        'INSERT INTO grupo_usuario_permisos (grupo_id, usuario_id, permiso_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
        [grupoId, usuarioId, permiso_id]
      );
    }

    return reply(200, 'SxGP200', { message: 'Permisos de grupo actualizados' });
  });
}
