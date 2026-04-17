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

export default async function historialRoutes(fastify) {
  fastify.get('/ticket/:ticketId', { preHandler: verifyToken }, async (request) => {
    const { ticketId } = request.params;
    const { rows } = await pool.query(
      `SELECT h.id, h.accion, h.detalles, h.creado_en, u.nombre_completo AS usuario_nombre
       FROM historial_tickets h
       LEFT JOIN usuarios u ON u.id = h.usuario_id
       WHERE h.ticket_id = $1 ORDER BY h.creado_en ASC`,
      [ticketId]
    );
    return reply(200, 'SxTK200', { historial: rows });
  });
}
