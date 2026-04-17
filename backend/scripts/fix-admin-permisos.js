
import pool from '../users/src/db.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

const ADMIN_PERMISOS = [
  'tickets:add',
  'tickets:edit',
  'tickets:delete',
  'tickets:move',
  'tickets:comment',
  'groups:add',
  'groups:edit',
  'groups:delete',
  'groups:member-add',
  'groups:member-delete',
  'groups:manage',
  'users:manage',
];

async function fixAdminPermisos() {
  try {
    console.log('🔍 Buscando IDs de permisos...');
    const { rows: permRows } = await pool.query(
      'SELECT id, nombre FROM permisos WHERE nombre = ANY($1)',
      [ADMIN_PERMISOS]
    );

    console.log(`✅ Permisos encontrados: ${permRows.map(p => p.nombre).join(', ')}`);
    const permIds = permRows.map(p => p.id);

    const usersManageId = permRows.find(p => p.nombre === 'users:manage')?.id;
    if (!usersManageId) {
      console.error('❌ No se encontró el permiso users:manage en la BD. ¿Está inicializada la BD?');
      process.exit(1);
    }

    const { rows: admins } = await pool.query(
      `SELECT id, username, email FROM usuarios WHERE $1 = ANY(permisos_globales)`,
      [usersManageId]
    );

    if (admins.length === 0) {
      console.log('⚠️  No hay usuarios admin (con users:manage). Actualizando todos los que tengan groups:manage...');
      const groupsManageId = permRows.find(p => p.nombre === 'groups:manage')?.id;
      const { rows: admins2 } = await pool.query(
        `SELECT id, username, email FROM usuarios WHERE $1 = ANY(permisos_globales)`,
        [groupsManageId]
      );
      if (admins2.length === 0) {
        console.error('❌ No se encontró ningún admin. Agrega el admin manualmente.');
        process.exit(1);
      }
      for (const admin of admins2) {
        await pool.query('UPDATE usuarios SET permisos_globales = $1 WHERE id = $2', [permIds, admin.id]);
        console.log(`✅ Permisos actualizados para: ${admin.username} (${admin.email})`);
      }
    } else {
      for (const admin of admins) {
        await pool.query('UPDATE usuarios SET permisos_globales = $1 WHERE id = $2', [permIds, admin.id]);
        console.log(`✅ Permisos actualizados para: ${admin.username} (${admin.email})`);
      }
    }

    console.log('\n🎉 ¡Listo! Los permisos del admin han sido corregidos.');
    console.log('Vuelve a iniciar sesión para que el nuevo token incluya groups:add.');
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await pool.end();
  }
}

fixAdminPermisos();
