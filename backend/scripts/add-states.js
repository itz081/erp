import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

const pool = new pg.Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'ana',
  password: process.env.DB_PASSWORD || '1234',
  port: parseInt(process.env.DB_PORT || '5432'),
});

async function run() {
  try {
    // Verificar tabla estados
    const resCount = await pool.query("SELECT COUNT(*) FROM ticket_estados WHERE nombre ILIKE '%%Revision%%' OR nombre ILIKE '%%Revisión%%'");
    if (resCount.rows[0].count === '0') {
        await pool.query("INSERT INTO ticket_estados (nombre, descripcion, orden, color) VALUES ('Revisión', 'En proceso de verificación', 3, '#8b5cf6')");
        console.log("Estado 'Revisión' insertado correctamente.");
    } else {
        console.log("Estado 'Revisión' ya existía.");
    }
  } catch (err) {
    if (err.message.includes('relation "ticket_estados" does not exist')) {
        console.log("Tal vez la tabla se llama estados?");
        // intentemos tabla estados
        try {
            await pool.query("INSERT INTO estados (nombre, descripcion) VALUES ('Revisión', 'Verificación pendiente') ON CONFLICT (nombre) DO NOTHING");
            console.log("Se insertó en la tabla 'estados'");
        } catch(e) { console.error(e.message); }
    } else {
        console.error(err);
    }
  } finally {
    pool.end();
  }
}

run();
