import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

const { Client } = pg;

const client = new Client({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '1234',
  database: process.env.DB_NAME || 'ana'
});

async function cleanup() {
  await client.connect();
  console.log('🧹 Limpiando catálogos duplicados...');

  // 1. Estados
  // Queremos quedarnos solo con PENDIENTE, EN CURSO, TERMINADO
  // Primero, si hay tickets apuntando a los viejos, intentemos moverlos a los nuevos si es posible, 
  // o simplemente eliminamos los que no se usen.

  await client.query(`
    -- Eliminar estados que no sean los deseados (si no tienen tickets asociados)
    DELETE FROM estados 
    WHERE nombre NOT IN ('PENDIENTE', 'EN CURSO', 'TERMINADO')
    AND id NOT IN (SELECT estado_id FROM tickets)
  `);

  // 2. Prioridades
  await client.query(`
    DELETE FROM prioridades 
    WHERE nombre NOT IN ('BAJA', 'MEDIA', 'ALTA')
    AND id NOT IN (SELECT prioridad_id FROM tickets)
  `);

  console.log('✅ Catálogos limpiados. Solo se conservan los oficiales.');
  await client.end();
}

cleanup().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
