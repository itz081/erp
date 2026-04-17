
import pg from 'pg';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

const { Client } = pg;

async function check() {
  const config = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: 'bd_seguridad', 
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'ItRodriguez08@',
  };

  process.stdout.write('\n🔍 Verificando conexión a PostgreSQL...\n');
  process.stdout.write(`   Host:     ${config.host}:${config.port}\n`);
  process.stdout.write(`   Usuario:  ${config.user}\n`);
  process.stdout.write(`   Password: ${'*'.repeat((config.password || '').length)}\n\n`);

  const client = new Client(config);
  try {
    await client.connect();
    const res = await client.query('SELECT version()');
    process.stdout.write(`✅ Conexión exitosa!\n`);
    process.stdout.write(`   ${res.rows[0].version}\n\n`);
    await client.end();
    process.stdout.write('💡 Ahora puedes ejecutar: node scripts/db-setup.js\n\n');
  } catch (err) {
    process.stdout.write(`❌ No se puede conectar: ${err.message}\n\n`);
    process.stdout.write('💡 Soluciones:\n');
    process.stdout.write('   1. Verifica que PostgreSQL esté corriendo\n');
    process.stdout.write('   2. Edita backend/.env con las credenciales correctas:\n');
    process.stdout.write('      DB_USER=tu_usuario\n');
    process.stdout.write('      DB_PASSWORD=tu_contraseña\n');
    process.stdout.write('   3. Verifica el puerto (por defecto 5432)\n\n');
    process.stdout.write('   En pgAdmin puedes ver las credenciales en:\n');
    process.stdout.write('   Servers > Properties > Connection\n\n');
    process.exit(1);
  }
}

check();
