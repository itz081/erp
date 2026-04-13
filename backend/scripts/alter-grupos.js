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
    await pool.query("ALTER TABLE grupos ADD COLUMN IF NOT EXISTS categoria VARCHAR(100)");
    await pool.query("ALTER TABLE grupos ADD COLUMN IF NOT EXISTS nivel VARCHAR(100)");
    await pool.query("ALTER TABLE grupos ADD COLUMN IF NOT EXISTS autor VARCHAR(255)");
    console.log("Columnos categoria, nivel, autor añadidos a la tabla grupos.");
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}

run();
