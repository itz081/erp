import pool from '../users/src/db.js';

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

async function forceAdmin() {
  try {
    const { rows: permRows } = await pool.query(
      'SELECT id FROM permisos WHERE nombre = ANY($1)',
      [ADMIN_PERMISOS]
    );

    const permIds = permRows.map(p => p.id);

    const targetUserId = 'e16e44f5-3789-4cd6-898c-342046c37055';
    
    await pool.query('UPDATE usuarios SET permisos_globales = $1 WHERE id = $2', [permIds, targetUserId]);
    
    console.log(`✅ Permisos de administrador restaurados para el usuario con ID: ${targetUserId}`);
    console.log('Por favor, cierra sesión y vuelve a iniciar sesión en la app para generar un nuevo token.');
    
  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    await pool.end();
  }
}

forceAdmin();
