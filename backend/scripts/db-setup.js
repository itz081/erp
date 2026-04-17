
import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

const { Client } = pg;

const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'postgres',   
  password: process.env.DB_PASSWORD || '1234',
};

const SCHEMA_SQL = `
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS permisos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(100) NOT NULL UNIQUE,
    descripcion TEXT,
    creado_en TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS usuarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre_completo VARCHAR(255) NOT NULL,
    direccion TEXT,
    telefono VARCHAR(20),
    fecha_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
    last_login TIMESTAMPTZ,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    permisos_globales UUID[],
    creado_en TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS grupos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT,
    creador_id UUID REFERENCES usuarios(id),
    creado_en TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS estados (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(50) NOT NULL UNIQUE,
    color VARCHAR(7)
);

CREATE TABLE IF NOT EXISTS prioridades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(50) NOT NULL UNIQUE,
    orden INT
);

CREATE TABLE IF NOT EXISTS grupo_miembros (
    grupo_id UUID NOT NULL REFERENCES grupos(id) ON DELETE CASCADE,
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    fecha_unido TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (grupo_id, usuario_id)
);

CREATE TABLE IF NOT EXISTS grupo_usuario_permisos (
    grupo_id UUID NOT NULL REFERENCES grupos(id) ON DELETE CASCADE,
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    permiso_id UUID NOT NULL REFERENCES permisos(id) ON DELETE CASCADE,
    PRIMARY KEY (grupo_id, usuario_id, permiso_id)
);

CREATE TABLE IF NOT EXISTS tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    grupo_id UUID NOT NULL REFERENCES grupos(id),
    titulo VARCHAR(500) NOT NULL,
    descripcion TEXT,
    autor_id UUID NOT NULL REFERENCES usuarios(id),
    asignado_id UUID REFERENCES usuarios(id),
    estado_id UUID NOT NULL REFERENCES estados(id),
    prioridad_id UUID NOT NULL REFERENCES prioridades(id),
    creado_en TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    fecha_final TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS comentarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    autor_id UUID NOT NULL REFERENCES usuarios(id),
    contenido TEXT NOT NULL,
    creado_en TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS historial_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    usuario_id UUID REFERENCES usuarios(id),
    accion VARCHAR(100) NOT NULL,
    detalles JSONB,
    creado_en TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO permisos (nombre, descripcion) VALUES
  ('tickets:add', 'Crear nuevos tickets'),
  ('tickets:edit', 'Editar tickets existentes'),
  ('tickets:delete', 'Eliminar tickets'),
  ('tickets:comment', 'Comentar en tickets'),
  ('groups:add', 'Crear nuevos grupos'),
  ('groups:edit', 'Editar grupos'),
  ('groups:delete', 'Eliminar grupos'),
  ('groups:member-add', 'Añadir miembros a grupos'),
  ('groups:member-delete', 'Eliminar miembros de grupos'),
  ('users:manage', 'Administrar usuarios')
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO estados (nombre, color) VALUES
  ('PENDIENTE', '#F59E0B'),
  ('EN CURSO', '#3B82F6'),
  ('REVISION', '#8B5CF6'),
  ('TERMINADO', '#10B981')
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO prioridades (nombre, orden) VALUES
  ('ALTA', 1),
  ('MEDIA', 2),
  ('BAJA', 3)
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO usuarios (nombre_completo, username, email, password_hash)
-- El hash corresponde a "Admin123!"
SELECT 'Administrador', 'admin', 'admin@admin.com', '$2b$10$SuIWbTJoxjeDapRbxNdQOu5bcIfsJxJaENeAt9hDu0QazRYxwBhdi'
WHERE NOT EXISTS (SELECT 1 FROM usuarios WHERE email = 'admin@admin.com');

-- Forzar permisos completos al admin aunque ya exista
UPDATE usuarios SET 
    password_hash = '$2b$10$SuIWbTJoxjeDapRbxNdQOu5bcIfsJxJaENeAt9hDu0QazRYxwBhdi',
    permisos_globales = ARRAY(SELECT id FROM permisos) 
WHERE username = 'admin' OR email = 'admin@admin.com';

`;

async function run() {
  process.stdout.write('🔧 Configurando base de datos bd-seguridad...\n');

  const adminClient = new Client({ ...DB_CONFIG, database: 'postgres' });
  await adminClient.connect();

  const dbName = process.env.DB_NAME || 'bd-seguridad';

  const dbCheck = await adminClient.query(
    `SELECT 1 FROM pg_database WHERE datname = $1`, [dbName]
  );

  if (dbCheck.rowCount === 0) {
    await adminClient.query(`CREATE DATABASE "${dbName}"`);
    process.stdout.write(`✅ Base de datos ${dbName} creada\n`);
  } else {
    process.stdout.write(`ℹ️  Base de datos ${dbName} ya existe\n`);
  }

  await adminClient.end();

  const client = new Client({ ...DB_CONFIG, database: dbName });
  await client.connect();
  await client.query(SCHEMA_SQL);
  await client.end();

  process.stdout.write('✅ Tablas y datos iniciales configurados correctamente\n');
  process.stdout.write('\n📋 Tablas creadas:\n');
  process.stdout.write('   - permisos\n');
  process.stdout.write('   - usuarios\n');
  process.stdout.write('   - grupos\n');
  process.stdout.write('   - estados\n');
  process.stdout.write('   - prioridades\n');
  process.stdout.write('   - grupo_miembros\n');
  process.stdout.write('   - grupo_usuario_permisos\n');
  process.stdout.write('   - tickets\n');
  process.stdout.write('   - comentarios\n');
  process.stdout.write('   - historial_tickets\n');
  process.stdout.write('\n🎉 Backend listo para usar\n');
}

run().catch((err) => {
  process.stderr.write(`❌ Error: ${err.message}\n`);
  process.exit(1);
});
