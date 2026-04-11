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

export default async function groupsRoutes(fastify) {
  fastify.get('/', { preHandler: verifyToken }, async (request) => {
    const userId = request.jwtUser.sub;
    const permisos = request.jwtUser.permisos || [];
    const all = request.query.all === 'true' && permisos.includes('groups:manage');

    let queryText;
    let params;

    if (all) {
      queryText = `
        SELECT g.id, g.nombre, g.descripcion, g.creador_id, g.creado_en,
               u.nombre_completo AS creador_nombre,
               COUNT(DISTINCT gm.usuario_id) AS total_miembros
        FROM grupos g
        LEFT JOIN usuarios u ON u.id = g.creador_id
        LEFT JOIN grupo_miembros gm ON gm.grupo_id = g.id
        GROUP BY g.id, u.nombre_completo
        ORDER BY g.nombre`;
      params = [];
    } else {
      queryText = `
        SELECT g.id, g.nombre, g.descripcion, g.creador_id, g.creado_en,
               u.nombre_completo AS creador_nombre,
               COUNT(DISTINCT gm2.usuario_id) AS total_miembros
        FROM grupos g
        INNER JOIN grupo_miembros gm ON gm.grupo_id = g.id AND gm.usuario_id = $1
        LEFT JOIN usuarios u ON u.id = g.creador_id
        LEFT JOIN grupo_miembros gm2 ON gm2.grupo_id = g.id
        GROUP BY g.id, u.nombre_completo
        ORDER BY g.nombre`;
      params = [userId];
    }

    const { rows } = await pool.query(queryText, params);
    return reply(200, 'SxGP200', { grupos: rows });
  });

  fastify.get('/:id', { preHandler: verifyToken }, async (request, res) => {
    const { id } = request.params;

    const { rows } = await pool.query(
      `SELECT g.id, g.nombre, g.descripcion, g.creador_id, g.creado_en,
              u.nombre_completo AS creador_nombre
       FROM grupos g
       LEFT JOIN usuarios u ON u.id = g.creador_id
       WHERE g.id = $1`,
      [id]
    );

    if (rows.length === 0) {
      res.code(404);
      return replyError(404, 'SxGP404', 'Grupo no encontrado');
    }

    const group = rows[0];

    const miembros = await pool.query(
      `SELECT u.id, u.nombre_completo, u.username, u.email, gm.fecha_unido
       FROM usuarios u
       INNER JOIN grupo_miembros gm ON gm.usuario_id = u.id
       WHERE gm.grupo_id = $1 ORDER BY u.nombre_completo`,
      [id]
    );
    group.miembros = miembros.rows;

    return reply(200, 'SxGP200', { grupo: group });
  });

  fastify.post('/', { preHandler: verifyToken }, async (request, res) => {
    const { nombre, descripcion } = request.body;
    const creador_id = request.jwtUser.sub;
    const permisos = request.jwtUser.permisos || [];

    if (!permisos.includes('groups:manage')) {
      res.code(403);
      return replyError(403, 'SxGP403', 'Sin permiso para crear grupos');
    }

    if (!nombre || nombre.trim().length === 0) {
      res.code(400);
      return replyError(400, 'SxGP400', 'El nombre del grupo es requerido');
    }

    const { rows } = await pool.query(
      `INSERT INTO grupos (nombre, descripcion, creador_id) VALUES ($1, $2, $3) RETURNING *`,
      [nombre.trim(), descripcion || null, creador_id]
    );

    const grupo = rows[0];

    await pool.query(
      'INSERT INTO grupo_miembros (grupo_id, usuario_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [grupo.id, creador_id]
    );

    res.code(201);
    return reply(201, 'SxGP201', { grupo });
  });

  fastify.put('/:id', { preHandler: verifyToken }, async (request, res) => {
    const { id } = request.params;
    const { nombre, descripcion } = request.body;
    const permisos = request.jwtUser.permisos || [];

    if (!permisos.includes('groups:manage')) {
      res.code(403);
      return replyError(403, 'SxGP403', 'Sin permiso para editar grupos');
    }

    const { rows } = await pool.query(
      `UPDATE grupos SET
         nombre = COALESCE($1, nombre),
         descripcion = COALESCE($2, descripcion)
       WHERE id = $3 RETURNING *`,
      [nombre || null, descripcion || null, id]
    );

    if (rows.length === 0) {
      res.code(404);
      return replyError(404, 'SxGP404', 'Grupo no encontrado');
    }

    return reply(200, 'SxGP200', { grupo: rows[0] });
  });

  fastify.delete('/:id', { preHandler: verifyToken }, async (request, res) => {
    const { id } = request.params;
    const permisos = request.jwtUser.permisos || [];

    if (!permisos.includes('groups:manage')) {
      res.code(403);
      return replyError(403, 'SxGP403', 'Sin permiso para eliminar grupos');
    }

    const { rowCount } = await pool.query('DELETE FROM grupos WHERE id = $1', [id]);
    if (rowCount === 0) {
      res.code(404);
      return replyError(404, 'SxGP404', 'Grupo no encontrado');
    }

    return reply(200, 'SxGP200', { message: 'Grupo eliminado' });
  });

  fastify.get('/:id/stats', { preHandler: verifyToken }, async (request, res) => {
    const { id } = request.params;

    const tickets = await pool.query(
      `SELECT e.nombre AS estado, e.color, COUNT(t.id) AS total
       FROM tickets t
       LEFT JOIN estados e ON e.id = t.estado_id
       WHERE t.grupo_id = $1
       GROUP BY e.nombre, e.color`,
      [id]
    );

    const prioridades = await pool.query(
      `SELECT p.nombre AS prioridad, COUNT(t.id) AS total
       FROM tickets t
       LEFT JOIN prioridades p ON p.id = t.prioridad_id
       WHERE t.grupo_id = $1
       GROUP BY p.nombre, p.orden ORDER BY p.orden`,
      [id]
    );

    return reply(200, 'SxGP200', {
      stats: {
        por_estado: tickets.rows,
        por_prioridad: prioridades.rows,
      },
    });
  });
}
