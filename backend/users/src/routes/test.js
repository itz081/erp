import pool from '../db.js';
import { reply, replyError } from '../response.js';

export default async function testRoutes(fastify) {
  fastify.get('/ping', async () => {
    return {
      statusCode: 200,
      intOpCode: 'TEST200',
      data: {
        service: 'users',
        message: 'pong',
        timestamp: new Date().toISOString(),
      },
    };
  });

  fastify.get('/db', async (request, res) => {
    try {
      const result = await pool.query('SELECT NOW() AS server_time, current_database() AS db_name');
      return {
        statusCode: 200,
        intOpCode: 'TEST200',
        data: {
          service: 'users',
          db_connected: true,
          server_time: result.rows[0].server_time,
          db_name: result.rows[0].db_name,
        },
      };
    } catch (err) {
      res.code(503);
      return {
        statusCode: 503,
        intOpCode: 'TEST503',
        error: `DB no disponible: ${err.message}`,
      };
    }
  });

  fastify.get('/tables', async (request, res) => {
    try {
      const result = await pool.query(
        `SELECT table_name,
                (SELECT COUNT(*) FROM information_schema.columns c
                 WHERE c.table_name = t.table_name
                   AND c.table_schema = 'public') AS column_count
         FROM information_schema.tables t
         WHERE table_schema = 'public'
           AND table_type = 'BASE TABLE'
         ORDER BY table_name`
      );
      return {
        statusCode: 200,
        intOpCode: 'TEST200',
        data: {
          service: 'users',
          total_tables: result.rowCount,
          tables: result.rows,
        },
      };
    } catch (err) {
      res.code(503);
      return {
        statusCode: 503,
        intOpCode: 'TEST503',
        error: `Error consultando tablas: ${err.message}`,
      };
    }
  });

  fastify.get('/counts', async (request, res) => {
    try {
      const users = await pool.query('SELECT COUNT(*) AS total FROM usuarios');
      const permisos = await pool.query('SELECT COUNT(*) AS total FROM permisos');
      return {
        statusCode: 200,
        intOpCode: 'TEST200',
        data: {
          service: 'users',
          counts: {
            usuarios: parseInt(users.rows[0].total),
            permisos: parseInt(permisos.rows[0].total),
          },
        },
      };
    } catch (err) {
      res.code(503);
      return {
        statusCode: 503,
        intOpCode: 'TEST503',
        error: `Error de consulta: ${err.message}`,
      };
    }
  });
}
