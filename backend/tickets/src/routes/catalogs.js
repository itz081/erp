import pool from '../db.js';
import { reply } from '../response.js';

export default async function catalogsRoutes(fastify) {
  fastify.get('/estados', async () => {
    const { rows } = await pool.query(
      'SELECT id, nombre, color FROM estados ORDER BY nombre'
    );
    return reply(200, 'SxTK200', { estados: rows });
  });

  fastify.get('/prioridades', async () => {
    const { rows } = await pool.query(
      'SELECT id, nombre, orden FROM prioridades ORDER BY orden'
    );
    return reply(200, 'SxTK200', { prioridades: rows });
  });
}
