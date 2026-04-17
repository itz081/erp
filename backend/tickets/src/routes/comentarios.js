import jwt from 'jsonwebtoken';
import pool from '../db.js';
import { reply, replyError } from '../response.js';

async function verifyToken(request, res) {
  const auth = request.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    res.code(401).send(replyError(401, 'SxTK401', 'Token requerido'));
    return;
  }
  try {
    request.jwtUser = jwt.verify(
      auth.split(' ')[1],
      process.env.JWT_SECRET || 'seguridad_jwt_secret_super_seguro'
    );
  } catch {
    res.code(401).send(replyError(401, 'SxTK401', 'Token inválido'));
  }
}

export default async function comentariosRoutes(fastify) {
  fastify.get('/ticket/:ticketId', { preHandler: verifyToken }, async (request) => {
    const { ticketId } = request.params;
    const { rows } = await pool.query(
      `SELECT c.id, c.contenido, c.creado_en, u.nombre_completo AS autor_nombre, u.username AS autor_username
       FROM comentarios c
       LEFT JOIN usuarios u ON u.id = c.autor_id
       WHERE c.ticket_id = $1 ORDER BY c.creado_en ASC`,
      [ticketId]
    );
    return reply(200, 'SxTK200', { comentarios: rows });
  });

  fastify.post('/ticket/:ticketId', { preHandler: verifyToken }, async (request, res) => {
    const { ticketId } = request.params;
    const { contenido } = request.body;
    const autor_id = request.jwtUser.sub;
    const permisos = request.jwtUser.permisos || [];

    if (!permisos.includes('tickets:comment')) {
      res.code(403);
      return replyError(403, 'SxTK403', 'Sin permiso para comentar');
    }

    if (!contenido || contenido.trim().length === 0) {
      res.code(400);
      return replyError(400, 'SxTK400', 'El comentario no puede estar vacío');
    }

    const { rows } = await pool.query(
      `INSERT INTO comentarios (ticket_id, autor_id, contenido) VALUES ($1, $2, $3) RETURNING *`,
      [ticketId, autor_id, contenido.trim()]
    );

    await pool.query(
      `INSERT INTO historial_tickets (ticket_id, usuario_id, accion, detalles) VALUES ($1, $2, $3, $4)`,
      [ticketId, autor_id, 'Comentario añadido', JSON.stringify({ preview: contenido.substring(0, 100) })]
    );

    res.code(201);
    return reply(201, 'SxTK201', { comentario: rows[0] });
  });

  fastify.delete('/:id', { preHandler: verifyToken }, async (request, res) => {
    const { id } = request.params;
    const userId = request.jwtUser.sub;
    const permisos = request.jwtUser.permisos || [];

    const existing = await pool.query(
      'SELECT autor_id, ticket_id FROM comentarios WHERE id = $1',
      [id]
    );

    if (existing.rowCount === 0) {
      res.code(404);
      return replyError(404, 'SxTK404', 'Comentario no encontrado');
    }

    const com = existing.rows[0];
    if (com.autor_id !== userId && !permisos.includes('tickets:delete')) {
      res.code(403);
      return replyError(403, 'SxTK403', 'Sin permiso para eliminar este comentario');
    }

    await pool.query('DELETE FROM comentarios WHERE id = $1', [id]);
    return reply(200, 'SxTK200', { message: 'Comentario eliminado' });
  });
}
